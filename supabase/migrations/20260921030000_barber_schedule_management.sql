-- A manager/owner can replace one barber's weekly schedule atomically.
create or replace function public.save_barber_schedule(
  target_barbershop_id uuid,
  target_barber_id uuid,
  schedule jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item record;
begin
  if not (select private.has_barbershop_role(
    target_barbershop_id,
    array['owner','manager']::public.member_role[]
  )) then
    raise exception 'not authorized';
  end if;

  if not exists (
    select 1 from public.barbers
    where id = target_barber_id and barbershop_id = target_barbershop_id
  ) then
    raise exception 'barber unavailable';
  end if;

  delete from public.working_hours
  where barbershop_id = target_barbershop_id
    and barber_id = target_barber_id;

  for item in
    select *
    from jsonb_to_recordset(coalesce(schedule, '[]'::jsonb)) as row_item(
      weekday smallint,
      starts_at time,
      ends_at time,
      active boolean
    )
  loop
    if item.active is true then
      if item.weekday not between 0 and 6 or item.starts_at is null or item.ends_at is null or item.ends_at <= item.starts_at then
        raise exception 'invalid schedule';
      end if;
      insert into public.working_hours (
        barbershop_id, barber_id, weekday, starts_at, ends_at, active
      ) values (
        target_barbershop_id, target_barber_id, item.weekday,
        item.starts_at, item.ends_at, true
      );
    end if;
  end loop;
end;
$$;

revoke all on function public.save_barber_schedule(uuid, uuid, jsonb) from public, anon;
grant execute on function public.save_barber_schedule(uuid, uuid, jsonb) to authenticated;

-- New barber profiles start with a practical default and can be customized
-- immediately by the establishment administrator.
create or replace function private.seed_barber_working_hours()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.working_hours (
    barbershop_id, barber_id, weekday, starts_at, ends_at, active
  )
  select new.barbershop_id, new.id, day_number, time '09:00', time '18:00', true
  from generate_series(1, 6) as day_number
  on conflict (barber_id, weekday, starts_at) do nothing;
  return new;
end;
$$;

revoke all on function private.seed_barber_working_hours() from public, anon, authenticated;

drop trigger if exists barbers_seed_working_hours on public.barbers;
create trigger barbers_seed_working_hours
after insert on public.barbers
for each row execute function private.seed_barber_working_hours();

insert into public.working_hours (
  barbershop_id, barber_id, weekday, starts_at, ends_at, active
)
select b.barbershop_id, b.id, day_number, time '09:00', time '18:00', true
from public.barbers b
cross join generate_series(1, 6) as day_number
where b.active
on conflict (barber_id, weekday, starts_at) do nothing;
