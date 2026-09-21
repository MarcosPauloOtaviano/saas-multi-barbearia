-- Edge Functions and the one-time bootstrap use the server-only service_role
-- key. Keep these grants off anon/authenticated while allowing backend CRUD.
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select, update on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
