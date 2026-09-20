create function public.create_internal_appointment(
  target_barbershop_id uuid,
  selected_service_id uuid,
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
  selected_service public.services;
  utc_starts_at timestamptz;
  new_appointment_id uuid;
begin
  if not (select private.is_barbershop_member(target_barbershop_id)) then
    raise exception 'not authorized';
  end if;

  select timezone into shop_timezone
  from public.barbershops
  where id = target_barbershop_id and active;

  select s.* into selected_service
  from public.services s
  join public.barber_services bs
    on bs.service_id = s.id
    and bs.barber_id = selected_barber_id
    and bs.barbershop_id = target_barbershop_id
  where s.id = selected_service_id
    and s.barbershop_id = target_barbershop_id
    and s.active;

  if shop_timezone is null or selected_service.id is null then
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
    utc_starts_at + make_interval(mins => selected_service.duration_minutes),
    'pending',
    'internal',
    nullif(trim(appointment_notes), ''),
    (select auth.uid())
  ) returning id into new_appointment_id;

  insert into public.appointment_services (
    barbershop_id, appointment_id, service_id,
    service_name, duration_minutes, price_cents
  ) values (
    target_barbershop_id,
    new_appointment_id,
    selected_service.id,
    selected_service.name,
    selected_service.duration_minutes,
    selected_service.price_cents
  );

  return new_appointment_id;
end;
$$;

revoke all on function public.create_internal_appointment(uuid, uuid, uuid, uuid, timestamp, text) from public, anon;
grant execute on function public.create_internal_appointment(uuid, uuid, uuid, uuid, timestamp, text) to authenticated;
