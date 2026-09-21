alter table public.barbershops add column booking_paused boolean not null default false;

create table public.shop_hours (
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time not null default '09:00',
  ends_at time not null default '18:00',
  active boolean not null default false,
  primary key (barbershop_id, weekday),
  check (ends_at > starts_at)
);
alter table public.shop_hours enable row level security;
create policy "members read opening hours" on public.shop_hours for select to authenticated
using ((select private.is_barbershop_member(barbershop_id)));
create policy "managers manage opening hours" on public.shop_hours for all to authenticated
using ((select private.has_barbershop_role(barbershop_id, array['owner','manager']::public.member_role[])))
with check ((select private.has_barbershop_role(barbershop_id, array['owner','manager']::public.member_role[])));
grant select, insert, update, delete on public.shop_hours to authenticated, service_role;
insert into public.shop_hours (barbershop_id, weekday, starts_at, ends_at, active)
select s.id, d, coalesce(min(w.starts_at), '09:00'), coalesce(max(w.ends_at), '18:00'), count(w.id) > 0
from public.barbershops s cross join generate_series(0,6) d
left join public.working_hours w on w.barbershop_id=s.id and w.weekday=d and w.active
group by s.id,d;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 100),
  description text not null default '',
  price_cents integer not null check (price_cents >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index products_shop_idx on public.products(barbershop_id);
alter table public.products enable row level security;
create policy "managers manage products" on public.products for all to authenticated
using ((select private.has_barbershop_role(barbershop_id, array['owner','manager']::public.member_role[])))
with check ((select private.has_barbershop_role(barbershop_id, array['owner','manager']::public.member_role[])));
grant select, insert, update, delete on public.products to authenticated, service_role;

-- Replaces a complete week atomically, including closed days. A missing row
-- must never silently become an open day after reloading the application.
create or replace function public.save_operating_schedule(
  target_barbershop_id uuid, target_barber_id uuid, schedule jsonb, paused boolean default null
) returns void language plpgsql security invoker set search_path='' as $$
begin
  if not private.has_barbershop_role(target_barbershop_id, array['owner','manager']::public.member_role[]) then
    raise exception 'not authorized' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('schedule:' || target_barbershop_id::text,0));
  if jsonb_typeof(schedule) <> 'array' or jsonb_array_length(schedule) <> 7 or
     (select count(distinct weekday) from jsonb_to_recordset(schedule) as r(weekday int)) <> 7 or
     exists (select 1 from jsonb_to_recordset(schedule) as r(weekday int,starts_at time,ends_at time,active boolean)
       where weekday is null or weekday not between 0 and 6 or starts_at is null or ends_at is null or ends_at <= starts_at or active is null) then
    raise exception 'invalid schedule' using errcode='22023';
  end if;
  if target_barber_id is null then
    insert into public.shop_hours (barbershop_id,weekday,starts_at,ends_at,active)
    select target_barbershop_id,weekday,starts_at,ends_at,active
    from jsonb_to_recordset(schedule) as r(weekday smallint,starts_at time,ends_at time,active boolean)
    on conflict (barbershop_id,weekday) do update set starts_at=excluded.starts_at,ends_at=excluded.ends_at,active=excluded.active;
    if paused is not null then
      update public.barbershops set booking_paused=paused where id=target_barbershop_id;
    end if;
  else
    if not exists(select 1 from public.barbers where id=target_barber_id and barbershop_id=target_barbershop_id) then
      raise exception 'barber unavailable' using errcode='42501';
    end if;
    delete from public.working_hours where barbershop_id=target_barbershop_id and barber_id=target_barber_id;
    insert into public.working_hours (barbershop_id,barber_id,weekday,starts_at,ends_at,active)
    select target_barbershop_id,target_barber_id,weekday,starts_at,ends_at,active
    from jsonb_to_recordset(schedule) as r(weekday smallint,starts_at time,ends_at time,active boolean);
  end if;
end;
$$;
revoke all on function public.save_operating_schedule(uuid,uuid,jsonb,boolean) from public,anon;
grant execute on function public.save_operating_schedule(uuid,uuid,jsonb,boolean) to authenticated;

create or replace function private.slot_within_schedule(shop_id uuid, professional_id uuid, slot_start timestamptz, slot_end timestamptz)
returns boolean language sql stable security invoker set search_path='' as $$
  select exists (
    select 1 from public.barbershops s
    join public.barbers b on b.barbershop_id=s.id and b.id=professional_id and b.active
    join public.shop_hours h on h.barbershop_id=s.id and h.active
    join public.working_hours w on w.barbershop_id=s.id and w.barber_id=b.id and w.active and w.weekday=h.weekday
    where s.id=shop_id and s.active and not s.booking_paused and slot_end > slot_start
      and h.weekday=extract(dow from slot_start at time zone s.timezone)::smallint
      and (slot_start at time zone s.timezone)::date=(slot_end at time zone s.timezone)::date
      and (slot_start at time zone s.timezone)::time >= greatest(h.starts_at,w.starts_at)
      and (slot_end at time zone s.timezone)::time <= least(h.ends_at,w.ends_at)
      and not exists(select 1 from public.time_off t where t.barbershop_id=s.id and t.barber_id=b.id
        and tstzrange(t.starts_at,t.ends_at,'[)') && tstzrange(slot_start,slot_end,'[)'))
  );
$$;
revoke all on function private.slot_within_schedule(uuid,uuid,timestamptz,timestamptz) from public,anon,authenticated;

-- Covers direct API inserts, internal bookings, public bookings and reschedules.
create or replace function private.enforce_appointment_schedule()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status not in ('pending','confirmed','in_progress') then return new; end if;
  if tg_op='UPDATE' then
    if new.barber_id=old.barber_id and new.starts_at=old.starts_at and new.ends_at=old.ends_at
       and old.status in ('pending','confirmed','in_progress') then return new; end if;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('schedule:' || new.barbershop_id::text,0));
  if not private.slot_within_schedule(new.barbershop_id,new.barber_id,new.starts_at,new.ends_at) then
    raise exception 'outside operating hours' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_appointment_schedule() from public,anon,authenticated;
create trigger appointments_enforce_operating_hours before insert or update on public.appointments
for each row execute function private.enforce_appointment_schedule();

create or replace function public.get_public_availability(target_slug text, selected_service_id uuid, selected_barber_id uuid, requested_date date)
returns table(starts_at timestamptz) language plpgsql stable security definer set search_path='' as $$
declare shop public.barbershops; selected_service public.services;
begin
  select * into shop from public.barbershops s where s.slug=target_slug and s.active and s.public_booking_enabled and not s.booking_paused;
  select s.* into selected_service from public.services s
    join public.barber_services bs on bs.service_id=s.id and bs.barbershop_id=s.barbershop_id and bs.barber_id=selected_barber_id
    where s.barbershop_id=shop.id and s.id=selected_service_id and s.active;
  if shop.id is null or selected_service.id is null then return; end if;
  return query select distinct slot.starts_at from public.working_hours w
  join public.shop_hours h on h.barbershop_id=w.barbershop_id and h.weekday=w.weekday and h.active
  cross join lateral generate_series(
    (requested_date+greatest(w.starts_at,h.starts_at)) at time zone shop.timezone,
    ((requested_date+least(w.ends_at,h.ends_at)) at time zone shop.timezone)-make_interval(mins=>selected_service.duration_minutes),
    make_interval(mins=>shop.booking_interval_minutes)
  ) slot(starts_at)
  where w.barbershop_id=shop.id and w.barber_id=selected_barber_id and w.active
    and w.weekday=extract(dow from requested_date)::smallint
    and slot.starts_at>=now()+make_interval(mins=>shop.minimum_notice_minutes)
    and requested_date <= (now() at time zone shop.timezone)::date+shop.max_advance_days
    and private.slot_within_schedule(shop.id,selected_barber_id,slot.starts_at,slot.starts_at+make_interval(mins=>selected_service.duration_minutes))
    and not exists(select 1 from public.appointments a where a.barbershop_id=shop.id and a.barber_id=selected_barber_id
      and a.status in ('pending','confirmed','in_progress')
      and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(slot.starts_at,slot.starts_at+make_interval(mins=>selected_service.duration_minutes),'[)'))
  order by slot.starts_at;
end;
$$;
revoke all on function public.get_public_availability(text,uuid,uuid,date) from public,anon,authenticated;
grant execute on function public.get_public_availability(text,uuid,uuid,date) to service_role;

-- A professional may update their own photo without gaining permission to
-- edit membership, activation, or another professional's profile.
create or replace function private.set_own_barber_photo(target_barber_id uuid, photo_url text)
returns void language plpgsql security definer set search_path='' as $$
declare shop_id uuid;
begin
  select b.barbershop_id into shop_id from public.barbers b join public.memberships m on m.id=b.membership_id
  where b.id=target_barber_id and m.user_id=(select auth.uid()) and m.status='active';
  if shop_id is null then raise exception 'not authorized' using errcode='42501'; end if;
  if photo_url not like '%/storage/v1/object/public/barber-media/' || shop_id::text || '/avatars/' || target_barber_id::text || '/%' then
    raise exception 'invalid photo' using errcode='22023';
  end if;
  update public.barbers set avatar_url=photo_url where id=target_barber_id;
end;
$$;
revoke all on function private.set_own_barber_photo(uuid,text) from public,anon;
grant execute on function private.set_own_barber_photo(uuid,text) to authenticated;
create function public.set_own_barber_photo(target_barber_id uuid,photo_url text)
returns void language sql security invoker set search_path='' as $$ select private.set_own_barber_photo(target_barber_id,photo_url); $$;
revoke all on function public.set_own_barber_photo(uuid,text) from public,anon;
grant execute on function public.set_own_barber_photo(uuid,text) to authenticated;

create policy "staff upload own photo" on storage.objects for insert to authenticated with check (
  bucket_id='barber-media' and (storage.foldername(name))[2]='avatars'
  and exists(select 1 from public.barbers b join public.memberships m on m.id=b.membership_id
    where b.id::text=(storage.foldername(name))[3] and b.barbershop_id::text=(storage.foldername(name))[1]
      and m.user_id=(select auth.uid()) and m.status='active')
);
create policy "staff read managed photo objects" on storage.objects for select to authenticated using (
  bucket_id='barber-media' and (storage.foldername(name))[2]='avatars'
  and exists(select 1 from public.barbers b where b.id::text=(storage.foldername(name))[3]
    and b.barbershop_id::text=(storage.foldername(name))[1]
    and (private.has_barbershop_role(b.barbershop_id,array['owner','manager']::public.member_role[]) or private.is_own_barber(b.barbershop_id,b.id)))
);
create policy "staff delete own photo" on storage.objects for delete to authenticated using (
  bucket_id='barber-media' and (storage.foldername(name))[2]='avatars'
  and exists(select 1 from public.barbers b where b.id::text=(storage.foldername(name))[3]
    and b.barbershop_id::text=(storage.foldername(name))[1] and private.is_own_barber(b.barbershop_id,b.id))
);
