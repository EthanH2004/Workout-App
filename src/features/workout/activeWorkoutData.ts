/**
 * Active workout session state — MOCK data shaped to the Supabase schema
 * (workout_sessions → session_exercises → session_sets). Ghost targets and the
 * "last time" caption come from the most recent completed session of each
 * exercise (mocked here). Held in a useReducer in the screen for now; this moves
 * to the persisted active-session store when offline resume is wired.
 */
import { lbToKg } from '../../utils/units';
import { uuid } from '../../utils/uuid';
import type { Equipment } from '../../components/EquipmentIcon';
import type { Program, ProgramDay } from '../routines/routinesStore';

export interface ActiveSet {
  id: string;
  setIndex: number;
  weightKg: number | null;
  reps: number | null;
  completed: boolean;
}

/** The matching set from the most recent completed session — the ghost target. */
export interface LastTime {
  dateLabel: string; // "Jun 1"
  weightKg: number;
  reps: number;
}

export interface ActiveExercise {
  id: string; // session_exercise id
  exerciseId: string;
  name: string;
  equipment: Equipment | null;
  prLive: boolean; // a PR is live for this exercise this session
  lastTime: LastTime | null;
  sets: ActiveSet[];
}

export interface ActiveSession {
  id: string;
  dayName: string; // "Push day"
  groupName: string | null; // "Push Pull Legs"
  routineDayId: string | null; // the DB routine_day this was launched from (null = one-off)
  exercises: ActiveExercise[];
}

/** A set worth persisting: completed, or with a weight/reps entered. */
export function isLoggedSet(s: ActiveSet): boolean {
  return s.completed || s.weightKg != null || s.reps != null;
}

/* --------------------------------- mock ----------------------------------- */

function set(setIndex: number, weightKg: number | null, reps: number | null, completed: boolean): ActiveSet {
  return { id: uuid(), setIndex, weightKg, reps, completed };
}

/** The mid-session Push day from screen-active-workout.html. */
export function createMockSession(): ActiveSession {
  const benchKg = lbToKg(135);
  return {
    id: uuid(),
    dayName: 'Push day',
    groupName: 'Push Pull Legs',
    routineDayId: null,
    exercises: [
      {
        id: uuid(),
        exerciseId: uuid(),
        name: 'Barbell bench press',
        equipment: 'barbell',
        prLive: true,
        lastTime: { dateLabel: 'Jun 1', weightKg: benchKg, reps: 8 },
        // A fresh session starts fully unlogged: every set is a ghost target.
        sets: [
          set(1, null, null, false),
          set(2, null, null, false),
          set(3, null, null, false),
          set(4, null, null, false),
        ],
      },
      {
        id: uuid(),
        exerciseId: uuid(),
        name: 'Incline dumbbell press',
        equipment: 'dumbbell',
        prLive: false,
        lastTime: { dateLabel: 'Jun 1', weightKg: lbToKg(60), reps: 10 },
        sets: [set(1, null, null, false), set(2, null, null, false), set(3, null, null, false)],
      },
      {
        id: uuid(),
        exerciseId: uuid(),
        name: 'Seated shoulder press',
        equipment: 'dumbbell',
        prLive: false,
        lastTime: { dateLabel: 'May 28', weightKg: lbToKg(45), reps: 10 },
        sets: [set(1, null, null, false), set(2, null, null, false)],
      },
    ],
  };
}

/** A freestyle session with no exercises yet (empty state). */
export function createEmptySession(): ActiveSession {
  return { id: uuid(), dayName: 'Quick workout', groupName: null, routineDayId: null, exercises: [] };
}

// Mock "last time" history keyed by exercise name — drives ghost targets + PR
// chips when a session is launched from a program day (until real history exists).
const MOCK_HISTORY: Record<string, { dateLabel: string; weightKg: number; reps: number; prLive?: boolean }> = {
  'Barbell bench press': { dateLabel: 'Jun 1', weightKg: lbToKg(135), reps: 8, prLive: true },
  'Incline dumbbell press': { dateLabel: 'Jun 1', weightKg: lbToKg(60), reps: 10 },
  'Seated shoulder press': { dateLabel: 'May 28', weightKg: lbToKg(45), reps: 10 },
  'Cable fly': { dateLabel: 'May 28', weightKg: lbToKg(35), reps: 12 },
  'Triceps pushdown': { dateLabel: 'May 28', weightKg: lbToKg(50), reps: 12 },
  'Back squat': { dateLabel: 'Jun 2', weightKg: lbToKg(225), reps: 5 },
  Deadlift: { dateLabel: 'May 31', weightKg: lbToKg(275), reps: 5 },
  'Barbell row': { dateLabel: 'May 31', weightKg: lbToKg(155), reps: 8 },
  'Romanian deadlift': { dateLabel: 'Jun 2', weightKg: lbToKg(185), reps: 10 },
  'Overhead press': { dateLabel: 'May 28', weightKg: lbToKg(95), reps: 8 },
};

/** Build an active session from a program day (the launched routine). */
export function createSessionFromDay(program: Program, day: ProgramDay): ActiveSession {
  return {
    id: uuid(),
    dayName: day.name,
    groupName: program.name,
    routineDayId: day.id,
    exercises: day.exercises.map((e) => {
      const hist = MOCK_HISTORY[e.name];
      return {
        id: uuid(),
        exerciseId: e.exerciseId,
        name: e.name,
        equipment: e.equipment,
        prLive: hist?.prLive ?? false,
        lastTime: hist ? { dateLabel: hist.dateLabel, weightKg: hist.weightKg, reps: hist.reps } : null,
        sets: Array.from({ length: Math.max(1, e.targetSets) }, (_, i) => set(i + 1, null, null, false)),
      };
    }),
  };
}

/* -------------------------------- reducer --------------------------------- */

/** A catalog exercise being added to the session (from the Exercise Picker). */
export interface NewExerciseInput {
  exerciseId: string;
  name: string;
  equipment: Equipment | null;
}

const DEFAULT_NEW_SETS = 3;

export type ActiveAction =
  | { type: 'TOGGLE_COMPLETE'; exerciseId: string; setId: string }
  | { type: 'ADD_SET'; exerciseId: string }
  | { type: 'REMOVE_SET'; exerciseId: string; setId: string }
  | { type: 'LOG_SET'; exerciseId: string; setId: string; weightKg: number; reps: number }
  | { type: 'EDIT_SET'; exerciseId: string; setId: string; weightKg: number; reps: number }
  | { type: 'ADD_EXERCISES'; exercises: NewExerciseInput[] };

function mapExercise(
  session: ActiveSession,
  exerciseId: string,
  fn: (ex: ActiveExercise) => ActiveExercise,
): ActiveSession {
  return {
    ...session,
    exercises: session.exercises.map((ex) => (ex.id === exerciseId ? fn(ex) : ex)),
  };
}

export function activeReducer(state: ActiveSession, action: ActiveAction): ActiveSession {
  switch (action.type) {
    case 'TOGGLE_COMPLETE':
      return mapExercise(state, action.exerciseId, (ex) => ({
        ...ex,
        sets: ex.sets.map((s) => {
          if (s.id !== action.setId) return s;
          const completed = !s.completed;
          // Completing an untouched set confirms its ghost target (§2.2).
          if (completed && s.weightKg == null && ex.lastTime) {
            return { ...s, completed, weightKg: ex.lastTime.weightKg, reps: ex.lastTime.reps };
          }
          return { ...s, completed };
        }),
      }));
    case 'ADD_SET':
      return mapExercise(state, action.exerciseId, (ex) => ({
        ...ex,
        sets: [...ex.sets, set(ex.sets.length + 1, null, null, false)],
      }));
    case 'REMOVE_SET':
      // Drop the set and re-number the rest so set indices stay 1..n.
      return mapExercise(state, action.exerciseId, (ex) => ({
        ...ex,
        sets: ex.sets
          .filter((s) => s.id !== action.setId)
          .map((s, i) => ({ ...s, setIndex: i + 1 })),
      }));
    case 'LOG_SET':
      // Number-pad "Log & next set": write values and mark the set complete.
      return mapExercise(state, action.exerciseId, (ex) => ({
        ...ex,
        sets: ex.sets.map((s) =>
          s.id === action.setId
            ? { ...s, weightKg: action.weightKg, reps: action.reps, completed: true }
            : s,
        ),
      }));
    case 'EDIT_SET':
      // "Save set": write values, leave completion as-is (no auto-advance).
      return mapExercise(state, action.exerciseId, (ex) => ({
        ...ex,
        sets: ex.sets.map((s) =>
          s.id === action.setId
            ? { ...s, weightKg: action.weightKg, reps: action.reps }
            : s,
        ),
      }));
    case 'ADD_EXERCISES':
      // Append picker selections as fresh exercises with empty to-do sets.
      return {
        ...state,
        exercises: [
          ...state.exercises,
          ...action.exercises.map((e) => ({
            id: uuid(),
            exerciseId: e.exerciseId,
            name: e.name,
            equipment: e.equipment,
            prLive: false,
            lastTime: null,
            sets: Array.from({ length: DEFAULT_NEW_SETS }, (_, i) =>
              set(i + 1, null, null, false),
            ),
          })),
        ],
      };
    default:
      return state;
  }
}

/* ------------------------------- selectors -------------------------------- */

/** The single "next set to log" — the first incomplete set in document order. */
export function firstIncompleteSetId(session: ActiveSession): string | null {
  for (const ex of session.exercises) {
    for (const s of ex.sets) {
      if (!s.completed) return s.id;
    }
  }
  return null;
}

/** True when there is at least one set and every set is completed. */
export function allSetsComplete(session: ActiveSession): boolean {
  const total = session.exercises.reduce((n, ex) => n + ex.sets.length, 0);
  if (total === 0) return false;
  return session.exercises.every((ex) => ex.sets.every((s) => s.completed));
}

/** Any logged set (used to gate the discard-confirm on back). */
export function hasLoggedSets(session: ActiveSession): boolean {
  return session.exercises.some((ex) => ex.sets.some((s) => s.completed));
}
