# Data Model — Workout Tracker (v1)

**Document:** 3 of 6 (Data / Schema)
**Status:** Draft for review
**Scope:** The database schema for the app described in the PRD, built on **Supabase (Postgres)**. Defines tables, relationships, row-level security, indexes, and how the schema supports offline-first logging. It does not cover UI layout (doc #4) or app architecture (doc #5).

---

## 1. Principles

These decisions shape the whole schema, so they're stated up front:

1. **One source of truth per fact.** Derived values (estimated 1RM, total volume, PRs) are **computed, never stored**, so they can never go stale. We store only the raw sets (weight + reps).
2. **Canonical units.** Weight is stored in **one canonical unit (kilograms)** as a number, and converted to lb/kg only for display based on the user's preference. This keeps charts and PRs comparable even if a user switches units. *(See decision D1.)*
3. **History is immutable to edits elsewhere.** A logged workout snapshots the names it needs (workout day name, exercise name) at the time it happened, so renaming or deleting a routine later never corrupts past history.
4. **Offline-first friendly.** Every row's primary key is a **UUID generated on the client**, so a row created offline has a permanent ID with no server round-trip. Every table carries `updated_at` (for last-write-wins sync) and a soft-delete `deleted_at` (so deletions sync instead of vanishing). This matches the PRD's "store locally, push when reconnected" model.
5. **Security at the row level.** Every user-owned table carries an `owner_id`, and Row-Level Security ensures a user can only ever touch their own rows. `owner_id` is denormalized onto every table (rather than inferred through joins) so each RLS policy stays a simple, fast `owner_id = auth.uid()`.

---

## 2. Entities at a glance

```
auth.users (Supabase)
   └─ profiles (1:1)

profiles ──< routines ──< routine_days ──< routine_day_exercises >── exercises
profiles ──< workout_sessions ──< session_exercises ──< session_sets
                                        │
                                        └── (references) exercises
profiles ──< exercises   (custom exercises only; built-ins have no owner)
```

- A **routine** is a plan (e.g. "Push/Pull/Legs"). It has one or more **routine_days** (Push, Pull, Legs). Each day has ordered **routine_day_exercises** (the planned exercises with target sets/reps).
- Running a workout creates a **workout_session**, which holds **session_exercises**, each holding the logged **session_sets**.
- The **exercises** catalog holds both built-in exercises (no owner, visible to everyone) and a user's custom exercises (owned, private).

---

## 3. Tables

Common columns on every table below (omitted from each list for brevity): `id uuid PK`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`, `deleted_at timestamptz null`.

### 3.1 `profiles`
Mirrors `auth.users` one-to-one; created on signup via a trigger.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Equals `auth.users.id` |
| `display_name` | text null | |
| `unit_preference` | text | `'lb'` or `'kg'`, default `'lb'` (PRD default) |

### 3.2 `exercises`
The catalog. Built-in rows seeded from an open exercise dataset; custom rows owned by a user.

| Column | Type | Notes |
|---|---|---|
| `owner_id` | uuid null | `null` = built-in (global); set = a user's custom exercise |
| `name` | text | e.g. "Bench Press (Barbell)" |
| `category` | text | Muscle group, e.g. "Chest" |
| `equipment` | text | `barbell / dumbbell / machine / cable / kettlebell / bodyweight / band / plate` — drives the icon |
| `is_custom` | boolean | default false |

### 3.3 `routines`
A training plan owned by a user. Prebuilt standard routines are **copied** into a user's account when adopted (see decision D2), so the user always edits their own copy.

| Column | Type | Notes |
|---|---|---|
| `owner_id` | uuid | |
| `name` | text | e.g. "Push / Pull / Legs" |
| `position` | int | Ordering in the user's routine list |

### 3.4 `routine_days`
A named day within a routine (Push, Pull, Legs). A single-day plan (Full Body) just has one.

| Column | Type | Notes |
|---|---|---|
| `owner_id` | uuid | Denormalized for RLS |
| `routine_id` | uuid FK → routines | `on delete cascade` |
| `name` | text | e.g. "Push" |
| `position` | int | Order of the day within the routine |

### 3.5 `routine_day_exercises`
The planned exercises for a day, with targets.

| Column | Type | Notes |
|---|---|---|
| `owner_id` | uuid | Denormalized for RLS |
| `routine_day_id` | uuid FK → routine_days | `on delete cascade` |
| `exercise_id` | uuid FK → exercises | |
| `position` | int | Order within the day |
| `target_sets` | int | |
| `target_reps` | int | |

### 3.6 `workout_sessions`
One logged workout instance.

| Column | Type | Notes |
|---|---|---|
| `owner_id` | uuid | |
| `routine_day_id` | uuid null FK → routine_days | The day run; `null` if ad-hoc or if the day was later deleted |
| `name` | text | **Snapshot** of the day name at log time (e.g. "Push day") so history survives routine edits |
| `started_at` | timestamptz | |
| `ended_at` | timestamptz null | Set on finish |

### 3.7 `session_exercises`
An exercise performed within a session.

| Column | Type | Notes |
|---|---|---|
| `owner_id` | uuid | |
| `session_id` | uuid FK → workout_sessions | `on delete cascade` |
| `exercise_id` | uuid FK → exercises | |
| `exercise_name` | text | **Snapshot** of the exercise name at log time (history integrity) |
| `position` | int | Order within the session |

### 3.8 `session_sets`
Each logged set. This is the core data the whole app produces.

| Column | Type | Notes |
|---|---|---|
| `owner_id` | uuid | |
| `session_exercise_id` | uuid FK → session_exercises | `on delete cascade` |
| `set_index` | int | 1, 2, 3 … within the exercise |
| `weight_kg` | numeric(7,3) | Canonical kilograms (display converts) |
| `reps` | int | |
| `completed` | boolean | default false; the check-off |
| `logged_at` | timestamptz | |

---

## 4. Row-Level Security (RLS)

Enable RLS on every table. Policies:

- **`profiles`** — a user can select/update only the row where `id = auth.uid()`.
- **`exercises`** —
  - SELECT: `owner_id is null OR owner_id = auth.uid()` (everyone sees built-ins; you see your own customs).
  - INSERT / UPDATE / DELETE: `owner_id = auth.uid()` (you can only touch your own customs; built-ins are read-only).
- **All other tables** — every command checked against `owner_id = auth.uid()`. Because `owner_id` is denormalized onto each table, no joins are needed in the policy.

Writes should also verify the parent relationship in app logic (e.g. a `session_set` references a `session_exercise` you own), but the `owner_id` check is the hard security boundary.

---

## 5. Indexes

- FK columns: `routine_days.routine_id`, `routine_day_exercises.routine_day_id`, `session_exercises.session_id`, `session_sets.session_exercise_id`.
- `workout_sessions (owner_id, started_at desc)` — for history lists and recent-workout lookups.
- `session_exercises (exercise_id)` and a path to `session_sets` — for the per-exercise progress charts and "last time" lookups, which query "all sets for this exercise, newest first."
- `exercises (owner_id)` and a text index on `exercises.name` for catalog search.
- Partial indexes excluding `deleted_at is not null` where lists are hot.

---

## 6. How the schema serves key features

- **"Last time" target on the set row:** find the most recent `session_exercise` for this `exercise_id` owned by the user, read its `session_sets`. The snapshot columns and indexes make this a fast, single lookup.
- **Estimated 1RM chart:** pull all `session_sets` for an exercise, compute Epley (`weight × (1 + reps/30)`) per session at query/app time, plot. Nothing stored.
- **Total volume:** sum `weight_kg × reps` over a session or week, computed on read.
- **PRs:** max computed metric per exercise, computed on read (can be cached later if needed, but not stored in v1).
- **Offline:** client mints UUIDs and writes locally; on reconnect, rows push up; `updated_at` resolves order and `deleted_at` carries deletions. No multi-device merge in v1 (per PRD).

---

## 7. Open decisions (flagged for you)

- **D1 — Unit storage.** Recommending canonical **kilograms** stored, converted for display. Tradeoff: a lb user's 135 round-trips through kg, so use `numeric(7,3)` precision and round to the nearest plate increment (0.5 lb / 0.25 kg) only for *display*. Alternative is storing the entered value plus a unit column, which avoids any rounding but complicates every chart and comparison. I'd keep canonical kg unless you have a reason not to.
- **D2 — Prebuilt routines.** Recommending they're **copied into the user's account on adoption** (so the user owns and can edit their copy), rather than referenced as shared rows. Seed the originals as a small set of templates (can live as `owner_id is null` template rows or in seed code).
- **D3 — Snapshots vs live references.** I've added `name` snapshots on sessions and `exercise_name` on session_exercises so history is never broken by later edits/deletes. This duplicates a little data on purpose. Confirm you're good with that (I recommend it).

---

*Next: doc #4 (UI / screen spec) and doc #5 (architecture), then the build plan.*
