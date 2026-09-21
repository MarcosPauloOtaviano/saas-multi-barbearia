-- Appointment lifecycle: a booking can only be closed after its scheduled end.
-- The database owns this rule so UI changes or direct API calls cannot close a
-- future booking. A cron job moves finished active bookings to completed every
-- minute; staff can then correct a missed visit to no_show without deleting it.

create extension if not exists pg_cron;

-- Repair records created by the previous UI that were marked completed before
-- their scheduled end. They return to the normal confirmed state; no history
-- or client record is deleted.
update public.appointments
set status = 'confirmed'::public.appointment_status,
    completed_at = null,
    cancellation_reason = null,
    updated_at = now()
where status = 'completed'::public.appointment_status
  and ends_at > now();

create or replace function private.prevent_premature_appointment_closure()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('completed'::public.appointment_status, 'no_show'::public.appointment_status)
     and new.ends_at > now() then
    raise exception 'appointment_not_finished'
      using errcode = '22023',
            hint = 'Aguarde o término do horário agendado para encerrar o atendimento.';
  end if;

  -- Closed records remain closed, except for the intentional correction from
  -- an automatic completion to no_show made by the assigned professional or a
  -- manager through the protected RPC below.
  if old.status in (
      'cancelled_by_client'::public.appointment_status,
      'cancelled_by_shop'::public.appointment_status,
      'no_show'::public.appointment_status
    )
    and (
      new.status <> old.status
      or new.starts_at is distinct from old.starts_at
      or new.ends_at is distinct from old.ends_at
    ) then
    raise exception 'appointment_already_closed'
      using errcode = '22023';
  end if;

  if old.status = 'completed'::public.appointment_status
     and (
       new.status not in (
         'completed'::public.appointment_status,
         'no_show'::public.appointment_status
       )
       or new.starts_at is distinct from old.starts_at
       or new.ends_at is distinct from old.ends_at
     ) then
    raise exception 'appointment_already_closed'
      using errcode = '22023';
  end if;

  if new.status = 'completed'::public.appointment_status
     and new.completed_at is null then
    new.completed_at = now();
  end if;

  if new.status = 'no_show'::public.appointment_status then
    new.completed_at = null;
    new.cancellation_reason = coalesce(nullif(trim(new.cancellation_reason), ''), 'Atendimento não realizado');
  end if;

  return new;
end;
$$;

revoke all on function private.prevent_premature_appointment_closure() from public, anon, authenticated;

drop trigger if exists appointments_prevent_premature_closure on public.appointments;
create trigger appointments_prevent_premature_closure
before update of status, starts_at, ends_at, completed_at, cancellation_reason
on public.appointments
for each row execute function private.prevent_premature_appointment_closure();

create or replace function public.complete_appointment(
  target_barbershop_id uuid,
  target_appointment_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  appointment_row public.appointments;
  allowed_staff boolean;
begin
  allowed_staff := (select private.has_barbershop_role(
    target_barbershop_id,
    array['owner', 'manager']::public.member_role[]
  ));

  if not allowed_staff and not (select private.is_barbershop_member(target_barbershop_id)) then
    raise exception 'not authorized';
  end if;

  select * into appointment_row
  from public.appointments
  where id = target_appointment_id
    and barbershop_id = target_barbershop_id
  for update;

  if appointment_row.id is null then
    raise exception 'appointment unavailable';
  end if;

  if not allowed_staff and not (select private.is_own_barber(
    target_barbershop_id,
    appointment_row.barber_id
  )) then
    raise exception 'not authorized';
  end if;

  if appointment_row.ends_at > now() then
    raise exception 'appointment_not_finished'
      using errcode = '22023',
            hint = 'Aguarde o término do horário agendado para encerrar o atendimento.';
  end if;

  if appointment_row.status in (
      'cancelled_by_client'::public.appointment_status,
      'cancelled_by_shop'::public.appointment_status,
      'no_show'::public.appointment_status,
      'completed'::public.appointment_status
    ) then
    raise exception 'appointment_already_closed'
      using errcode = '22023';
  end if;

  update public.appointments
  set status = 'completed'::public.appointment_status,
      completed_at = coalesce(completed_at, now()),
      updated_at = now()
  where id = target_appointment_id
    and barbershop_id = target_barbershop_id;
end;
$$;

revoke all on function public.complete_appointment(uuid, uuid) from public, anon;
grant execute on function public.complete_appointment(uuid, uuid) to authenticated;

create or replace function public.mark_appointment_no_show(
  target_barbershop_id uuid,
  target_appointment_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  appointment_row public.appointments;
  allowed_staff boolean;
begin
  allowed_staff := (select private.has_barbershop_role(
    target_barbershop_id,
    array['owner', 'manager']::public.member_role[]
  ));

  if not allowed_staff and not (select private.is_barbershop_member(target_barbershop_id)) then
    raise exception 'not authorized';
  end if;

  select * into appointment_row
  from public.appointments
  where id = target_appointment_id
    and barbershop_id = target_barbershop_id
  for update;

  if appointment_row.id is null then
    raise exception 'appointment unavailable';
  end if;

  if not allowed_staff and not (select private.is_own_barber(
    target_barbershop_id,
    appointment_row.barber_id
  )) then
    raise exception 'not authorized';
  end if;

  if appointment_row.ends_at > now() then
    raise exception 'appointment_not_finished'
      using errcode = '22023',
            hint = 'Aguarde o término do horário agendado para informar que não houve atendimento.';
  end if;

  if appointment_row.status in (
      'cancelled_by_client'::public.appointment_status,
      'cancelled_by_shop'::public.appointment_status,
      'no_show'::public.appointment_status
    ) then
    raise exception 'appointment_already_closed'
      using errcode = '22023';
  end if;

  update public.appointments
  set status = 'no_show'::public.appointment_status,
      completed_at = null,
      cancellation_reason = 'Atendimento não realizado',
      updated_at = now()
  where id = target_appointment_id
    and barbershop_id = target_barbershop_id;
end;
$$;

revoke all on function public.mark_appointment_no_show(uuid, uuid) from public, anon;
grant execute on function public.mark_appointment_no_show(uuid, uuid) to authenticated;

create or replace function private.auto_complete_finished_appointments()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  completed_count integer;
begin
  update public.appointments
  set status = 'completed'::public.appointment_status,
      completed_at = coalesce(completed_at, ends_at),
      updated_at = now()
  where status in (
      'pending'::public.appointment_status,
      'confirmed'::public.appointment_status,
      'in_progress'::public.appointment_status
    )
    and ends_at <= now();

  get diagnostics completed_count = row_count;
  return completed_count;
end;
$$;

revoke all on function private.auto_complete_finished_appointments() from public, anon, authenticated, service_role;

-- Keep one idempotent job for every production deployment. Supabase Cron runs
-- this SQL as the database owner, so no service key is exposed to the client.
do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id from cron.job where jobname = 'barberflow-auto-complete';
  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
  perform cron.schedule(
    'barberflow-auto-complete',
    '* * * * *',
    $cron$select private.auto_complete_finished_appointments();$cron$
  );
end;
$$;
