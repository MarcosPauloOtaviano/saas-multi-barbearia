alter table public.barbers
  add column if not exists avatar_url text;

alter table public.barbers
  add constraint barbers_avatar_url_length
  check (avatar_url is null or char_length(avatar_url) <= 2048);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'barber-media',
  'barber-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "managers upload barber media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'barber-media'
  and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (storage.foldername(name))[2] = 'avatars'
  and exists (
    select 1
    from public.barbers b
    where b.id::text = (storage.foldername(name))[3]
      and b.barbershop_id::text = (storage.foldername(name))[1]
      and (select private.has_barbershop_role(
        b.barbershop_id,
        array['owner', 'manager']::public.member_role[]
      ))
  )
);

create policy "managers delete barber media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'barber-media'
  and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and (storage.foldername(name))[2] = 'avatars'
  and exists (
    select 1
    from public.barbers b
    where b.id::text = (storage.foldername(name))[3]
      and b.barbershop_id::text = (storage.foldername(name))[1]
      and (select private.has_barbershop_role(
        b.barbershop_id,
        array['owner', 'manager']::public.member_role[]
      ))
  )
);

comment on column public.barbers.avatar_url is
  'Public profile photo URL. Portfolio images will use barber-media/{tenant}/portfolio/{barber}/ in a future release.';
