-- Core multi-tenant model. All mutations are additive from this baseline.
create schema if not exists private;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;

create type public.member_role as enum ('owner', 'manager', 'barber', 'receptionist');
create type public.membership_status as enum ('invited', 'active', 'suspended');
create type public.appointment_status as enum (
  'pending', 'confirmed', 'in_progress', 'completed',
  'cancelled_by_client', 'cancelled_by_shop', 'no_show'
);

create table public.barbershops (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  timezone text not null default 'America/Sao_Paulo',
  phone text,
  email text,
  logo_url text,
  primary_color text not null default '#183c36' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null default '#c86f45' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, slug)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 100),
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null,
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbershop_id, user_id),
  unique (id, barbershop_id)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  description text,
  duration_minutes integer not null check (duration_minutes between 5 and 480),
  price_cents integer not null check (price_cents >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, barbershop_id)
);

create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  membership_id uuid,
  display_name text not null check (char_length(display_name) between 2 and 100),
  bio text,
  color text not null default '#c86f45' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, barbershop_id),
  unique (barbershop_id, membership_id),
  foreign key (membership_id, barbershop_id)
    references public.memberships(id, barbershop_id) on delete set null (membership_id)
);

create table public.barber_services (
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  barber_id uuid not null,
  service_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (barber_id, service_id),
  foreign key (barber_id, barbershop_id)
    references public.barbers(id, barbershop_id) on delete cascade,
  foreign key (service_id, barbershop_id)
    references public.services(id, barbershop_id) on delete cascade
);

create table public.working_hours (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  barber_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (barber_id, weekday, starts_at),
  foreign key (barber_id, barbershop_id)
    references public.barbers(id, barbershop_id) on delete cascade
);

create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  barber_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  foreign key (barber_id, barbershop_id)
    references public.barbers(id, barbershop_id) on delete cascade
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  phone text,
  email text,
  notes text,
  marketing_consent boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, barbershop_id)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  barber_id uuid not null,
  client_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'pending',
  source text not null default 'internal' check (source in ('internal', 'public_booking')),
  notes text,
  cancellation_reason text,
  confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (id, barbershop_id),
  foreign key (barber_id, barbershop_id)
    references public.barbers(id, barbershop_id),
  foreign key (client_id, barbershop_id)
    references public.clients(id, barbershop_id),
  exclude using gist (
    barbershop_id with =,
    barber_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pending', 'confirmed', 'in_progress'))
);

create table public.appointment_services (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  appointment_id uuid not null,
  service_id uuid,
  service_name text not null,
  duration_minutes integer not null check (duration_minutes between 5 and 480),
  price_cents integer not null check (price_cents >= 0),
  created_at timestamptz not null default now(),
  foreign key (appointment_id, barbershop_id)
    references public.appointments(id, barbershop_id) on delete cascade,
  foreign key (service_id, barbershop_id)
    references public.services(id, barbershop_id) on delete set null (service_id)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index memberships_user_idx on public.memberships(user_id, status);
create index services_tenant_active_idx on public.services(barbershop_id, active);
create index barbers_tenant_active_idx on public.barbers(barbershop_id, active);
create index clients_tenant_name_idx on public.clients(barbershop_id, name);
create index clients_tenant_email_idx on public.clients(barbershop_id, lower(email));
create index appointments_tenant_start_idx on public.appointments(barbershop_id, starts_at);
create index appointments_barber_start_idx on public.appointments(barber_id, starts_at);
create index appointments_client_start_idx on public.appointments(client_id, starts_at desc);
create index time_off_barber_range_idx on public.time_off using gist (barber_id, tstzrange(starts_at, ends_at, '[)'));
create index audit_logs_tenant_created_idx on public.audit_logs(barbershop_id, created_at desc);

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'barbershops', 'profiles', 'memberships', 'services', 'barbers',
    'working_hours', 'clients', 'appointments'
  ] loop
    execute format(
      'create trigger %I_touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()',
      table_name, table_name
    );
  end loop;
end;
$$;

create function private.is_barbershop_member(target_barbershop_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.memberships m
    where m.barbershop_id = target_barbershop_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

create function private.has_barbershop_role(
  target_barbershop_id uuid,
  allowed_roles public.member_role[]
)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.memberships m
    where m.barbershop_id = target_barbershop_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = any(allowed_roles)
  );
$$;

revoke all on function private.is_barbershop_member(uuid) from public;
revoke all on function private.has_barbershop_role(uuid, public.member_role[]) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_barbershop_member(uuid) to authenticated;
grant execute on function private.has_barbershop_role(uuid, public.member_role[]) to authenticated;

create function public.create_barbershop(
  shop_name text,
  shop_slug text,
  owner_name text,
  shop_timezone text default 'America/Sao_Paulo'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  new_barbershop_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;

  insert into public.barbershops (name, slug, timezone)
  values (trim(shop_name), lower(trim(shop_slug)), shop_timezone)
  returning id into new_barbershop_id;

  insert into public.profiles (id, full_name)
  values (current_user_id, trim(owner_name))
  on conflict (id) do update set full_name = excluded.full_name;

  insert into public.memberships (barbershop_id, user_id, role, status)
  values (new_barbershop_id, current_user_id, 'owner', 'active');

  return new_barbershop_id;
end;
$$;

revoke all on function public.create_barbershop(text, text, text, text) from public;
grant execute on function public.create_barbershop(text, text, text, text) to authenticated;

alter table public.barbershops enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.services enable row level security;
alter table public.barbers enable row level security;
alter table public.barber_services enable row level security;
alter table public.working_hours enable row level security;
alter table public.time_off enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_services enable row level security;
alter table public.audit_logs enable row level security;

create policy "members read barbershop" on public.barbershops for select to authenticated
using ((select private.is_barbershop_member(id)));
create policy "managers update barbershop" on public.barbershops for update to authenticated
using ((select private.has_barbershop_role(id, array['owner','manager']::public.member_role[])))
with check ((select private.has_barbershop_role(id, array['owner','manager']::public.member_role[])));

create policy "users read own profile" on public.profiles for select to authenticated
using ((select auth.uid()) = id);
create policy "users insert own profile" on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);
create policy "users update own profile" on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "members read memberships" on public.memberships for select to authenticated
using ((select private.is_barbershop_member(barbershop_id)));
create policy "managers invite members" on public.memberships for insert to authenticated
with check ((select private.has_barbershop_role(barbershop_id, array['owner','manager']::public.member_role[])));
create policy "managers update memberships" on public.memberships for update to authenticated
using ((select private.has_barbershop_role(barbershop_id, array['owner','manager']::public.member_role[])))
with check ((select private.has_barbershop_role(barbershop_id, array['owner','manager']::public.member_role[])));
create policy "owners remove memberships" on public.memberships for delete to authenticated
using ((select private.has_barbershop_role(barbershop_id, array['owner']::public.member_role[])) and user_id <> (select auth.uid()));

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'services', 'barbers', 'barber_services', 'working_hours', 'time_off',
    'clients', 'appointments', 'appointment_services'
  ] loop
    execute format('create policy "members read" on public.%I for select to authenticated using ((select private.is_barbershop_member(barbershop_id)))', table_name);
  end loop;

  foreach table_name in array array['clients', 'appointments', 'appointment_services'] loop
    execute format('create policy "members insert" on public.%I for insert to authenticated with check ((select private.is_barbershop_member(barbershop_id)))', table_name);
    execute format('create policy "members update" on public.%I for update to authenticated using ((select private.is_barbershop_member(barbershop_id))) with check ((select private.is_barbershop_member(barbershop_id)))', table_name);
    execute format('create policy "managers delete" on public.%I for delete to authenticated using ((select private.has_barbershop_role(barbershop_id, array[''owner'',''manager'']::public.member_role[])))', table_name);
  end loop;

  foreach table_name in array array['services', 'barbers', 'barber_services', 'working_hours', 'time_off'] loop
    execute format('create policy "managers insert" on public.%I for insert to authenticated with check ((select private.has_barbershop_role(barbershop_id, array[''owner'',''manager'']::public.member_role[])))', table_name);
    execute format('create policy "managers update" on public.%I for update to authenticated using ((select private.has_barbershop_role(barbershop_id, array[''owner'',''manager'']::public.member_role[]))) with check ((select private.has_barbershop_role(barbershop_id, array[''owner'',''manager'']::public.member_role[])))', table_name);
    execute format('create policy "managers delete" on public.%I for delete to authenticated using ((select private.has_barbershop_role(barbershop_id, array[''owner'',''manager'']::public.member_role[])))', table_name);
  end loop;
end;
$$;

create policy "managers read audit" on public.audit_logs for select to authenticated
using ((select private.has_barbershop_role(barbershop_id, array['owner','manager']::public.member_role[])));

revoke all on all tables in schema public from anon, authenticated;
grant select, update on public.barbershops to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.memberships to authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.barbers to authenticated;
grant select, insert, update, delete on public.barber_services to authenticated;
grant select, insert, update, delete on public.working_hours to authenticated;
grant select, insert, update, delete on public.time_off to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.appointments to authenticated;
grant select, insert, update, delete on public.appointment_services to authenticated;
grant select on public.audit_logs to authenticated;
grant usage, select on all sequences in schema public to authenticated;
