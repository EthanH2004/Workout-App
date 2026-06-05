-- Workout Tracker — initial schema (M1)
-- Source of truth: docs/Workout-Tracker-Data-Model.md
-- Decisions: D1 canonical kilograms, D2 copy-on-adopt routines, D3 history name
-- snapshots. RLS on every table; owner_id = auth.uid() is the hard boundary.
--
-- Applied to the remote project via the Supabase MCP (migration name: init_schema).
-- Kept here for version control / reproducibility.

create extension if not exists pg_trgm;

-- profiles (1:1 with auth.users; created on signup via trigger) -------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  unit_preference text not null default 'lb' check (unit_preference in ('lb', 'kg')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- exercises (built-ins: owner_id null; customs: owned) -----------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade,
  name text not null,
  category text,
  equipment text check (equipment in (
    'barbell','dumbbell','machine','cable','kettlebell','bodyweight','band','plate'
  )),
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- routines -------------------------------------------------------------------
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- routine_days ---------------------------------------------------------------
create table public.routine_days (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  routine_id uuid not null references public.routines (id) on delete cascade,
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- routine_day_exercises ------------------------------------------------------
create table public.routine_day_exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  routine_day_id uuid not null references public.routine_days (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  position int not null default 0,
  target_sets int,
  target_reps int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- workout_sessions -----------------------------------------------------------
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  routine_day_id uuid references public.routine_days (id) on delete set null,
  name text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- session_exercises ----------------------------------------------------------
create table public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  exercise_name text not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- session_sets ---------------------------------------------------------------
create table public.session_sets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  session_exercise_id uuid not null references public.session_exercises (id) on delete cascade,
  set_index int not null,
  weight_kg numeric(7,3),
  reps int,
  completed boolean not null default false,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Indexes --------------------------------------------------------------------
create index exercises_owner_id_idx on public.exercises (owner_id);
create index exercises_name_trgm_idx on public.exercises using gin (name gin_trgm_ops);
create index routines_owner_id_idx on public.routines (owner_id) where deleted_at is null;
create index routine_days_routine_id_idx on public.routine_days (routine_id) where deleted_at is null;
create index rde_routine_day_id_idx on public.routine_day_exercises (routine_day_id) where deleted_at is null;
create index workout_sessions_owner_started_idx on public.workout_sessions (owner_id, started_at desc) where deleted_at is null;
create index session_exercises_session_id_idx on public.session_exercises (session_id) where deleted_at is null;
create index session_exercises_exercise_id_idx on public.session_exercises (exercise_id);
create index session_sets_session_exercise_id_idx on public.session_sets (session_exercise_id) where deleted_at is null;

-- Row-Level Security ---------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_days enable row level security;
alter table public.routine_day_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.session_sets enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "exercises_select" on public.exercises
  for select using (owner_id is null or owner_id = (select auth.uid()));
create policy "exercises_insert" on public.exercises
  for insert with check (owner_id = (select auth.uid()));
create policy "exercises_update" on public.exercises
  for update using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "exercises_delete" on public.exercises
  for delete using (owner_id = (select auth.uid()));

create policy "routines_all" on public.routines
  for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "routine_days_all" on public.routine_days
  for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "routine_day_exercises_all" on public.routine_day_exercises
  for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "workout_sessions_all" on public.workout_sessions
  for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "session_exercises_all" on public.session_exercises
  for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "session_sets_all" on public.session_sets
  for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- Profile creation on signup (security definer bypasses RLS for the insert) --
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, unit_preference)
  values (new.id, 'lb');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
