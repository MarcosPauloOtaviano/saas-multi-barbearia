-- Staff lifecycle and first-login password setup.

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

create or replace function private.complete_password_setup()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required';
  end if;

  update public.profiles
  set must_change_password = false,
      updated_at = now()
  where id = (select auth.uid());
end;
$$;

revoke all on function private.complete_password_setup() from public, anon;
grant execute on function private.complete_password_setup() to authenticated;

create or replace function public.complete_password_setup()
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.complete_password_setup();
$$;

revoke all on function public.complete_password_setup() from public, anon;
grant execute on function public.complete_password_setup() to authenticated;

drop policy if exists "managers delete barbers" on public.barbers;
create policy "managers delete barbers" on public.barbers for delete to authenticated
using ((select private.has_barbershop_role(barbershop_id, array['owner','manager']::public.member_role[])));
