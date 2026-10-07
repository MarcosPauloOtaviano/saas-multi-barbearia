-- Make lunch-break conflicts explicit for the team and keep them out of
-- public availability. A manager/barber may override a lunch conflict only
-- after the recurring-booking confirmation in the admin panel.

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
      on b.barbershop_id = s.id
     and b.id = professional_id
     and b.active
    join public.shop_hours h
      on h.barbershop_id = s.id
     and h.active
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

create or replace function private.slot_hits_lunch_break(
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
    join public.shop_hours h
      on h.barbershop_id = s.id
     and h.active
    join public.working_hours w
      on w.barbershop_id = s.id
     and w.barber_id = professional_id
     and w.active
     and w.weekday = h.weekday
    where s.id = shop_id
      and s.active
      and h.weekday = extract(dow from slot_start at time zone s.timezone)::smallint
      and w.weekday = extract(dow from slot_start at time zone s.timezone)::smallint
      and (slot_start at time zone s.timezone)::date = (slot_end at time zone s.timezone)::date
      and w.break_start is not null
      and w.break_end is not null
      and (slot_start at time zone s.timezone)::time < w.break_end
      and (slot_end at time zone s.timezone)::time > w.break_start
  );
$$;

create or replace function private.enforce_appointment_schedule()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status not in ('pending', 'confirmed', 'in_progress') then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.barber_id = old.barber_id
     and new.starts_at = old.starts_at
     and new.ends_at = old.ends_at
     and old.status in ('pending', 'confirmed', 'in_progress') then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('schedule:' || new.barbershop_id::text, 0));

  if not private.slot_within_schedule(new.barbershop_id, new.barber_id, new.starts_at, new.ends_at) then
    if private.slot_hits_lunch_break(new.barbershop_id, new.barber_id, new.starts_at, new.ends_at)
       and current_setting('barberflow.allow_lunch_override', true) = 'true' then
      return new;
    end if;

    if private.slot_hits_lunch_break(new.barbershop_id, new.barber_id, new.starts_at, new.ends_at) then
      raise exception 'lunch_conflict'
        using errcode = '23514',
              hint = 'Este horário cruza a pausa para almoço do barbeiro.';
    end if;

    raise exception 'outside operating hours'
      using errcode = '23514',
            hint = 'O horário está fora do funcionamento do barbeiro.';
  end if;
  return new;
end;
$$;

revoke all on function private.slot_within_schedule(uuid, uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function private.slot_hits_lunch_break(uuid, uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function private.enforce_appointment_schedule() from public, anon, authenticated;
drop trigger if exists appointments_enforce_operating_hours on public.appointments;
create trigger appointments_enforce_operating_hours
before insert or update on public.appointments
for each row execute function private.enforce_appointment_schedule();

-- Remove the previous overload so older clients cannot silently bypass the
-- explicit lunch-conflict confirmation added below.
drop function if exists public.create_recurring_internal_appointments(uuid, uuid[], uuid, uuid, date, time, integer, integer, smallint[], text);

create or replace function public.create_recurring_internal_appointments(
  target_barbershop_id uuid,
  selected_service_ids uuid[],
  selected_barber_id uuid,
  selected_client_id uuid,
  first_date date,
  local_time time,
  interval_days integer,
  duration_months integer,
  selected_weekdays smallint[] default '{}',
  appointment_notes text default null,
  allow_schedule_conflict boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  shop_timezone text;
  total_duration integer;
  selected_count integer;
  occurrence_date date;
  end_date date;
  utc_starts_at timestamptz;
  utc_ends_at timestamptz;
  series_id uuid := extensions.gen_random_uuid();
  occurrence_count integer := 0;
  inserted_count integer := 0;
  position integer := 0;
  week_index integer;
  weekday_count integer := coalesce(array_length(selected_weekdays, 1), 0);
  should_create boolean;
begin
  if not (select private.has_barbershop_role(
    target_barbershop_id,
    array['owner', 'manager', 'barber', 'receptionist']::public.member_role[]
  )) then
    raise exception 'not authorized';
  end if;

  if interval_days is null or interval_days not between 1 and 365 then
    raise exception 'interval must be between 1 and 365 days';
  end if;
  if duration_months is null or duration_months not in (3, 12, 24) then
    raise exception 'duration must be 3, 12, or 24 months';
  end if;
  if first_date is null or local_time is null then
    raise exception 'start date and time are required';
  end if;

  if weekday_count > 0 then
    if interval_days % 7 <> 0 then
      raise exception 'when weekdays are selected, interval must be a multiple of 7 days';
    end if;
    if exists (select 1 from unnest(selected_weekdays) day_value where day_value < 0 or day_value > 6) then
      raise exception 'weekday must be between 0 and 6';
    end if;
  end if;

  select b.timezone into shop_timezone
  from public.barbershops b
  where b.id = target_barbershop_id and b.active;

  select count(*)::integer, coalesce(sum(s.duration_minutes), 0)::integer
    into selected_count, total_duration
  from public.services s
  join public.barber_services bs
    on bs.service_id = s.id
   and bs.barber_id = selected_barber_id
   and bs.barbershop_id = target_barbershop_id
  where s.id = any(selected_service_ids)
    and s.barbershop_id = target_barbershop_id
    and s.active;

  if shop_timezone is null
     or coalesce(array_length(selected_service_ids, 1), 0) not between 1 and 8
     or selected_count <> array_length(selected_service_ids, 1)
     or total_duration <= 0 then
    raise exception 'service, barber, or barbershop unavailable';
  end if;

  if not exists (
    select 1 from public.barbers b
    where b.id = selected_barber_id
      and b.barbershop_id = target_barbershop_id
      and b.active
  ) then
    raise exception 'barber unavailable';
  end if;

  if not exists (
    select 1 from public.clients c
    where c.id = selected_client_id
      and c.barbershop_id = target_barbershop_id
      and c.active
  ) then
    raise exception 'client unavailable';
  end if;

  end_date := (first_date + make_interval(months => duration_months))::date;

  perform pg_advisory_xact_lock(hashtextextended(
    target_barbershop_id::text || ':' || selected_barber_id::text || ':' || selected_client_id::text, 0
  ));

  if allow_schedule_conflict then
    perform set_config('barberflow.allow_lunch_override', 'true', true);
  end if;

  occurrence_date := first_date;
  while occurrence_date < end_date loop
    week_index := floor((occurrence_date - date_trunc('week', first_date)::date)::numeric / 7)::integer;
    should_create := case
      when weekday_count = 0 then ((occurrence_date - first_date) % interval_days = 0)
      else (extract(dow from occurrence_date)::smallint = any(selected_weekdays)
        and week_index % greatest(1, interval_days / 7) = 0)
    end;

    if should_create then
      utc_starts_at := (occurrence_date + local_time) at time zone shop_timezone;
      utc_ends_at := utc_starts_at + make_interval(mins => total_duration);

      if not private.slot_within_schedule(target_barbershop_id, selected_barber_id, utc_starts_at, utc_ends_at) then
        if private.slot_hits_lunch_break(target_barbershop_id, selected_barber_id, utc_starts_at, utc_ends_at) then
          if not allow_schedule_conflict then
            raise exception using
              message = format('lunch_conflict: %s às %s', to_char(occurrence_date, 'DD/MM/YYYY'), to_char(local_time, 'HH24:MI')),
              errcode = '23P01';
          end if;
        else
          raise exception using
            message = format('schedule_conflict: %s às %s', to_char(occurrence_date, 'DD/MM/YYYY'), to_char(local_time, 'HH24:MI')),
            errcode = '23514';
        end if;
      end if;

      if exists (
        select 1 from public.appointments a
        where a.barbershop_id = target_barbershop_id
          and (a.barber_id = selected_barber_id or a.client_id = selected_client_id)
          and a.status in ('pending', 'confirmed', 'in_progress')
          and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(utc_starts_at, utc_ends_at, '[)')
      ) then
        raise exception using
          message = format('recurrence_conflict: %s às %s', to_char(occurrence_date, 'DD/MM/YYYY'), to_char(local_time, 'HH24:MI')),
          errcode = '23P01';
      end if;
      occurrence_count := occurrence_count + 1;
    end if;
    occurrence_date := occurrence_date + 1;
  end loop;

  if occurrence_count = 0 then
    raise exception 'no recurrence dates matched the selected weekdays';
  end if;

  occurrence_date := first_date;
  while occurrence_date < end_date loop
    week_index := floor((occurrence_date - date_trunc('week', first_date)::date)::numeric / 7)::integer;
    should_create := case
      when weekday_count = 0 then ((occurrence_date - first_date) % interval_days = 0)
      else (extract(dow from occurrence_date)::smallint = any(selected_weekdays)
        and week_index % greatest(1, interval_days / 7) = 0)
    end;

    if should_create then
      utc_starts_at := (occurrence_date + local_time) at time zone shop_timezone;
      insert into public.appointments (
        barbershop_id, barber_id, client_id, starts_at, ends_at,
        status, source, notes, created_by, recurrence_id, recurrence_position
      ) values (
        target_barbershop_id, selected_barber_id, selected_client_id,
        utc_starts_at, utc_starts_at + make_interval(mins => total_duration),
        'confirmed', 'internal', nullif(trim(appointment_notes), ''),
        (select auth.uid()), series_id, position
      );
      insert into public.appointment_services (
        barbershop_id, appointment_id, service_id,
        service_name, duration_minutes, price_cents
      )
      select target_barbershop_id, a.id, s.id, s.name, s.duration_minutes, s.price_cents
      from public.appointments a
      cross join public.services s
      where a.barbershop_id = target_barbershop_id
        and a.recurrence_id = series_id
        and a.recurrence_position = position
        and s.id = any(selected_service_ids)
        and s.barbershop_id = target_barbershop_id
      order by array_position(selected_service_ids, s.id);
      inserted_count := inserted_count + 1;
      position := position + 1;
    end if;
    occurrence_date := occurrence_date + 1;
  end loop;

  return jsonb_build_object(
    'series_id', series_id,
    'created_count', inserted_count,
    'first_date', first_date,
    'end_date', end_date - 1
  );
end;
$$;

revoke all on function public.create_recurring_internal_appointments(uuid, uuid[], uuid, uuid, date, time, integer, integer, smallint[], text, boolean) from public, anon;
grant execute on function public.create_recurring_internal_appointments(uuid, uuid[], uuid, uuid, date, time, integer, integer, smallint[], text, boolean) to authenticated;
