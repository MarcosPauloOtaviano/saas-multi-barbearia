-- Only triggers perform reminder writes. Authenticated users keep SELECT only.
alter function private.sync_appointment_reminders() security definer;
revoke all on function private.sync_appointment_reminders() from public,anon,authenticated;

-- New shops must explicitly set their operating days before accepting bookings.
create function private.seed_shop_hours() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.shop_hours(barbershop_id,weekday,active)
  select new.id,n,false from generate_series(0,6)n;
  return new;
end;
$$;
revoke all on function private.seed_shop_hours() from public,anon,authenticated;
create trigger barbershops_seed_hours after insert on public.barbershops for each row execute function private.seed_shop_hours();

create or replace function private.seed_barber_working_hours() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.working_hours(barbershop_id,barber_id,weekday,starts_at,ends_at,active)
  select new.barbershop_id,new.id,weekday,starts_at,ends_at,active
  from public.shop_hours where barbershop_id=new.barbershop_id;
  return new;
end;
$$;
