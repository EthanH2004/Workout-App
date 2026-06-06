-- 0005: account self-deletion (Apple App Store Guideline 5.1.1).
--
-- delete_user() permanently removes the calling user's data and their
-- auth.users row. It is SECURITY DEFINER so it can delete from auth.users, and
-- is scoped to auth.uid() so a caller can only ever delete themselves — the
-- service-role key never goes near the client. Every owner_id FK is already
-- ON DELETE CASCADE from auth.users (so deleting the auth row alone would
-- suffice), but we delete owned rows explicitly first, child → parent, for
-- clarity and defence-in-depth, then remove the auth identity.

create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.session_sets where owner_id = uid;
  delete from public.session_exercises where owner_id = uid;
  delete from public.workout_sessions where owner_id = uid;
  delete from public.routine_day_exercises where owner_id = uid;
  delete from public.routine_days where owner_id = uid;
  delete from public.routines where owner_id = uid;
  delete from public.exercises where owner_id = uid; -- custom exercises only (globals have owner_id null)
  delete from public.profiles where id = uid;

  delete from auth.users where id = uid; -- removes the identity; cascades anything not deleted above
end;
$$;

-- Only a signed-in user can delete themselves.
revoke all on function public.delete_user() from public, anon;
grant execute on function public.delete_user() to authenticated;
