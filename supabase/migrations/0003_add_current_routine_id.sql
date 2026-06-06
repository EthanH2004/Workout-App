-- Add the "current program" pointer to profiles (multi-day program model).
-- A "program" is a routines row; current_routine_id = the user's one active
-- program. null = no current program. ON DELETE SET NULL so deleting the routine
-- just clears the pointer. Additive: existing profiles default to null.
--
-- Applied to the remote project via the Supabase MCP (migration name:
-- add_current_routine_id). Kept here for version control.

alter table public.profiles
  add column if not exists current_routine_id uuid
    references public.routines (id) on delete set null;
