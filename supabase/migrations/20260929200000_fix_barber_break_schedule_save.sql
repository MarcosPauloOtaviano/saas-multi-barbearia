-- Fixes the weekly professional schedule save. The previous function listed
-- barber_id in the INSERT target but omitted it from the SELECT expression,
-- causing every lunch-break save to fail with a column/value count error.
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
            active and (
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
    select target_barbershop_id, target_barber_id, weekday, starts_at, ends_at, active, break_start, break_end
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
