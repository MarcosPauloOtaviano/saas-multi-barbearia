-- Keep privileged invitation activation behind a private helper. The public
-- entrypoint is invoker-security so the advisor does not expose a public
-- SECURITY DEFINER surface to signed-in users.
create or replace function private.accept_team_invitation()
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

revoke all on function private.accept_team_invitation() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.accept_team_invitation() to authenticated;

create or replace function public.accept_team_invitation()
returns integer
language sql
security invoker
set search_path = ''
as $$
  select private.accept_team_invitation();
$$;

revoke all on function public.accept_team_invitation() from public, anon;
grant execute on function public.accept_team_invitation() to authenticated;

-- Tenant creation is intentionally disabled in production. New establishments
-- are provisioned by the owner/bootstrap workflow, not by client sessions.
revoke all on function public.create_barbershop(text, text, text, text)
  from public, anon, authenticated, service_role;
