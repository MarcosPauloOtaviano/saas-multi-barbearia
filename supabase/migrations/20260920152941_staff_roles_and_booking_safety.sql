-- Staff invitations, least-privilege barber access, and booking idempotency.

alter table public.profiles
  add column email text;

create index profiles_email_idx on public.profiles (lower(email));

alter table public.appointments
  add column booking_request_id uuid;

create unique index appointments_booking_request_idx
  on public.appointments (barbershop_id, booking_request_id)
  where booking_request_id is not null;

-- A client cannot occupy two chairs at the same time, even with different barbers.
alter table public.appointments
  add constraint appointments_prevent_client_overlap
  exclude using gist (
    barbershop_id with =,
    client_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pending', 'confirmed', 'in_progress'));

create index clients_tenant_phone_digits_idx
  on public.clients (barbershop_id, (regexp_replace(coalesce(phone, ''), '\\D', '', 'g')));

create function private.is_own_barber(
  target_barbershop_id uuid,
  target_barber_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.barbers b
    join public.memberships m
      on m.id = b.membership_id
     and m.barbershop_id = b.barbershop_id
    where b.id = target_barber_id
      and b.barbershop_id = target_barbershop_id
      and b.active
      and m.user_id = (select auth.uid())
      and m.role = 'barber'
      and m.status = 'active'
  );
$$;

revoke all on function private.is_own_barber(uuid, uuid) from public;
grant execute on function private.is_own_barber(uuid, uuid) to authenticated;

-- Invited accounts become active only after the invite link establishes a session.
create function public.accept_team_invitation()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  accepted_count integer;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;

  update public.memberships
  set status = 'active', updated_at = now()
  where user_id = current_user_id
    and status = 'invited';

  get diagnostics accepted_count = row_count;
  return accepted_count;
end;
$$;

revoke all on function public.accept_team_invitation() from public, anon;
grant execute on function public.accept_team_invitation() to authenticated;

-- Profiles are private by default; managers may identify people in their own team.
create policy "managers read team profiles" on public.profiles for select to authenticated
using (
  exists (
    select 1
    from public.memberships target_membership
    where target_membership.user_id = profiles.id
      and (select private.has_barbershop_role(
        target_membership.barbershop_id,
        array['owner','manager']::public.member_role[]
      ))
  )
);

drop policy if exists "members read memberships" on public.memberships;
create policy "managers or self read memberships" on public.memberships for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.has_barbershop_role(
    barbershop_id,
    array['owner','manager']::public.member_role[]
  ))
);

-- Replace the original broad operational policies with role-aware policies.
drop policy if exists "members read" on public.clients;
drop policy if exists "members insert" on public.clients;
drop policy if exists "members update" on public.clients;

create policy "staff read permitted clients" on public.clients for select to authenticated
using (
  (select private.has_barbershop_role(
    barbershop_id,
    array['owner','manager','receptionist']::public.member_role[]
  ))
  or exists (
    select 1
    from public.appointments a
    where a.client_id = clients.id
      and a.barbershop_id = clients.barbershop_id
      and (select private.is_own_barber(a.barbershop_id, a.barber_id))
  )
);

create policy "front desk creates clients" on public.clients for insert to authenticated
with check ((select private.has_barbershop_role(
  barbershop_id,
  array['owner','manager','receptionist']::public.member_role[]
)));

create policy "front desk updates clients" on public.clients for update to authenticated
using ((select private.has_barbershop_role(
  barbershop_id,
  array['owner','manager','receptionist']::public.member_role[]
)))
with check ((select private.has_barbershop_role(
  barbershop_id,
  array['owner','manager','receptionist']::public.member_role[]
)));

drop policy if exists "members read" on public.appointments;
drop policy if exists "members insert" on public.appointments;
drop policy if exists "members update" on public.appointments;

create policy "staff read permitted appointments" on public.appointments for select to authenticated
using (
  (select private.has_barbershop_role(
    barbershop_id,
    array['owner','manager','receptionist']::public.member_role[]
  ))
  or (select private.is_own_barber(barbershop_id, barber_id))
);

create policy "staff create permitted appointments" on public.appointments for insert to authenticated
with check (
  (select private.has_barbershop_role(
    barbershop_id,
    array['owner','manager','receptionist']::public.member_role[]
  ))
  or (select private.is_own_barber(barbershop_id, barber_id))
);

create policy "staff update permitted appointments" on public.appointments for update to authenticated
using (
  (select private.has_barbershop_role(
    barbershop_id,
    array['owner','manager','receptionist']::public.member_role[]
  ))
  or (select private.is_own_barber(barbershop_id, barber_id))
)
with check (
  (select private.has_barbershop_role(
    barbershop_id,
    array['owner','manager','receptionist']::public.member_role[]
  ))
  or (select private.is_own_barber(barbershop_id, barber_id))
);

drop policy if exists "members read" on public.appointment_services;
drop policy if exists "members insert" on public.appointment_services;
drop policy if exists "members update" on public.appointment_services;

create policy "staff read permitted appointment services" on public.appointment_services for select to authenticated
using (
  exists (
    select 1
    from public.appointments a
    where a.id = appointment_services.appointment_id
      and a.barbershop_id = appointment_services.barbershop_id
  )
);

create policy "staff create permitted appointment services" on public.appointment_services for insert to authenticated
with check (
  exists (
    select 1
    from public.appointments a
    where a.id = appointment_services.appointment_id
      and a.barbershop_id = appointment_services.barbershop_id
  )
);

create policy "staff update permitted appointment services" on public.appointment_services for update to authenticated
using (
  exists (
    select 1
    from public.appointments a
    where a.id = appointment_services.appointment_id
      and a.barbershop_id = appointment_services.barbershop_id
  )
)
with check (
  exists (
    select 1
    from public.appointments a
    where a.id = appointment_services.appointment_id
      and a.barbershop_id = appointment_services.barbershop_id
  )
);

drop policy if exists "members read notifications" on public.notifications;
drop policy if exists "members create notifications" on public.notifications;
drop policy if exists "users mark notifications" on public.notifications;

create policy "staff read permitted notifications" on public.notifications for select to authenticated
using (
  user_id = (select auth.uid())
  or (
    user_id is null
    and (
      (select private.has_barbershop_role(
        barbershop_id,
        array['owner','manager','receptionist']::public.member_role[]
      ))
      or (
        entity_type = 'appointment'
        and exists (
          select 1 from public.appointments a
          where a.id = notifications.entity_id
            and a.barbershop_id = notifications.barbershop_id
        )
      )
    )
  )
);

create policy "staff create permitted notifications" on public.notifications for insert to authenticated
with check (
  (select private.has_barbershop_role(
    barbershop_id,
    array['owner','manager','receptionist']::public.member_role[]
  ))
  or user_id = (select auth.uid())
);

create policy "staff mark permitted notifications" on public.notifications for update to authenticated
using (
  user_id = (select auth.uid())
  or (
    user_id is null
    and (select private.has_barbershop_role(
      barbershop_id,
      array['owner','manager','receptionist']::public.member_role[]
    ))
  )
)
with check (
  user_id = (select auth.uid())
  or (
    user_id is null
    and (select private.has_barbershop_role(
      barbershop_id,
      array['owner','manager','receptionist']::public.member_role[]
    ))
  )
);

-- New public booking overload. A request id makes retries safe and an advisory
-- lock prevents concurrent requests from creating duplicate client records.
create function public.create_public_booking(
  target_slug text,
  selected_service_id uuid,
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
  selected_service public.services;
  target_client_id uuid;
  target_appointment_id uuid;
  existing_appointment_id uuid;
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
  where a.barbershop_id = shop.id
    and a.booking_request_id = request_id;

  if existing_appointment_id is not null then
    return query select existing_appointment_id, null::text;
    return;
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

  perform pg_advisory_xact_lock(hashtextextended(
    shop.id::text || ':' || coalesce(normalized_email, normalized_phone, request_id::text),
    0
  ));

  select c.id into target_client_id
  from public.clients c
  where c.barbershop_id = shop.id
    and (
      (normalized_email is not null and lower(c.email) = normalized_email)
      or (
        normalized_phone is not null
        and regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') = normalized_phone
      )
    )
  order by c.created_at
  limit 1;

  if target_client_id is null then
    insert into public.clients (barbershop_id, name, email, phone)
    values (shop.id, trim(client_name), normalized_email, nullif(trim(client_phone), ''))
    returning id into target_client_id;
  else
    update public.clients
    set name = trim(client_name),
        email = coalesce(normalized_email, email),
        phone = coalesce(nullif(trim(client_phone), ''), phone)
    where id = target_client_id;
  end if;

  insert into public.appointments (
    barbershop_id, barber_id, client_id, starts_at, ends_at, status, source,
    booking_request_id
  ) values (
    shop.id,
    selected_barber_id,
    target_client_id,
    requested_start,
    requested_start + make_interval(mins => selected_service.duration_minutes),
    'pending',
    'public_booking',
    request_id
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

revoke all on function public.create_public_booking(text, uuid, uuid, timestamptz, text, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.create_public_booking(text, uuid, uuid, timestamptz, text, text, text, uuid)
  to service_role;
