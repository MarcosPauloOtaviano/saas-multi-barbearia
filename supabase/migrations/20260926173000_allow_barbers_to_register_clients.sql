-- Barbers can register a client while creating their own internal appointment.
-- Client reads remain scoped to clients with an appointment assigned to that barber.
drop policy if exists "front desk creates clients" on public.clients;

create policy "staff creates clients" on public.clients for insert to authenticated
with check ((select private.has_barbershop_role(
  barbershop_id,
  array['owner','manager','barber','receptionist']::public.member_role[]
)));
