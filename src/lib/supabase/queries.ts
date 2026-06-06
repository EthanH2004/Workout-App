import { supabase } from './client';
import type { Tables } from './database.types';
import type { WeightUnit } from '../../utils/units';

export type Profile = Tables<'profiles'>;
export type ExerciseRow = Tables<'exercises'>;

/**
 * The exercise catalog the user can see: global built-ins (owner_id null) plus
 * their own custom exercises. RLS does the scoping (`owner_id is null OR
 * owner_id = auth.uid()`), so we just select all live rows.
 */
export async function fetchExercises(): Promise<ExerciseRow[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .is('deleted_at', null)
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export interface NewCustomExercise {
  id: string; // client-generated UUID (offline-safe)
  ownerId: string;
  name: string;
  category: string; // muscle group
  equipment: string;
}

/** Insert a user's custom exercise (is_custom true). owner_id must be the caller. */
export async function insertCustomExercise(input: NewCustomExercise): Promise<void> {
  const { error } = await supabase.from('exercises').insert({
    id: input.id,
    owner_id: input.ownerId,
    name: input.name,
    category: input.category,
    equipment: input.equipment,
    is_custom: true,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/* ------------------------------- programs --------------------------------- */

const now = () => new Date().toISOString();

/** One day_exercise row with the referenced exercise's name/equipment embedded. */
export interface DayExerciseWithName {
  id: string;
  routine_day_id: string;
  exercise_id: string;
  position: number;
  target_sets: number | null;
  target_reps: number | null;
  exercises: { name: string; equipment: string | null } | null;
}

export interface ProgramData {
  routines: { id: string; name: string; position: number }[];
  days: { id: string; routine_id: string; name: string; position: number }[];
  dayExercises: DayExerciseWithName[];
}

/**
 * Load the user's whole library in three RLS-scoped reads (routines, days,
 * day-exercises with the exercise name embedded); the hook assembles the tree.
 */
export async function fetchProgramData(): Promise<ProgramData> {
  const [r, d, e] = await Promise.all([
    supabase.from('routines').select('id, name, position').is('deleted_at', null).order('position'),
    supabase
      .from('routine_days')
      .select('id, routine_id, name, position')
      .is('deleted_at', null)
      .order('position'),
    supabase
      .from('routine_day_exercises')
      .select('id, routine_day_id, exercise_id, position, target_sets, target_reps, exercises(name, equipment)')
      .is('deleted_at', null)
      .order('position'),
  ]);
  if (r.error) throw r.error;
  if (d.error) throw d.error;
  if (e.error) throw e.error;
  return {
    routines: r.data ?? [],
    days: d.data ?? [],
    dayExercises: (e.data ?? []) as unknown as DayExerciseWithName[],
  };
}

interface DayExerciseWrite {
  id: string;
  exerciseId: string;
  position: number;
  targetSets: number;
  targetReps: number;
  // For optimistic UI only — there is no name column on routine_day_exercises;
  // the persisted row derives its name from exercise_id. Ignored by the writes.
  name: string;
  equipment: string | null;
}

/**
 * Every program edit, as one offline-replayable action. Vars carry resolved
 * client UUIDs + owner_id so the registered mutationFn is self-contained.
 */
export type ProgramAction =
  | { type: 'createProgram'; id: string; ownerId: string; name: string; position: number }
  | { type: 'renameProgram'; id: string; name: string }
  | { type: 'deleteProgram'; id: string }
  | { type: 'addDay'; id: string; ownerId: string; routineId: string; name: string; position: number }
  | { type: 'deleteDay'; id: string }
  | { type: 'reorderDays'; updates: { id: string; position: number }[] }
  | {
      type: 'saveDay';
      dayId: string;
      name: string;
      ownerId: string;
      insert: DayExerciseWrite[];
      update: DayExerciseWrite[];
      deleteIds: string[];
    }
  | { type: 'setCurrent'; userId: string; routineId: string | null }
  | {
      type: 'adoptProgram';
      userId: string;
      program: { id: string; ownerId: string; name: string; position: number };
      days: { id: string; ownerId: string; routineId: string; name: string; position: number }[];
      exercises: {
        id: string;
        ownerId: string;
        routineDayId: string;
        exerciseId: string;
        position: number;
        targetSets: number;
        targetReps: number;
        name: string; // optimistic UI only
        equipment: string | null; // optimistic UI only
      }[];
    };

function dayExerciseRows(
  rows: DayExerciseWrite[],
  ownerId: string,
  routineDayId: string,
) {
  return rows.map((r) => ({
    id: r.id,
    owner_id: ownerId,
    routine_day_id: routineDayId,
    exercise_id: r.exerciseId,
    position: r.position,
    target_sets: r.targetSets,
    target_reps: r.targetReps,
    updated_at: now(),
  }));
}

/** Apply one program action to Supabase. Registered as the mutationFn (offline-replayable). */
export async function runProgramMutation(action: ProgramAction): Promise<void> {
  switch (action.type) {
    case 'createProgram': {
      const { error } = await supabase.from('routines').insert({
        id: action.id,
        owner_id: action.ownerId,
        name: action.name,
        position: action.position,
        updated_at: now(),
      });
      if (error) throw error;
      return;
    }
    case 'renameProgram': {
      const { error } = await supabase
        .from('routines')
        .update({ name: action.name, updated_at: now() })
        .eq('id', action.id);
      if (error) throw error;
      return;
    }
    case 'deleteProgram': {
      const patch = { deleted_at: now(), updated_at: now() };
      const { error: rErr } = await supabase
        .from('routines')
        .update(patch)
        .eq('id', action.id)
        .is('deleted_at', null);
      if (rErr) throw rErr;
      const { error: dErr } = await supabase
        .from('routine_days')
        .update(patch)
        .eq('routine_id', action.id)
        .is('deleted_at', null);
      if (dErr) throw dErr;
      return;
    }
    case 'addDay': {
      const { error } = await supabase.from('routine_days').insert({
        id: action.id,
        owner_id: action.ownerId,
        routine_id: action.routineId,
        name: action.name,
        position: action.position,
        updated_at: now(),
      });
      if (error) throw error;
      return;
    }
    case 'deleteDay': {
      const patch = { deleted_at: now(), updated_at: now() };
      const { error: dErr } = await supabase
        .from('routine_days')
        .update(patch)
        .eq('id', action.id)
        .is('deleted_at', null);
      if (dErr) throw dErr;
      const { error: eErr } = await supabase
        .from('routine_day_exercises')
        .update(patch)
        .eq('routine_day_id', action.id)
        .is('deleted_at', null);
      if (eErr) throw eErr;
      return;
    }
    case 'reorderDays': {
      for (const u of action.updates) {
        const { error } = await supabase
          .from('routine_days')
          .update({ position: u.position, updated_at: now() })
          .eq('id', u.id);
        if (error) throw error;
      }
      return;
    }
    case 'saveDay': {
      const { error: nameErr } = await supabase
        .from('routine_days')
        .update({ name: action.name, updated_at: now() })
        .eq('id', action.dayId);
      if (nameErr) throw nameErr;
      if (action.deleteIds.length) {
        const { error } = await supabase
          .from('routine_day_exercises')
          .update({ deleted_at: now(), updated_at: now() })
          .in('id', action.deleteIds);
        if (error) throw error;
      }
      for (const u of action.update) {
        const { error } = await supabase
          .from('routine_day_exercises')
          .update({
            position: u.position,
            target_sets: u.targetSets,
            target_reps: u.targetReps,
            updated_at: now(),
          })
          .eq('id', u.id);
        if (error) throw error;
      }
      if (action.insert.length) {
        const { error } = await supabase
          .from('routine_day_exercises')
          .insert(dayExerciseRows(action.insert, action.ownerId, action.dayId));
        if (error) throw error;
      }
      return;
    }
    case 'setCurrent': {
      const { error } = await supabase
        .from('profiles')
        .update({ current_routine_id: action.routineId, updated_at: now() })
        .eq('id', action.userId);
      if (error) throw error;
      return;
    }
    case 'adoptProgram': {
      const p = action.program;
      const { error: pErr } = await supabase
        .from('routines')
        .insert({ id: p.id, owner_id: p.ownerId, name: p.name, position: p.position, updated_at: now() });
      if (pErr) throw pErr;
      if (action.days.length) {
        const { error } = await supabase.from('routine_days').insert(
          action.days.map((d) => ({
            id: d.id,
            owner_id: d.ownerId,
            routine_id: d.routineId,
            name: d.name,
            position: d.position,
            updated_at: now(),
          })),
        );
        if (error) throw error;
      }
      if (action.exercises.length) {
        const { error } = await supabase.from('routine_day_exercises').insert(
          action.exercises.map((e) => ({
            id: e.id,
            owner_id: e.ownerId,
            routine_day_id: e.routineDayId,
            exercise_id: e.exerciseId,
            position: e.position,
            target_sets: e.targetSets,
            target_reps: e.targetReps,
            updated_at: now(),
          })),
        );
        if (error) throw error;
      }
      const { error: cErr } = await supabase
        .from('profiles')
        .update({ current_routine_id: p.id, updated_at: now() })
        .eq('id', action.userId);
      if (cErr) throw cErr;
      return;
    }
  }
}

/* ------------------------------- sessions --------------------------------- */

/**
 * A finished workout to persist: the session row, its exercises (with a name
 * snapshot + a valid exercise_id FK), and its logged sets (canonical kg).
 * Vars carry resolved client UUIDs + owner_id so the write replays offline.
 */
export interface SaveSessionInput {
  session: {
    id: string;
    ownerId: string;
    routineDayId: string | null;
    name: string | null;
    startedAt: string;
    endedAt: string;
  };
  exercises: {
    id: string;
    ownerId: string;
    sessionId: string;
    exerciseId: string;
    exerciseName: string;
    position: number;
  }[];
  sets: {
    id: string;
    ownerId: string;
    sessionExerciseId: string;
    setIndex: number;
    weightKg: number | null;
    reps: number | null;
    completed: boolean;
    loggedAt: string;
  }[];
}

/** Persist a finished workout: session → exercises → sets, in dependency order. */
export async function insertSession(input: SaveSessionInput): Promise<void> {
  const { session, exercises, sets } = input;

  const { error: sErr } = await supabase.from('workout_sessions').insert({
    id: session.id,
    owner_id: session.ownerId,
    routine_day_id: session.routineDayId,
    name: session.name,
    started_at: session.startedAt,
    ended_at: session.endedAt,
    updated_at: now(),
  });
  if (sErr) throw sErr;

  if (exercises.length) {
    const { error } = await supabase.from('session_exercises').insert(
      exercises.map((e) => ({
        id: e.id,
        owner_id: e.ownerId,
        session_id: e.sessionId,
        exercise_id: e.exerciseId,
        exercise_name: e.exerciseName,
        position: e.position,
        updated_at: now(),
      })),
    );
    if (error) throw error;
  }

  if (sets.length) {
    const { error } = await supabase.from('session_sets').insert(
      sets.map((s) => ({
        id: s.id,
        owner_id: s.ownerId,
        session_exercise_id: s.sessionExerciseId,
        set_index: s.setIndex,
        weight_kg: s.weightKg,
        reps: s.reps,
        completed: s.completed,
        logged_at: s.loggedAt,
        updated_at: now(),
      })),
    );
    if (error) throw error;
  }
}

/** One recent session with the bits Home needs: lead equipment + sets for stats. */
export interface HomeSessionRow {
  id: string;
  name: string | null;
  started_at: string;
  routine_day_id: string | null;
  session_exercises: {
    position: number;
    exercise_name: string;
    exercises: { equipment: string | null } | null;
    session_sets: { weight_kg: number | null; reps: number | null; completed: boolean }[];
  }[];
}

/**
 * The user's most recent sessions (RLS-scoped), newest first, with each
 * exercise's catalog equipment and every set embedded — enough to derive the
 * recent list, the 7-day stats, and the next-day rotation on the client.
 */
export async function fetchHomeSessions(limit = 30): Promise<HomeSessionRow[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(
      'id, name, started_at, routine_day_id, session_exercises(position, exercise_name, exercises(equipment), session_sets(weight_kg, reps, completed))',
    )
    .is('deleted_at', null)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as HomeSessionRow[];
}

/** A session reduced to what Progress/Exercise-detail need: date + per-exercise sets. */
export interface ProgressSessionRow {
  started_at: string;
  session_exercises: {
    exercise_id: string;
    exercise_name: string;
    session_sets: { weight_kg: number | null; reps: number | null; completed: boolean }[];
  }[];
}

/**
 * The user's sessions (RLS-scoped) for progress charts — every exercise's id +
 * name + sets, so e1RM / volume / heaviest trends are derived on the client.
 * Newest-first (capped); the hook reverses to oldest→newest for trend building.
 */
export async function fetchProgressSessions(): Promise<ProgressSessionRow[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(
      'started_at, session_exercises(exercise_id, exercise_name, session_sets(weight_kg, reps, completed))',
    )
    .is('deleted_at', null)
    .order('started_at', { ascending: false })
    .limit(400);
  if (error) throw error;
  return (data ?? []) as unknown as ProgressSessionRow[];
}

/* ----------------------------- account / export -------------------------- */

/**
 * Permanently delete the signed-in user's account + all their data. Calls the
 * security-definer delete_user() RPC, which is scoped to auth.uid() server-side
 * (no service-role key on the client). The local session is cleared by the caller.
 */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_user');
  if (error) throw error;
}

/** A full, JSON-serializable dump of everything the user owns (for data export). */
export async function fetchExportData(userId: string): Promise<Record<string, unknown>> {
  const [profile, routines, days, dayExercises, sessions, sessionExercises, sessionSets, customExercises] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('routines').select('*'),
      supabase.from('routine_days').select('*'),
      supabase.from('routine_day_exercises').select('*'),
      supabase.from('workout_sessions').select('*'),
      supabase.from('session_exercises').select('*'),
      supabase.from('session_sets').select('*'),
      supabase.from('exercises').select('*').eq('owner_id', userId), // customs only (globals: owner_id null)
    ]);
  for (const res of [
    profile,
    routines,
    days,
    dayExercises,
    sessions,
    sessionExercises,
    sessionSets,
    customExercises,
  ]) {
    if (res.error) throw res.error;
  }
  return {
    app: 'Workout Tracker',
    exportedAt: new Date().toISOString(),
    profile: profile.data,
    programs: {
      routines: routines.data ?? [],
      days: days.data ?? [],
      exercises: dayExercises.data ?? [],
    },
    sessions: {
      workouts: sessions.data ?? [],
      exercises: sessionExercises.data ?? [],
      sets: sessionSets.data ?? [],
    },
    customExercises: customExercises.data ?? [],
  };
}

/** Read the signed-in user's profile row (created by the signup trigger). */
export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Update the unit preference. We set updated_at on the client so last-write-wins
 * sync has a timestamp even for writes made offline (decision: client-owned updated_at).
 */
export async function updateUnitPreference(userId: string, unit: WeightUnit): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ unit_preference: unit, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}
