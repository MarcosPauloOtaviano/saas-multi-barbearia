-- Keep every active service available to every active professional in the same
-- shop. The triggers run privately so the owner does not need a second client
-- round-trip that can be blocked by RLS or interrupted on a phone.
create or replace function private.attach_service_to_barbers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.barber_services (barbershop_id, barber_id, service_id)
  select new.barbershop_id, b.id, new.id
  from public.barbers b
  where b.barbershop_id = new.barbershop_id
    and b.active
  on conflict (barber_id, service_id) do nothing;
  return new;
end;
$$;

create or replace function private.attach_active_services_to_barber()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.barber_services (barbershop_id, barber_id, service_id)
  select new.barbershop_id, new.id, s.id
  from public.services s
  where s.barbershop_id = new.barbershop_id
    and s.active
  on conflict (barber_id, service_id) do nothing;
  return new;
end;
$$;

revoke all on function private.attach_service_to_barbers() from public, anon, authenticated;
revoke all on function private.attach_active_services_to_barber() from public, anon, authenticated;

drop trigger if exists services_attach_to_barbers on public.services;
create trigger services_attach_to_barbers
after insert on public.services
for each row execute function private.attach_service_to_barbers();

drop trigger if exists barbers_attach_to_services on public.barbers;
create trigger barbers_attach_to_services
after insert on public.barbers
for each row execute function private.attach_active_services_to_barber();

insert into public.barber_services (barbershop_id, barber_id, service_id)
select s.barbershop_id, b.id, s.id
from public.services s
join public.barbers b on b.barbershop_id = s.barbershop_id and b.active
where s.active
on conflict (barber_id, service_id) do nothing;
