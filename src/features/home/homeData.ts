/**
 * Home screen data — MOCK for now, shaped to the real Supabase schema
 * (routines → routine_days → routine_day_exercises, workout_sessions →
 * session_sets). Derived values (volume, set counts) are computed here via the
 * /utils helpers, never stored — matching how the real queries will work once
 * wired. Swap `useHomeData` for TanStack Query against queries.ts later.
 */
import { totalVolume } from '../../utils/volume';

/* ------------------------------- view models ------------------------------ */

export interface HomeExercisePreview {
  name: string;
  equipment: string | null;
  targetSets: number;
}

export interface HomeUpNext {
  routineDayName: string; // "Push day"
  groupName: string; // "Push Pull Legs"
  exerciseCount: number;
  totalSets: number;
  preview: HomeExercisePreview[]; // first three
  moreNames: string[]; // names beyond the preview, for "+N more · …"
}

export interface HomeRecentSession {
  id: string;
  name: string;
  startedAt: string; // ISO
  setsCount: number;
  volumeKg: number;
  equipment: string | null; // lead icon (first exercise)
}

// "Up next" now comes from the current program (routinesStore); Home owns only
// the stats + recent history here.
export interface HomeData {
  last7: { workouts: number; volumeKg: number };
  recent: HomeRecentSession[];
}

export type HomeQueryState =
  | { status: 'loading' }
  | { status: 'error'; cached: HomeData | null }
  | { status: 'empty' } // brand-new user: no routine, no history
  | { status: 'ready'; data: HomeData };

/* --------------------------------- mock ----------------------------------- */

/** Compact set-builder: `count` sets at the same weight/reps (canonical kg). */
function sets(weightKg: number, reps: number, count: number) {
  return Array.from({ length: count }, () => ({ weight_kg: weightKg, reps }));
}

// Three completed sessions within the last 7 days (most recent first).
const PUSH_SETS = [
  ...sets(60, 8, 4), // barbell bench
  ...sets(27.5, 10, 3), // incline dumbbell
  ...sets(20, 10, 3), // seated shoulder press
  ...sets(15, 12, 3), // cable fly
  ...sets(25, 12, 3), // triceps pushdown
  ...sets(9, 15, 3), // lateral raise
];
const PULL_SETS = [
  ...sets(100, 5, 4), // deadlift
  ...sets(70, 8, 3), // barbell row
  ...sets(0, 10, 4), // pull-ups (bodyweight)
  ...sets(25, 10, 3), // lat pulldown
  ...sets(15, 12, 4), // biceps curl
];
const LEG_SETS = [
  ...sets(100, 8, 4), // back squat
  ...sets(80, 10, 3), // romanian deadlift
  ...sets(140, 12, 3), // leg press
  ...sets(45, 12, 3), // leg curl
  ...sets(60, 15, 4), // calf raise
  ...sets(50, 12, 3), // leg extension
];

const RECENT: HomeRecentSession[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Leg day',
    startedAt: '2026-06-02T17:30:00.000Z',
    setsCount: LEG_SETS.length,
    volumeKg: totalVolume(LEG_SETS),
    equipment: 'barbell',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Pull day',
    startedAt: '2026-05-31T16:05:00.000Z',
    setsCount: PULL_SETS.length,
    volumeKg: totalVolume(PULL_SETS),
    equipment: 'barbell',
  },
];

const LAST7 = {
  workouts: 3,
  volumeKg: totalVolume([...PUSH_SETS, ...PULL_SETS, ...LEG_SETS]),
};

const MOCK_HOME: HomeData = { last7: LAST7, recent: RECENT };

/* --------------------------------- hook ----------------------------------- */

/**
 * Preview a non-default state on the simulator by setting this, then reload:
 * 'loading' | 'error' | 'empty' | 'no-routine'. Leave null for the populated screen.
 */
const FORCE_STATE: 'loading' | 'error' | 'empty' | null = null;

/** Mock Home data source. Returns a discriminated state the screen renders 1:1. */
export function useHomeData(): { state: HomeQueryState; refetch: () => void } {
  // refetch is a no-op while mocked; it becomes queryClient.invalidate once wired.
  const refetch = () => {};

  switch (FORCE_STATE) {
    case 'loading':
      return { state: { status: 'loading' }, refetch };
    case 'error':
      return { state: { status: 'error', cached: MOCK_HOME }, refetch };
    case 'empty':
      return { state: { status: 'empty' }, refetch };
    default:
      return { state: { status: 'ready', data: MOCK_HOME }, refetch };
  }
}
