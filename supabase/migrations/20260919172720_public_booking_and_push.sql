alter table public.barbershops
  add column public_booking_enabled boolean not null default true,
  add column booking_interval_minutes integer not null default 15
    check (booking_interval_minutes in (5, 10, 15, 20, 30, 60)),
  add column minimum_notice_minutes integer not null default 120
    check (minimum_notice_minutes between 0 and 43200),
  add column max_advance_days integer not null default 60
    check (max_advance_days between 1 and 365),
  add column booking_message text;

create table public.booking_tokens (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  appointment_id uuid not null,
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (appointment_id, barbershop_id)
    references public.appointments(id, barbershop_id) on delete cascade
);

create table public.public_booking_attempts (
  id bigint generated always as identity primary key,
  barbershop_id uuid references public.barbershops(id) on delete cascade,
  ip_hash bytea,
  outcome text not null check (outcome in ('accepted', 'rejected', 'rate_limited')),
  created_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_secret text not null,
  user_agent text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index booking_tokens_hash_idx on public.booking_tokens(token_hash) where used_at is null;
create index booking_attempts_recent_idx on public.public_booking_attempts(barbershop_id, created_at desc);
create index push_subscriptions_user_idx on public.push_subscriptions(user_id, active);

create trigger push_subscriptions_touch_updated_at
before update on public.push_subscriptions
for each row execute function private.touch_updated_at();

create function public.create_public_booking(
  target_slug text,
  selected_service_id uuid,
  selected_barber_id uuid,
  requested_start timestamptz,
  client_name text,
  client_email text,
  client_phone text default null
)
returns table (appointment_id uuid, response_token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop public.barbershops;
  selected_service public.services;
  target_client_id uuid;
  target_appointment_id uuid;
  raw_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  select * into shop
  from public.barbershops b
  where b.slug = target_slug and b.active and b.public_booking_enabled;

  if shop.id is null then
    raise exception 'barbershop unavailable';
  end if;

  if requested_start < now() + make_interval(mins => shop.minimum_notice_minutes)
     or requested_start > now() + make_interval(days => shop.max_advance_days) then
    raise exception 'requested time outside booking window';
  end if;

  select s.* into selected_service
  from public.services s
  join public.barber_services bs
    on bs.service_id = s.id and bs.barber_id = selected_barber_id
  join public.barbers b
    on b.id = selected_barber_id and b.barbershop_id = shop.id and b.active
  where s.id = selected_service_id
    and s.barbershop_id = shop.id
    and s.active;

  if selected_service.id is null then
    raise exception 'service or barber unavailable';
  end if;

  select c.id into target_client_id
  from public.clients c
  where c.barbershop_id = shop.id
    and (
      (nullif(trim(client_email), '') is not null and lower(c.email) = lower(trim(client_email)))
      or (nullif(trim(client_phone), '') is not null and c.phone = trim(client_phone))
    )
  order by c.created_at
  limit 1;

  if target_client_id is null then
    insert into public.clients (barbershop_id, name, email, phone)
    values (shop.id, trim(client_name), lower(trim(client_email)), nullif(trim(client_phone), ''))
    returning id into target_client_id;
  else
    update public.clients
    set name = trim(client_name),
        email = lower(trim(client_email)),
        phone = coalesce(nullif(trim(client_phone), ''), phone)
    where id = target_client_id;
  end if;

  insert into public.appointments (
    barbershop_id, barber_id, client_id, starts_at, ends_at, status, source
  ) values (
    shop.id,
    selected_barber_id,
    target_client_id,
    requested_start,
    requested_start + make_interval(mins => selected_service.duration_minutes),
    'pending',
    'public_booking'
  ) returning id into target_appointment_id;

  insert into public.appointment_services (
    barbershop_id, appointment_id, service_id, service_name, duration_minutes, price_cents
  ) values (
    shop.id, target_appointment_id, selected_service.id, selected_service.name,
    selected_service.duration_minutes, selected_service.price_cents
  );

  insert into public.booking_tokens (barbershop_id, appointment_id, token_hash, expires_at)
  values (
    shop.id, target_appointment_id,
    extensions.digest(raw_token, 'sha256'),
    requested_start + interval '12 hours'
  );

  insert into public.notifications (
    barbershop_id, type, title, body, entity_type, entity_id, action_url
  ) values (
    shop.id, 'appointment_created', 'Novo agendamento',
    trim(client_name) || ' reservou ' || selected_service.name,
    'appointment', target_appointment_id,
    '/agenda?appointment=' || target_appointment_id::text
  );

  return query select target_appointment_id, raw_token;
end;
$$;

create function public.respond_to_appointment(raw_token text, response_action text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_token public.booking_tokens;
  target_status public.appointment_status;
begin
  if response_action not in ('confirm', 'cancel') then
    raise exception 'invalid response action';
  end if;

  select * into target_token
  from public.booking_tokens bt
  where bt.token_hash = extensions.digest(raw_token, 'sha256')
    and bt.used_at is null
    and bt.expires_at > now()
  for update;

  if target_token.id is null then
    raise exception 'invalid or expired token';
  end if;

  target_status := case when response_action = 'confirm'
    then 'confirmed'::public.appointment_status
    else 'cancelled_by_client'::public.appointment_status end;

  update public.appointments
  set status = target_status,
      confirmed_at = case when response_action = 'confirm' then now() else confirmed_at end,
      cancelled_at = case when response_action = 'cancel' then now() else cancelled_at end,
      updated_at = now()
  where id = target_token.appointment_id;

  update public.booking_tokens
  set used_at = now()
  where appointment_id = target_token.appointment_id and used_at is null;

  insert into public.notifications (
    barbershop_id, type, title, body, entity_type, entity_id, action_url
  ) values (
    target_token.barbershop_id,
    case when response_action = 'confirm' then 'appointment_confirmed'::public.notification_type else 'appointment_cancelled'::public.notification_type end,
    case when response_action = 'confirm' then 'Cliente confirmou' else 'Cliente cancelou' end,
    case when response_action = 'confirm' then 'O agendamento foi confirmado pelo cliente.' else 'O agendamento foi cancelado pelo cliente.' end,
    'appointment', target_token.appointment_id,
    '/agenda?appointment=' || target_token.appointment_id::text
  );

  return target_token.appointment_id;
end;
$$;

create function public.get_public_availability(
  target_slug text,
  selected_service_id uuid,
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
  selected_service public.services;
begin
  select * into shop from public.barbershops b
  where b.slug = target_slug and b.active and b.public_booking_enabled;
  select * into selected_service from public.services s
  where s.id = selected_service_id and s.barbershop_id = shop.id and s.active;

  if shop.id is null or selected_service.id is null then return; end if;

  return query
  select slot.starts_at
  from public.working_hours wh
  cross join lateral generate_series(
    (requested_date + wh.starts_at) at time zone shop.timezone,
    ((requested_date + wh.ends_at) at time zone shop.timezone) - make_interval(mins => selected_service.duration_minutes),
    make_interval(mins => shop.booking_interval_minutes)
  ) slot(starts_at)
  where wh.barbershop_id = shop.id
    and wh.barber_id = selected_barber_id
    and wh.active
    and wh.weekday = extract(dow from requested_date)::smallint
    and slot.starts_at >= now() + make_interval(mins => shop.minimum_notice_minutes)
    and requested_date <= (current_date + shop.max_advance_days)
    and not exists (
      select 1 from public.time_off t
      where t.barber_id = selected_barber_id
        and tstzrange(t.starts_at, t.ends_at, '[)') && tstzrange(
          slot.starts_at,
          slot.starts_at + make_interval(mins => selected_service.duration_minutes),
          '[)'
        )
    )
    and not exists (
      select 1 from public.appointments a
      where a.barber_id = selected_barber_id
        and a.status in ('pending', 'confirmed', 'in_progress')
        and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(
          slot.starts_at,
          slot.starts_at + make_interval(mins => selected_service.duration_minutes),
          '[)'
        )
    )
  order by slot.starts_at;
end;
$$;

revoke all on function public.create_public_booking(text, uuid, uuid, timestamptz, text, text, text) from public, anon, authenticated;
revoke all on function public.respond_to_appointment(text, text) from public, anon, authenticated;
revoke all on function public.get_public_availability(text, uuid, uuid, date) from public, anon, authenticated;
grant execute on function public.create_public_booking(text, uuid, uuid, timestamptz, text, text, text) to service_role;
grant execute on function public.respond_to_appointment(text, text) to service_role;
grant execute on function public.get_public_availability(text, uuid, uuid, date) to service_role;

alter table public.booking_tokens enable row level security;
alter table public.public_booking_attempts enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "users read own push subscriptions" on public.push_subscriptions for select to authenticated
using (user_id = (select auth.uid()) and (select private.is_barbershop_member(barbershop_id)));
create policy "users create own push subscriptions" on public.push_subscriptions for insert to authenticated
with check (user_id = (select auth.uid()) and (select private.is_barbershop_member(barbershop_id)));
create policy "users update own push subscriptions" on public.push_subscriptions for update to authenticated
using (user_id = (select auth.uid()) and (select private.is_barbershop_member(barbershop_id)))
with check (user_id = (select auth.uid()) and (select private.is_barbershop_member(barbershop_id)));
create policy "users remove own push subscriptions" on public.push_subscriptions for delete to authenticated
using (user_id = (select auth.uid()) and (select private.is_barbershop_member(barbershop_id)));

revoke all on public.booking_tokens, public.public_booking_attempts, public.push_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
