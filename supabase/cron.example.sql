-- Run only after storing `cron_secret` in private.cron_secrets and replacing
-- the project URL below. The current Free project does not expose Vault.
-- This file is operational documentation, not an automatic migration.
select cron.schedule(
  'process-appointment-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/process-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select secret from private.cron_secrets where key = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
