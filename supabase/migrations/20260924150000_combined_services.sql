-- Combined services: one booking can contain several catalog services.
-- The appointment range is based on the sum of the selected durations and
-- the exclusion constraints on appointments remain the final race guard.

drop function if exists public.create_internal_appointment(uuid, uuid[], uuid, uuid, timestamp, text);
create function public.create_internal_appointment(
  target_barbershop_id uuid,
  selected_service_ids uuid[],
  selected_barber_id uuid,
  selected_client_id uuid,
  local_starts_at timestamp,
  appointment_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  shop_timezone text;
  selected_count integer;
  total_duration integer;
  utc_starts_at timestamptz;
  new_appointment_id uuid;
begin
  if not (select private.is_barbershop_member(target_barbershop_id)) then
    raise exception 'not authorized';
  end if;

  if coalesce(array_length(selected_service_ids, 1), 0) not between 1 and 8 then
    raise exception 'at least one and at most eight services are required';
  end if;

  select timezone into shop_timezone
  from public.barbershops
  where id = target_barbershop_id and active;

  select count(*)::integer, coalesce(sum(s.duration_minutes), 0)::integer
    into selected_count, total_duration
  from public.services s
  join public.barber_services bs
    on bs.service_id = s.id
   and bs.barber_id = selected_barber_id
   and bs.barbershop_id = target_barbershop_id
  where s.id = any(selected_service_ids)
    and s.barbershop_id = target_barbershop_id
    and s.active;

  if shop_timezone is null or selected_count <> array_length(selected_service_ids, 1) then
    raise exception 'service, barber, or barbershop unavailable';
  end if;

  if not exists (
    select 1 from public.clients c
    where c.id = selected_client_id
      and c.barbershop_id = target_barbershop_id
      and c.active
  ) then
    raise exception 'client unavailable';
  end if;

  utc_starts_at := local_starts_at at time zone shop_timezone;

  insert into public.appointments (
    barbershop_id, barber_id, client_id, starts_at, ends_at,
    status, source, notes, created_by
  ) values (
    target_barbershop_id,
    selected_barber_id,
    selected_client_id,
    utc_starts_at,
    utc_starts_at + make_interval(mins => total_duration),
    'pending',
    'internal',
    nullif(trim(appointment_notes), ''),
    (select auth.uid())
  ) returning id into new_appointment_id;

  insert into public.appointment_services (
    barbershop_id, appointment_id, service_id,
    service_name, duration_minutes, price_cents
  )
  select target_barbershop_id, new_appointment_id, s.id,
    s.name, s.duration_minutes, s.price_cents
  from public.services s
  where s.id = any(selected_service_ids)
    and s.barbershop_id = target_barbershop_id
  order by array_position(selected_service_ids, s.id);

  return new_appointment_id;
end;
$$;

revoke all on function public.create_internal_appointment(uuid, uuid[], uuid, uuid, timestamp, text) from public, anon;
grant execute on function public.create_internal_appointment(uuid, uuid[], uuid, uuid, timestamp, text) to authenticated;

drop function if exists public.create_public_booking(text, uuid[], uuid, timestamptz, text, text, text, uuid);
create function public.create_public_booking(
  target_slug text,
  selected_service_ids uuid[],
  selected_barber_id uuid,
  requested_start timestamptz,
  client_name text,
  client_email text,
  client_phone text,
  request_id uuid
)
returns table (appointment_id uuid, response_token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop public.barbershops;
  target_client_id uuid;
  target_appointment_id uuid;
  existing_appointment_id uuid;
  selected_count integer;
  total_duration integer;
  service_names text[];
  normalized_email text := lower(nullif(trim(client_email), ''));
  normalized_phone text := nullif(regexp_replace(coalesce(client_phone, ''), '\D', '', 'g'), '');
  raw_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  select * into shop
  from public.barbershops b
  where b.slug = target_slug and b.active and b.public_booking_enabled;

  if shop.id is null then
    raise exception 'barbershop unavailable';
  end if;

  select a.id into existing_appointment_id
  from public.appointments a
  where a.barbershop_id = shop.id and a.booking_request_id = request_id;
  if existing_appointment_id is not null then
    return query select existing_appointment_id, null::text;
    return;
  end if;

  if requested_start < now() + make_interval(mins => shop.minimum_notice_minutes)
     or requested_start > now() + make_interval(days => shop.max_advance_days) then
    raise exception 'requested time outside booking window';
  end if;

  select count(*)::integer, coalesce(sum(s.duration_minutes), 0)::integer,
    array_agg(s.name order by array_position(selected_service_ids, s.id))
    into selected_count, total_duration, service_names
  from public.services s
  join public.barber_services bs
    on bs.service_id = s.id
   and bs.barber_id = selected_barber_id
   and bs.barbershop_id = shop.id
  join public.barbers b
    on b.id = selected_barber_id
   and b.barbershop_id = shop.id
   and b.active
  where s.id = any(selected_service_ids)
    and s.barbershop_id = shop.id
    and s.active;

  if coalesce(array_length(selected_service_ids, 1), 0) not between 1 and 8
     or selected_count <> array_length(selected_service_ids, 1) then
    raise exception 'service or barber unavailable';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    shop.id::text || ':' || coalesce(normalized_email, normalized_phone, request_id::text), 0
  ));

  select c.id into target_client_id
  from public.clients c
  where c.barbershop_id = shop.id
    and ((normalized_email is not null and lower(c.email) = normalized_email)
      or (normalized_phone is not null and regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') = normalized_phone))
  order by c.created_at
  limit 1;

  if target_client_id is null then
    insert into public.clients (barbershop_id, name, email, phone)
    values (shop.id, trim(client_name), normalized_email, nullif(trim(client_phone), ''))
    returning id into target_client_id;
  else
    update public.clients
    set name = trim(client_name), email = coalesce(normalized_email, email), phone = coalesce(nullif(trim(client_phone), ''), phone)
    where id = target_client_id;
  end if;

  insert into public.appointments (
    barbershop_id, barber_id, client_id, starts_at, ends_at, status, source, booking_request_id
  ) values (
    shop.id, selected_barber_id, target_client_id, requested_start,
    requested_start + make_interval(mins => total_duration), 'pending', 'public_booking', request_id
  ) returning id into target_appointment_id;

  insert into public.appointment_services (
    barbershop_id, appointment_id, service_id, service_name, duration_minutes, price_cents
  )
  select shop.id, target_appointment_id, s.id, s.name, s.duration_minutes, s.price_cents
  from public.services s
  where s.id = any(selected_service_ids) and s.barbershop_id = shop.id
  order by array_position(selected_service_ids, s.id);

  insert into public.booking_tokens (barbershop_id, appointment_id, token_hash, expires_at)
  values (shop.id, target_appointment_id, extensions.digest(raw_token, 'sha256'), requested_start + interval '12 hours');

  insert into public.notifications (barbershop_id, type, title, body, entity_type, entity_id, action_url)
  values (shop.id, 'appointment_created', 'Novo agendamento', trim(client_name) || ' reservou ' || array_to_string(service_names, ' + '), 'appointment', target_appointment_id, '/agenda?appointment=' || target_appointment_id::text);

  return query select target_appointment_id, raw_token;
end;
$$;

revoke all on function public.create_public_booking(text, uuid[], uuid, timestamptz, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.create_public_booking(text, uuid[], uuid, timestamptz, text, text, text, uuid) to service_role;

drop function if exists public.get_public_availability(text, uuid[], uuid, date);
create function public.get_public_availability(
  target_slug text,
  selected_service_ids uuid[],
  selected_barber_id uuid,
  requested_date date
)
returns table (starts_at timestamptz)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  shop public.barbershops;
  selected_count integer;
  total_duration integer;
begin
  select * into shop from public.barbershops s
  where s.slug = target_slug and s.active and s.public_booking_enabled and not s.booking_paused;

  select count(*)::integer, coalesce(sum(s.duration_minutes), 0)::integer
    into selected_count, total_duration
  from public.services s
  join public.barber_services bs on bs.service_id = s.id and bs.barbershop_id = s.barbershop_id and bs.barber_id = selected_barber_id
  where s.barbershop_id = shop.id and s.id = any(selected_service_ids) and s.active;

  if shop.id is null or coalesce(array_length(selected_service_ids, 1), 0) not between 1 and 8
     or selected_count <> array_length(selected_service_ids, 1) then return; end if;

  return query
  select distinct slot.starts_at
  from public.working_hours w
  join public.shop_hours h on h.barbershop_id = w.barbershop_id and h.weekday = w.weekday and h.active
  cross join lateral generate_series(
    (requested_date + greatest(w.starts_at, h.starts_at)) at time zone shop.timezone,
    ((requested_date + least(w.ends_at, h.ends_at)) at time zone shop.timezone) - make_interval(mins => total_duration),
    make_interval(mins => shop.booking_interval_minutes)
  ) slot(starts_at)
  where w.barbershop_id = shop.id and w.barber_id = selected_barber_id and w.active
    and w.weekday = extract(dow from requested_date)::smallint
    and slot.starts_at >= now() + make_interval(mins => shop.minimum_notice_minutes)
    and requested_date <= (now() at time zone shop.timezone)::date + shop.max_advance_days
    and private.slot_within_schedule(shop.id, selected_barber_id, slot.starts_at, slot.starts_at + make_interval(mins => total_duration))
    and not exists (
      select 1 from public.appointments a
      where a.barbershop_id = shop.id and a.barber_id = selected_barber_id
        and a.status in ('pending', 'confirmed', 'in_progress')
        and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(slot.starts_at, slot.starts_at + make_interval(mins => total_duration), '[)')
    )
  order by slot.starts_at;
end;
$$;

revoke all on function public.get_public_availability(text, uuid[], uuid, date) from public, anon, authenticated;
grant execute on function public.get_public_availability(text, uuid[], uuid, date) to service_role;
