-- Allow a professional to remove their own photo without granting broader
-- profile-management permissions. The existing storage policy already limits
-- deletion to the owner/manager or the professional who owns the profile.
create or replace function private.set_own_barber_photo(target_barber_id uuid, photo_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop_id uuid;
begin
  select b.barbershop_id
    into shop_id
  from public.barbers b
  join public.memberships m on m.id = b.membership_id
  where b.id = target_barber_id
    and m.user_id = (select auth.uid())
    and m.status = 'active';

  if shop_id is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if photo_url is not null
    and photo_url not like '%/storage/v1/object/public/barber-media/' || shop_id::text || '/avatars/' || target_barber_id::text || '/%'
  then
    raise exception 'invalid photo' using errcode = '22023';
  end if;

  update public.barbers
  set avatar_url = photo_url
  where id = target_barber_id;
end;
$$;

revoke all on function private.set_own_barber_photo(uuid, text) from public, anon;
grant execute on function private.set_own_barber_photo(uuid, text) to authenticated;

create or replace function public.set_own_barber_photo(target_barber_id uuid, photo_url text)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.set_own_barber_photo(target_barber_id, photo_url);
$$;

revoke all on function public.set_own_barber_photo(uuid, text) from public, anon;
grant execute on function public.set_own_barber_photo(uuid, text) to authenticated;
