-- Seed the global exercise catalog (45 lifts) as built-ins: owner_id null,
-- is_custom false. `category` holds the muscle group and `equipment` the icon
-- key, both lowercase to match the app's Muscle / Equipment unions
-- (exerciseCatalog.ts). Idempotent: inserts only names not already present as a
-- live global exercise, so re-running is safe.
--
-- Applied via the Supabase MCP (migration name: seed_exercises).

insert into public.exercises (name, category, equipment, is_custom)
select v.name, v.category, v.equipment, false
from (
  values
    -- Chest
    ('Barbell bench press', 'chest', 'barbell'),
    ('Incline barbell bench press', 'chest', 'barbell'),
    ('Incline dumbbell press', 'chest', 'dumbbell'),
    ('Dumbbell bench press', 'chest', 'dumbbell'),
    ('Cable fly', 'chest', 'cable'),
    ('Machine chest press', 'chest', 'machine'),
    ('Push-up', 'chest', 'bodyweight'),
    -- Back
    ('Deadlift', 'back', 'barbell'),
    ('Barbell row', 'back', 'barbell'),
    ('Pull-up', 'back', 'bodyweight'),
    ('Lat pulldown', 'back', 'cable'),
    ('Seated cable row', 'back', 'cable'),
    ('Dumbbell row', 'back', 'dumbbell'),
    ('T-bar row', 'back', 'barbell'),
    ('Face pull', 'back', 'cable'),
    -- Legs
    ('Back squat', 'legs', 'barbell'),
    ('Front squat', 'legs', 'barbell'),
    ('Leg press', 'legs', 'machine'),
    ('Romanian deadlift', 'legs', 'barbell'),
    ('Leg extension', 'legs', 'machine'),
    ('Leg curl', 'legs', 'machine'),
    ('Walking lunge', 'legs', 'dumbbell'),
    ('Bulgarian split squat', 'legs', 'dumbbell'),
    ('Goblet squat', 'legs', 'kettlebell'),
    ('Standing calf raise', 'legs', 'machine'),
    -- Shoulders
    ('Overhead press', 'shoulders', 'barbell'),
    ('Seated dumbbell shoulder press', 'shoulders', 'dumbbell'),
    ('Arnold press', 'shoulders', 'dumbbell'),
    ('Dumbbell lateral raise', 'shoulders', 'dumbbell'),
    ('Cable lateral raise', 'shoulders', 'cable'),
    ('Rear delt fly', 'shoulders', 'dumbbell'),
    ('Upright row', 'shoulders', 'barbell'),
    -- Arms
    ('Barbell curl', 'arms', 'barbell'),
    ('Dumbbell curl', 'arms', 'dumbbell'),
    ('Hammer curl', 'arms', 'dumbbell'),
    ('Preacher curl', 'arms', 'machine'),
    ('Triceps pushdown', 'arms', 'cable'),
    ('Overhead triceps extension', 'arms', 'dumbbell'),
    ('Skullcrusher', 'arms', 'barbell'),
    ('Triceps dip', 'arms', 'bodyweight'),
    -- Core
    ('Plank', 'core', 'bodyweight'),
    ('Hanging leg raise', 'core', 'bodyweight'),
    ('Cable crunch', 'core', 'cable'),
    ('Russian twist', 'core', 'bodyweight'),
    ('Ab wheel rollout', 'core', 'band')
) as v (name, category, equipment)
where not exists (
  select 1
  from public.exercises e
  where e.owner_id is null
    and e.name = v.name
    and e.deleted_at is null
);
