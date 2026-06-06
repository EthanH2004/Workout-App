/**
 * DB-backed program library (routines → days → day-exercises), cached for
 * offline via TanStack Query + the MMKV persister. Every edit goes through one
 * action-based mutation whose mutationFn is registered in queryClient.ts, so
 * queued writes replay in order after a restart; optimistic updates make each
 * edit show instantly (even offline). Client-generated UUIDs throughout.
 *
 * Scope: this powers the Routines tab + the program/day editors. Home, Active,
 * Progress and Profile still read the mock routinesStore for now — the shared
 * view-model types (Program/ProgramDay/DayExercise) live there.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchExercises,
  fetchProgramData,
  type ExerciseRow,
  type Profile,
  type ProgramAction,
  type ProgramData,
} from '../../lib/supabase/queries';
import { useProfile } from '../../hooks/useProfile';
import { useAuth } from '../auth/AuthProvider';
import { uuid } from '../../utils/uuid';
import type { Equipment } from '../../components/EquipmentIcon';
import type { DayExercise, Program, ProgramDay, RoutineTemplate } from './routinesStore';

export type LibraryState = 'loading' | 'error' | 'ready';

/** One exercise row as the day editor hands it back on save (key = day_exercise id). */
export interface SaveDayItem {
  id: string;
  exerciseId: string;
  name: string;
  equipment: Equipment | null;
  targetSets: number;
  targetReps: number;
}

/** Write shapes mirroring the ProgramAction fields (structural). */
interface DayWrite {
  id: string;
  exerciseId: string;
  position: number;
  targetSets: number;
  targetReps: number;
  name: string;
  equipment: string | null;
}
interface AdoptDay {
  id: string;
  ownerId: string;
  routineId: string;
  name: string;
  position: number;
}
interface AdoptExercise extends DayWrite {
  ownerId: string;
  routineDayId: string;
}

const programsKey = (userId: string | undefined) => ['programs', userId];
const profileKey = (userId: string | undefined) => ['profile', userId];
const exercisesKey = (userId: string | undefined) => ['exercises', userId];

const DEFAULT_SETS = 3;
const DEFAULT_REPS = 8;

/* ----------------------------- tree assembly ------------------------------ */

function assemble(data: ProgramData): Program[] {
  const exByDay = new Map<string, DayExercise[]>();
  for (const e of data.dayExercises) {
    const list = exByDay.get(e.routine_day_id) ?? [];
    list.push({
      id: e.id,
      exerciseId: e.exercise_id,
      name: e.exercises?.name ?? 'Exercise',
      equipment: (e.exercises?.equipment ?? null) as Equipment | null,
      targetSets: e.target_sets ?? DEFAULT_SETS,
      targetReps: e.target_reps ?? DEFAULT_REPS,
    });
    exByDay.set(e.routine_day_id, list);
  }
  const daysByProgram = new Map<string, ProgramDay[]>();
  for (const d of data.days) {
    const list = daysByProgram.get(d.routine_id) ?? [];
    list.push({ id: d.id, name: d.name, exercises: exByDay.get(d.id) ?? [] });
    daysByProgram.set(d.routine_id, list);
  }
  return data.routines.map((r) => ({
    id: r.id,
    name: r.name,
    days: daysByProgram.get(r.id) ?? [],
  }));
}

/* --------------------------- optimistic applier --------------------------- */

const toDayExercise = (w: {
  id: string;
  exerciseId: string;
  position: number;
  targetSets: number;
  targetReps: number;
  name: string;
  equipment: string | null;
}): DayExercise => ({
  id: w.id,
  exerciseId: w.exerciseId,
  name: w.name,
  equipment: (w.equipment ?? null) as Equipment | null,
  targetSets: w.targetSets,
  targetReps: w.targetReps,
});

/** Pure: apply an action to the cached program tree (used by onMutate). */
function applyAction(programs: Program[], action: ProgramAction): Program[] {
  switch (action.type) {
    case 'createProgram':
      return [...programs, { id: action.id, name: action.name, days: [] }];
    case 'renameProgram':
      return programs.map((p) => (p.id === action.id ? { ...p, name: action.name } : p));
    case 'deleteProgram':
      return programs.filter((p) => p.id !== action.id);
    case 'addDay':
      return programs.map((p) =>
        p.id === action.routineId
          ? { ...p, days: [...p.days, { id: action.id, name: action.name, exercises: [] }] }
          : p,
      );
    case 'deleteDay':
      return programs.map((p) => ({ ...p, days: p.days.filter((d) => d.id !== action.id) }));
    case 'reorderDays': {
      const pos = new Map(action.updates.map((u) => [u.id, u.position]));
      return programs.map((p) => {
        if (!p.days.some((d) => pos.has(d.id))) return p;
        const days = [...p.days].sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0));
        return { ...p, days };
      });
    }
    case 'saveDay': {
      const exercises = [...action.insert, ...action.update]
        .sort((a, b) => a.position - b.position)
        .map(toDayExercise);
      return programs.map((p) => ({
        ...p,
        days: p.days.map((d) =>
          d.id === action.dayId ? { ...d, name: action.name, exercises } : d,
        ),
      }));
    }
    case 'adoptProgram': {
      const exByDay = new Map<string, DayExercise[]>();
      for (const e of action.exercises) {
        const list = exByDay.get(e.routineDayId) ?? [];
        list.push(toDayExercise(e));
        exByDay.set(e.routineDayId, list);
      }
      const days: ProgramDay[] = action.days.map((d) => ({
        id: d.id,
        name: d.name,
        exercises: exByDay.get(d.id) ?? [],
      }));
      return [...programs, { id: action.program.id, name: action.program.name, days }];
    }
    case 'setCurrent':
      return programs; // "current" lives on the profile, not the program tree
  }
}

/* --------------------------------- hook ----------------------------------- */

export function usePrograms() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();
  const key = programsKey(userId);

  const query = useQuery({
    queryKey: key,
    enabled: !!userId,
    queryFn: async () => assemble(await fetchProgramData()),
  });

  const profile = useProfile();
  const currentRoutineId = profile.data?.current_routine_id ?? null;

  const programs = query.data ?? [];

  let state: LibraryState;
  if (query.data) state = 'ready';
  else if (query.isError) state = 'error';
  else state = 'loading';

  const mutation = useMutation<
    void,
    Error,
    ProgramAction,
    { programs?: Program[]; profile?: Profile }
  >({
    mutationKey: ['programs', 'mutate'], // mutationFn registered in queryClient.ts
    onMutate: async (action) => {
      await qc.cancelQueries({ queryKey: key });
      const prevPrograms = qc.getQueryData<Program[]>(key);
      qc.setQueryData<Program[]>(key, (old) => applyAction(old ?? [], action));

      let prevProfile: Profile | undefined;
      if (action.type === 'setCurrent' || action.type === 'adoptProgram') {
        const pk = profileKey(userId);
        await qc.cancelQueries({ queryKey: pk });
        prevProfile = qc.getQueryData<Profile>(pk);
        const newCurrent = action.type === 'setCurrent' ? action.routineId : action.program.id;
        if (prevProfile) {
          qc.setQueryData<Profile>(pk, { ...prevProfile, current_routine_id: newCurrent });
        }
      }
      return { programs: prevPrograms, profile: prevProfile };
    },
    onError: (_e, _action, ctx) => {
      if (ctx?.programs) qc.setQueryData(key, ctx.programs);
      if (ctx?.profile) qc.setQueryData(profileKey(userId), ctx.profile);
    },
    onSettled: (_d, _e, action) => {
      qc.invalidateQueries({ queryKey: key });
      if (action.type === 'setCurrent' || action.type === 'adoptProgram') {
        qc.invalidateQueries({ queryKey: profileKey(userId) });
      }
    },
  });

  const dispatch = mutation.mutate;

  /* --------- readers (close over the loaded tree) --------- */

  const findProgram = (id: string): Program | null => programs.find((p) => p.id === id) ?? null;

  const findDay = (dayId: string): { program: Program; day: ProgramDay } | null => {
    for (const p of programs) {
      const day = p.days.find((d) => d.id === dayId);
      if (day) return { program: p, day };
    }
    return null;
  };

  /* --------- name → exercise_id resolution for copy-on-adopt --------- */

  async function resolveCatalog(): Promise<Map<string, { id: string; equipment: string | null }>> {
    let rows = qc.getQueryData<ExerciseRow[]>(exercisesKey(userId));
    if (!rows || rows.length === 0) {
      rows = await fetchExercises();
      qc.setQueryData(exercisesKey(userId), rows);
    }
    const map = new Map<string, { id: string; equipment: string | null }>();
    for (const r of rows) map.set(r.name.toLowerCase(), { id: r.id, equipment: r.equipment });
    return map;
  }

  /* --------- actions --------- */

  return {
    state,
    programs,
    currentRoutineId,
    refetch: () => void query.refetch(),
    findProgram,
    findDay,

    /** Create an empty program; returns its client id for navigation. */
    createProgram(name: string): string | null {
      if (!userId) return null;
      const id = uuid();
      dispatch({ type: 'createProgram', id, ownerId: userId, name, position: programs.length });
      return id;
    },

    renameProgram(id: string, name: string) {
      dispatch({ type: 'renameProgram', id, name });
    },

    deleteProgram(id: string) {
      dispatch({ type: 'deleteProgram', id });
    },

    /** Append a day to a program; returns its client id for navigation. */
    addDay(programId: string, name: string): string | null {
      if (!userId) return null;
      const id = uuid();
      const position = findProgram(programId)?.days.length ?? 0;
      dispatch({ type: 'addDay', id, ownerId: userId, routineId: programId, name, position });
      return id;
    },

    deleteDay(dayId: string) {
      dispatch({ type: 'deleteDay', id: dayId });
    },

    reorderDays(_programId: string, orderedDayIds: string[]) {
      const updates = orderedDayIds.map((id, position) => ({ id, position }));
      dispatch({ type: 'reorderDays', updates });
    },

    /** Save a day: diff the new list against the cached one (insert/update/delete). */
    saveDay(dayId: string, name: string, items: SaveDayItem[]) {
      if (!userId) return;
      const existingIds = new Set((findDay(dayId)?.day.exercises ?? []).map((e) => e.id));
      const insertRows: DayWrite[] = [];
      const updateRows: DayWrite[] = [];
      items.forEach((it, position) => {
        const row: DayWrite = {
          id: it.id,
          exerciseId: it.exerciseId,
          position,
          targetSets: it.targetSets,
          targetReps: it.targetReps,
          name: it.name,
          equipment: it.equipment,
        };
        if (existingIds.has(it.id)) updateRows.push(row);
        else insertRows.push(row);
      });
      const keptIds = new Set(items.map((it) => it.id));
      const deleteIds = [...existingIds].filter((id) => !keptIds.has(id));
      dispatch({
        type: 'saveDay',
        dayId,
        name,
        ownerId: userId,
        insert: insertRows,
        update: updateRows,
        deleteIds,
      });
    },

    setCurrent(routineId: string) {
      if (!userId) return;
      dispatch({ type: 'setCurrent', userId, routineId });
    },

    /** Copy-on-adopt: insert a brand-new owned program from a starter template. */
    async adoptTemplate(template: RoutineTemplate): Promise<string | null> {
      if (!userId) return null;
      const catalog = await resolveCatalog();
      const programId = uuid();
      const days: AdoptDay[] = [];
      const exercises: AdoptExercise[] = [];
      template.days.forEach((d, di) => {
        const dayId = uuid();
        days.push({ id: dayId, ownerId: userId, routineId: programId, name: d.name, position: di });
        d.exercises.forEach((ex, ei) => {
          const match = catalog.get(ex.name.toLowerCase());
          if (!match) return; // unresolved name (not in catalog) — skip rather than FK-fail
          exercises.push({
            id: uuid(),
            ownerId: userId,
            routineDayId: dayId,
            exerciseId: match.id,
            position: ei,
            targetSets: ex.targetSets,
            targetReps: ex.targetReps,
            name: ex.name,
            equipment: match.equipment ?? ex.equipment,
          });
        });
      });
      dispatch({
        type: 'adoptProgram',
        userId,
        program: { id: programId, ownerId: userId, name: template.name, position: programs.length },
        days,
        exercises,
      });
      return programId;
    },
  };
}
