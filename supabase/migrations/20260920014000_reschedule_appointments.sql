create function public.reschedule_appointment(
  target_barbershop_id uuid,
  target_appointment_id uuid,
  local_starts_at timestamp
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  shop_timezone text;
  current_duration interval;
  utc_starts_at timestamptz;
begin
  if not (select private.is_barbershop_member(target_barbershop_id)) then
    raise exception 'not authorized';
  end if;

  select b.timezone, a.ends_at - a.starts_at
    into shop_timezone, current_duration
  from public.appointments a
  join public.barbershops b on b.id = a.barbershop_id
  where a.id = target_appointment_id
    and a.barbershop_id = target_barbershop_id;

  if shop_timezone is null or current_duration is null then
    raise exception 'appointment unavailable';
  end if;

  utc_starts_at := local_starts_at at time zone shop_timezone;

  update public.appointments
  set starts_at = utc_starts_at,
      ends_at = utc_starts_at + current_duration
  where id = target_appointment_id
    and barbershop_id = target_barbershop_id;
end;
$$;

revoke all on function public.reschedule_appointment(uuid, uuid, timestamp) from public, anon;
grant execute on function public.reschedule_appointment(uuid, uuid, timestamp) to authenticated;
