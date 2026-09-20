-- Destructive production baseline explicitly requested before launch.
-- Deleting every tenant cascades through appointments, clients, services,
-- memberships, reminders, notifications and audit records. Profiles are
-- cleared separately and recreated only for the real Mantena Auth user.
delete from public.barbershops;
delete from public.profiles;

insert into public.barbershops (
  id,
  name,
  slug,
  timezone,
  primary_color,
  accent_color,
  active
)
values (
  '11111111-1111-4111-8111-111111111111',
  'Barbearia Stilo Sampa',
  'stilo-sampa',
  'America/Sao_Paulo',
  '#183c36',
  '#c86f45',
  true
);

insert into public.barbers (
  id,
  barbershop_id,
  display_name,
  color,
  active
)
values (
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'Roberto',
  '#3f7b70',
  true
);

-- This server-only bootstrap binds an existing Auth user to the clean tenant.
-- It is deliberately unavailable to browsers, anonymous users and staff users.
create or replace function public.attach_initial_stilo_owner(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  stilo_id constant uuid := '11111111-1111-4111-8111-111111111111';
  membership_id uuid;
  target_email text;
begin
  select email into target_email
  from auth.users
  where id = target_user_id;

  if target_email is null then
    raise exception 'auth user not found';
  end if;

  if exists (
    select 1
    from public.memberships
    where barbershop_id = stilo_id
      and role = 'owner'
      and status = 'active'
      and user_id <> target_user_id
  ) then
    raise exception 'Stilo Sampa already has an active owner';
  end if;

  insert into public.profiles (id, full_name, email)
  values (target_user_id, 'Mantena', lower(target_email))
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        updated_at = now();

  insert into public.memberships (barbershop_id, user_id, role, status)
  values (stilo_id, target_user_id, 'owner', 'active')
  on conflict (barbershop_id, user_id) do update
    set role = 'owner',
        status = 'active',
        updated_at = now()
  returning id into membership_id;

  return membership_id;
end;
$$;

revoke all on function public.attach_initial_stilo_owner(uuid) from public, anon, authenticated;
grant execute on function public.attach_initial_stilo_owner(uuid) to service_role;

comment on function public.attach_initial_stilo_owner(uuid) is
  'One-time server-only bootstrap that binds Mantena Auth credentials to Stilo Sampa.';
