create type public.notification_type as enum (
  'appointment_created', 'appointment_confirmed', 'appointment_cancelled',
  'appointment_upcoming', 'return_opportunity', 'system'
);
create type public.reminder_channel as enum ('email', 'web_push', 'whatsapp');
create type public.reminder_status as enum ('pending', 'processing', 'sent', 'failed', 'cancelled');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null,
  entity_type text,
  entity_id uuid,
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.reminder_configs (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  reminder_key text not null check (reminder_key ~ '^[a-z0-9_]+$'),
  minutes_before integer not null check (minutes_before between 15 and 10080),
  channel public.reminder_channel not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbershop_id, reminder_key, channel),
  unique (id, barbershop_id)
);

create table public.appointment_reminders (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  appointment_id uuid not null,
  config_id uuid,
  reminder_key text not null,
  channel public.reminder_channel not null,
  scheduled_for timestamptz not null,
  status public.reminder_status not null default 'pending',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  processing_started_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (appointment_id, channel, reminder_key, scheduled_for),
  foreign key (appointment_id, barbershop_id)
    references public.appointments(id, barbershop_id) on delete cascade,
  foreign key (config_id, barbershop_id)
    references public.reminder_configs(id, barbershop_id) on delete set null (config_id)
);

create table public.reminder_deliveries (
  id bigint generated always as identity primary key,
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  reminder_id uuid not null references public.appointment_reminders(id) on delete cascade,
  provider text not null,
  provider_message_id text,
  success boolean not null,
  error_code text,
  error_message text,
  attempted_at timestamptz not null default now()
);

create index notifications_user_unread_idx on public.notifications(user_id, created_at desc) where read_at is null;
create index notifications_tenant_created_idx on public.notifications(barbershop_id, created_at desc);
create index reminders_due_idx on public.appointment_reminders(scheduled_for, status) where status = 'pending';
create index reminder_deliveries_reminder_idx on public.reminder_deliveries(reminder_id, attempted_at desc);

create trigger reminder_configs_touch_updated_at
before update on public.reminder_configs
for each row execute function private.touch_updated_at();

create trigger appointment_reminders_touch_updated_at
before update on public.appointment_reminders
for each row execute function private.touch_updated_at();

create function private.add_default_reminder_configs()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.reminder_configs (barbershop_id, reminder_key, minutes_before, channel)
  values
    (new.id, '24h', 1440, 'email'),
    (new.id, '2h', 120, 'email');
  return new;
end;
$$;

create trigger barbershops_add_default_reminders
after insert on public.barbershops
for each row execute function private.add_default_reminder_configs();

insert into public.reminder_configs (barbershop_id, reminder_key, minutes_before, channel)
select b.id, defaults.reminder_key, defaults.minutes_before, 'email'::public.reminder_channel
from public.barbershops b
cross join (values ('24h', 1440), ('2h', 120)) as defaults(reminder_key, minutes_before)
on conflict (barbershop_id, reminder_key, channel) do nothing;

create function private.sync_appointment_reminders()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.appointment_reminders
  set status = 'cancelled', updated_at = now()
  where appointment_id = new.id
    and status in ('pending', 'processing')
    and (
      new.status not in ('pending', 'confirmed')
      or scheduled_for <> new.starts_at - make_interval(mins => (
        select rc.minutes_before from public.reminder_configs rc where rc.id = config_id
      ))
    );

  if new.status in ('pending', 'confirmed') then
    insert into public.appointment_reminders (
      barbershop_id, appointment_id, config_id, reminder_key, channel, scheduled_for
    )
    select
      new.barbershop_id, new.id, rc.id, rc.reminder_key, rc.channel,
      new.starts_at - make_interval(mins => rc.minutes_before)
    from public.reminder_configs rc
    where rc.barbershop_id = new.barbershop_id
      and rc.enabled
      and new.starts_at - make_interval(mins => rc.minutes_before) > now()
    on conflict (appointment_id, channel, reminder_key, scheduled_for) do nothing;
  end if;

  return new;
end;
$$;

create trigger appointments_sync_reminders
after insert or update of starts_at, status on public.appointments
for each row execute function private.sync_appointment_reminders();

create function public.claim_due_reminders(batch_size integer default 25)
returns setof public.appointment_reminders
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with due as (
    select ar.id
    from public.appointment_reminders ar
    where ar.status = 'pending'
      and ar.scheduled_for <= now()
      and ar.attempt_count < 5
    order by ar.scheduled_for
    for update skip locked
    limit greatest(1, least(batch_size, 100))
  )
  update public.appointment_reminders ar
  set status = 'processing',
      processing_started_at = now(),
      attempt_count = ar.attempt_count + 1,
      updated_at = now()
  from due
  where ar.id = due.id
  returning ar.*;
end;
$$;

revoke all on function public.claim_due_reminders(integer) from public, anon, authenticated;
grant execute on function public.claim_due_reminders(integer) to service_role;

alter table public.notifications enable row level security;
alter table public.reminder_configs enable row level security;
alter table public.appointment_reminders enable row level security;
alter table public.reminder_deliveries enable row level security;

create policy "members read notifications" on public.notifications for select to authenticated
using ((select private.is_barbershop_member(barbershop_id)) and (user_id is null or user_id = (select auth.uid())));
create policy "members create notifications" on public.notifications for insert to authenticated
with check ((select private.is_barbershop_member(barbershop_id)));
create policy "users mark notifications" on public.notifications for update to authenticated
using ((select private.is_barbershop_member(barbershop_id)) and (user_id is null or user_id = (select auth.uid())))
with check ((select private.is_barbershop_member(barbershop_id)) and (user_id is null or user_id = (select auth.uid())));

create policy "members read reminder configs" on public.reminder_configs for select to authenticated
using ((select private.is_barbershop_member(barbershop_id)));
create policy "managers insert reminder configs" on public.reminder_configs for insert to authenticated
with check ((select private.has_barbershop_role(barbershop_id, array['owner','manager']::public.member_role[])));
create policy "managers update reminder configs" on public.reminder_configs for update to authenticated
using ((select private.has_barbershop_role(barbershop_id, array['owner','manager']::public.member_role[])))
with check ((select private.has_barbershop_role(barbershop_id, array['owner','manager']::public.member_role[])));
create policy "managers delete reminder configs" on public.reminder_configs for delete to authenticated
using ((select private.has_barbershop_role(barbershop_id, array['owner','manager']::public.member_role[])));

create policy "members read reminders" on public.appointment_reminders for select to authenticated
using ((select private.is_barbershop_member(barbershop_id)));
create policy "members read reminder deliveries" on public.reminder_deliveries for select to authenticated
using ((select private.is_barbershop_member(barbershop_id)));

revoke all on public.notifications, public.reminder_configs, public.appointment_reminders, public.reminder_deliveries from anon, authenticated;
grant select, insert, update on public.notifications to authenticated;
grant select, insert, update, delete on public.reminder_configs to authenticated;
grant select on public.appointment_reminders, public.reminder_deliveries to authenticated;
grant usage, select on all sequences in schema public to authenticated;
