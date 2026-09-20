begin;
select plan(15);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner-a@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'owner-b@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'barber-a@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.barbershops (id, name, slug) values
  ('a0000000-0000-0000-0000-000000000001', 'Tenant A', 'tenant-a'),
  ('b0000000-0000-0000-0000-000000000002', 'Tenant B', 'tenant-b');
insert into public.memberships (id, barbershop_id, user_id, role) values
  ('a5000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'owner'),
  ('b5000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'owner'),
  ('a5000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'barber');
insert into public.barbers (id, barbershop_id, membership_id, display_name) values
  ('a1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a5000000-0000-0000-0000-000000000003', 'Barber A'),
  ('a1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', null, 'Barber A2'),
  ('b1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', null, 'Barber B');
insert into public.clients (id, barbershop_id, name, email) values
  ('a2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Client A', 'client-a@example.test'),
  ('a2000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Client A2', 'client-a2@example.test'),
  ('b2000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Client B', 'client-b@example.test');
insert into public.services (id, barbershop_id, name, duration_minutes, price_cents) values
  ('a3000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Cut A', 45, 4500),
  ('b3000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Cut B', 45, 4500);
insert into public.appointments (id, barbershop_id, barber_id, client_id, starts_at, ends_at) values
  ('a4000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', '2026-10-01 12:00:00+00', '2026-10-01 12:45:00+00'),
  ('a4000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000003', '2026-10-01 14:00:00+00', '2026-10-01 14:45:00+00'),
  ('b4000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000002', '2026-10-01 12:00:00+00', '2026-10-01 12:45:00+00');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select results_eq('select count(*) from public.barbershops', 'values (1::bigint)', 'Tenant A sees only its barbershop');
select results_eq('select count(*) from public.clients', 'values (2::bigint)', 'Tenant A sees only its clients');
select results_eq('select count(*) from public.appointments', 'values (2::bigint)', 'Tenant A sees only its appointments');
select results_eq($$select count(*) from public.clients where id = 'b2000000-0000-0000-0000-000000000002'$$, 'values (0::bigint)', 'Direct foreign tenant id is invisible');
select throws_ok($$insert into public.clients (barbershop_id, name) values ('b0000000-0000-0000-0000-000000000002', 'Forbidden')$$, '42501', null, 'Tenant A cannot insert into Tenant B');
select results_eq($$with changed as (update public.clients set name = 'Tampered' where id = 'b2000000-0000-0000-0000-000000000002' returning 1) select count(*) from changed$$, 'values (0::bigint)', 'Tenant A cannot update Tenant B');
select results_eq($$with removed as (delete from public.clients where id = 'b2000000-0000-0000-0000-000000000002' returning 1) select count(*) from removed$$, 'values (0::bigint)', 'Tenant A cannot delete Tenant B');
select throws_ok($$insert into public.appointments (barbershop_id, barber_id, client_id, starts_at, ends_at) values ('a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', '2026-10-01 12:20:00+00', '2026-10-01 13:00:00+00')$$, '23P01', null, 'Database prevents overlapping bookings');
select throws_ok($$select count(*) from public.booking_tokens$$, '42501', null, 'Sensitive booking tokens are inaccessible to members');

select throws_ok($$insert into public.appointments (barbershop_id, barber_id, client_id, starts_at, ends_at) values ('a0000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000001', '2026-10-01 12:20:00+00', '2026-10-01 12:40:00+00')$$, '23P01', null, 'Database prevents one client occupying two barbers at once');

select set_config('request.jwt.claims', '{"sub":"30000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select results_eq('select count(*) from public.appointments', 'values (1::bigint)', 'Barber sees only own appointments');
select results_eq('select count(*) from public.clients', 'values (1::bigint)', 'Barber sees only clients from own appointments');
select results_eq('select count(*) from public.memberships', 'values (1::bigint)', 'Barber sees only own membership');
select results_eq($$with changed as (update public.appointments set status = 'completed' where id = 'a4000000-0000-0000-0000-000000000001' returning 1) select count(*) from changed$$, 'values (1::bigint)', 'Barber can update own appointment');
select results_eq($$with changed as (update public.appointments set status = 'completed' where id = 'a4000000-0000-0000-0000-000000000003' returning 1) select count(*) from changed$$, 'values (0::bigint)', 'Barber cannot update another barber appointment');

select * from finish();
rollback;
