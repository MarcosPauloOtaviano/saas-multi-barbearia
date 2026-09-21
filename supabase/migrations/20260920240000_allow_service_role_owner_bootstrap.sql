-- The one-time owner bootstrap is intentionally callable only by service_role.
-- It needs schema USAGE in addition to EXECUTE on the private function.
grant usage on schema private to service_role;
