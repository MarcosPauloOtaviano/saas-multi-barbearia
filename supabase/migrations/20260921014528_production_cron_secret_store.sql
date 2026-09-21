-- Vault is not available on the current Free project, so keep the cron
-- credential in an unexposed schema with no Data API privileges.
create table if not exists private.cron_secrets (
  key text primary key,
  secret text not null,
  updated_at timestamptz not null default now()
);

revoke all on table private.cron_secrets from public, anon, authenticated, service_role;
