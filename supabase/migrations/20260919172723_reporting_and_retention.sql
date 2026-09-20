create type public.privacy_request_status as enum ('requested', 'processing', 'completed', 'rejected');

create table public.retention_settings (
  barbershop_id uuid primary key references public.barbershops(id) on delete cascade,
  inactive_client_months integer not null default 36 check (inactive_client_months between 6 and 120),
  audit_log_months integer not null default 24 check (audit_log_months between 6 and 120),
  reminder_delivery_months integer not null default 12 check (reminder_delivery_months between 3 and 60),
  updated_at timestamptz not null default now()
);

create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  client_id uuid not null,
  request_type text not null check (request_type in ('export', 'correction', 'deletion')),
  status public.privacy_request_status not null default 'requested',
  requested_by uuid references auth.users(id) on delete set null,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (client_id, barbershop_id)
    references public.clients(id, barbershop_id)
);

create index privacy_requests_tenant_status_idx on public.privacy_requests(barbershop_id, status, created_at);

create trigger privacy_requests_touch_updated_at
before update on public.privacy_requests
for each row execute function private.touch_updated_at();

create function private.add_default_retention_settings()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.retention_settings (barbershop_id) values (new.id)
  on conflict (barbershop_id) do nothing;
  return new;
end;
$$;

create trigger barbershops_add_default_retention_settings
after insert on public.barbershops
for each row execute function private.add_default_retention_settings();

create function private.log_appointment_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status or old.starts_at is distinct from new.starts_at then
    insert into public.audit_logs (
      barbershop_id, actor_user_id, action, entity_type, entity_id, metadata
    ) values (
      new.barbershop_id,
      (select auth.uid()),
      case when tg_op = 'INSERT' then 'appointment.created' else 'appointment.changed' end,
      'appointment',
      new.id,
      jsonb_build_object(
        'status', new.status,
        'starts_at', new.starts_at,
        'previous_status', case when tg_op = 'UPDATE' then old.status else null end,
        'source', new.source
      )
    );
  end if;
  return new;
end;
$$;

revoke all on function private.log_appointment_change() from public;

create trigger appointments_audit_change
after insert or update of status, starts_at on public.appointments
for each row execute function private.log_appointment_change();

create view public.appointment_facts
with (security_invoker = true)
as
select
  a.id,
  a.barbershop_id,
  a.barber_id,
  a.client_id,
  a.starts_at,
  a.ends_at,
  a.status,
  a.source,
  coalesce(sum(s.price_cents), 0)::bigint as estimated_revenue_cents,
  coalesce(sum(s.duration_minutes), 0)::bigint as booked_minutes,
  string_agg(s.service_name, ', ' order by s.service_name) as service_names
from public.appointments a
left join public.appointment_services s on s.appointment_id = a.id
group by a.id;

create view public.client_return_opportunities
with (security_invoker = true)
as
with completed as (
  select
    a.barbershop_id,
    a.client_id,
    a.starts_at,
    lag(a.starts_at) over (
      partition by a.barbershop_id, a.client_id order by a.starts_at
    ) as previous_at
  from public.appointments a
  where a.status = 'completed'
), habits as (
  select
    barbershop_id,
    client_id,
    max(starts_at) as last_visit_at,
    count(*) as completed_visits,
    greatest(
      7,
      least(120, round(avg(extract(epoch from (starts_at - previous_at)) / 86400.0))::integer)
    ) as average_return_days
  from completed
  group by barbershop_id, client_id
)
select
  h.barbershop_id,
  h.client_id,
  c.name as client_name,
  c.phone,
  c.email,
  h.last_visit_at,
  h.completed_visits,
  h.average_return_days,
  h.last_visit_at + make_interval(days => h.average_return_days) as expected_return_at,
  (current_date - (h.last_visit_at + make_interval(days => h.average_return_days))::date) as overdue_days
from habits h
join public.clients c on c.id = h.client_id and c.active
where h.completed_visits >= 2
  and h.last_visit_at + make_interval(days => h.average_return_days) <= now()
  and not exists (
    select 1 from public.appointments upcoming
    where upcoming.client_id = h.client_id
      and upcoming.starts_at > now()
      and upcoming.status in ('pending', 'confirmed')
  );

alter table public.retention_settings enable row level security;
alter table public.privacy_requests enable row level security;

create policy "managers read retention settings" on public.retention_settings for select to authenticated
using ((select private.has_barbershop_role(barbershop_id, array['owner','manager']::public.member_role[])));
create policy "managers insert retention settings" on public.retention_settings for insert to authenticated
with check ((select private.has_barbershop_role(barbershop_id, array['owner','manager']::public.member_role[])));
create policy "managers update retention settings" on public.retention_settings for update to authenticated
using ((select private.has_barbershop_role(barbershop_id, array['owner','manager']::public.member_role[])))
with check ((select private.has_barbershop_role(barbershop_id, array['owner','manager']::public.member_role[])));

create policy "managers read privacy requests" on public.privacy_requests for select to authenticated
using ((select private.has_barbershop_role(barbershop_id, array['owner','manager']::public.member_role[])));
create policy "managers create privacy requests" on public.privacy_requests for insert to authenticated
with check ((select private.has_barbershop_role(barbershop_id, array['owner','manager']::public.member_role[])));
create policy "managers update privacy requests" on public.privacy_requests for update to authenticated
using ((select private.has_barbershop_role(barbershop_id, array['owner','manager']::public.member_role[])))
with check ((select private.has_barbershop_role(barbershop_id, array['owner','manager']::public.member_role[])));

revoke all on public.retention_settings, public.privacy_requests from anon, authenticated;
grant select, insert, update on public.retention_settings, public.privacy_requests to authenticated;
grant select on public.appointment_facts, public.client_return_opportunities to authenticated;

insert into public.retention_settings (barbershop_id)
select id from public.barbershops
on conflict (barbershop_id) do nothing;
