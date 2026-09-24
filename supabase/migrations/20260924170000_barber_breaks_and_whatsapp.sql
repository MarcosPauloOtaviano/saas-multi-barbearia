-- Recurring breaks belong to each professional's weekly schedule. A break is
-- part of the schedule (not a cancellation), so every booking path shares the
-- same database guard and cannot reserve that interval.
alter table public.working_hours
  add column if not exists break_start time,
  add column if not exists break_end time;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'working_hours_break_valid'
      and conrelid = 'public.working_hours'::regclass
  ) then
    alter table public.working_hours
      add constraint working_hours_break_valid check (
        (break_start is null and break_end is null)
        or (
          break_start > starts_at
          and break_end < ends_at
          and break_start < break_end
        )
      );
  end if;
end;
$$;

-- Keep the existing all-week save operation atomic while accepting an
-- optional recurring lunch interval for barber rows.
create or replace function public.save_operating_schedule(
  target_barbershop_id uuid,
  target_barber_id uuid,
  schedule jsonb,
  paused boolean default null
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.has_barbershop_role(target_barbershop_id, array['owner','manager']::public.member_role[]) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('schedule:' || target_barbershop_id::text, 0));

  if jsonb_typeof(schedule) <> 'array'
     or jsonb_array_length(schedule) <> 7
     or (select count(distinct weekday) from jsonb_to_recordset(schedule) as r(weekday int)) <> 7
     or exists (
       select 1
       from jsonb_to_recordset(schedule) as r(
         weekday int,
         starts_at time,
         ends_at time,
         active boolean,
         break_start time,
         break_end time
       )
       where weekday is null
          or weekday not between 0 and 6
          or starts_at is null
          or ends_at is null
          or ends_at <= starts_at
          or active is null
          or (
            active
            and (
              (break_start is null) <> (break_end is null)
              or (
                break_start is not null
                and (
                  break_start <= starts_at
                  or break_end >= ends_at
                  or break_start >= break_end
                )
              )
            )
          )
     ) then
    raise exception 'invalid schedule' using errcode = '22023';
  end if;

  if target_barber_id is null then
    insert into public.shop_hours (barbershop_id, weekday, starts_at, ends_at, active)
    select target_barbershop_id, weekday, starts_at, ends_at, active
    from jsonb_to_recordset(schedule) as r(weekday smallint, starts_at time, ends_at time, active boolean)
    on conflict (barbershop_id, weekday) do update
      set starts_at = excluded.starts_at,
          ends_at = excluded.ends_at,
          active = excluded.active;
    if paused is not null then
      update public.barbershops set booking_paused = paused where id = target_barbershop_id;
    end if;
  else
    if not exists (
      select 1 from public.barbers
      where id = target_barber_id and barbershop_id = target_barbershop_id
    ) then
      raise exception 'barber unavailable' using errcode = '42501';
    end if;

    delete from public.working_hours
    where barbershop_id = target_barbershop_id and barber_id = target_barber_id;

    insert into public.working_hours (
      barbershop_id, barber_id, weekday, starts_at, ends_at, active, break_start, break_end
    )
    select target_barbershop_id, weekday, starts_at, ends_at, active, break_start, break_end
    from jsonb_to_recordset(schedule) as r(
      weekday smallint,
      starts_at time,
      ends_at time,
      active boolean,
      break_start time,
      break_end time
    );
  end if;
end;
$$;

revoke all on function public.save_operating_schedule(uuid, uuid, jsonb, boolean) from public, anon;
grant execute on function public.save_operating_schedule(uuid, uuid, jsonb, boolean) to authenticated;

-- This is the single schedule predicate used by public availability and the
-- appointments trigger, so a direct API call cannot bypass a lunch break.
create or replace function private.slot_within_schedule(
  shop_id uuid,
  professional_id uuid,
  slot_start timestamptz,
  slot_end timestamptz
) returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.barbershops s
    join public.barbers b
      on b.barbershop_id = s.id and b.id = professional_id and b.active
    join public.shop_hours h
      on h.barbershop_id = s.id and h.active
    join public.working_hours w
      on w.barbershop_id = s.id
     and w.barber_id = b.id
     and w.active
     and w.weekday = h.weekday
    where s.id = shop_id
      and s.active
      and not s.booking_paused
      and slot_end > slot_start
      and h.weekday = extract(dow from slot_start at time zone s.timezone)::smallint
      and (slot_start at time zone s.timezone)::date = (slot_end at time zone s.timezone)::date
      and (slot_start at time zone s.timezone)::time >= greatest(h.starts_at, w.starts_at)
      and (slot_end at time zone s.timezone)::time <= least(h.ends_at, w.ends_at)
      and not (
        w.break_start is not null
        and w.break_end is not null
        and (slot_start at time zone s.timezone)::time < w.break_end
        and (slot_end at time zone s.timezone)::time > w.break_start
      )
      and not exists (
        select 1
        from public.time_off t
        where t.barbershop_id = s.id
          and t.barber_id = b.id
          and tstzrange(t.starts_at, t.ends_at, '[)') && tstzrange(slot_start, slot_end, '[)')
      )
  );
$$;

revoke all on function private.slot_within_schedule(uuid, uuid, timestamptz, timestamptz) from public, anon, authenticated;

-- A public booking must always carry a reachable WhatsApp number. The Edge
-- Function validates it for a friendly client response; this trigger keeps
-- direct service-role calls from bypassing the same rule.
create or replace function private.enforce_public_booking_whatsapp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.source::text = 'public_booking'
     and not exists (
       select 1
       from public.clients c
       where c.id = new.client_id
         and length(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g')) >= 10
     ) then
    raise exception 'whatsapp required' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_public_booking_whatsapp() from public, anon, authenticated;
drop trigger if exists appointments_require_public_whatsapp on public.appointments;
create trigger appointments_require_public_whatsapp
before insert on public.appointments
for each row execute function private.enforce_public_booking_whatsapp();
