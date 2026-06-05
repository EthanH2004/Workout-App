-- Harden per Supabase security advisors (0014, 0028, 0029)
-- Applied via the Supabase MCP (migration name: harden_security).

-- 1) Move pg_trgm out of the public schema into the dedicated extensions schema
drop index if exists public.exercises_name_trgm_idx;
drop extension if exists pg_trgm;
create schema if not exists extensions;
create extension pg_trgm schema extensions;
create index exercises_name_trgm_idx
  on public.exercises using gin (name extensions.gin_trgm_ops);

-- 2) The signup trigger function must only ever run as a trigger, never be
--    callable through the REST API by the anon/authenticated roles.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
