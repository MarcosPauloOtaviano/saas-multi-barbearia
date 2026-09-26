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
  appointment_notes text default null
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
  if not (select private.is_barbershop_member(target_barbershop_id)) then
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

  -- Serialize recurring creation for the same chair/client. The exclusion
  -- constraints remain the final race guard for concurrent requests.
  perform pg_advisory_xact_lock(hashtextextended(
    target_barbershop_id::text || ':' || selected_barber_id::text || ':' || selected_client_id::text, 0
  ));

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

revoke all on function public.create_recurring_internal_appointments(uuid, uuid[], uuid, uuid, date, time, integer, integer, smallint[], text) from public, anon;
grant execute on function public.create_recurring_internal_appointments(uuid, uuid[], uuid, uuid, date, time, integer, integer, smallint[], text) to authenticated;

