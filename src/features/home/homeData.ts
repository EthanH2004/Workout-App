/**
 * Home screen data — live now. "Up next" comes from the user's current program
 * (profiles.current_routine_id, via usePrograms) plus a simple rotation off the
 * most recently completed day; the 7-day stats and recent list are derived from
 * real sessions (fetchHomeSessions), cached for offline via TanStack Query + the
 * MMKV persister. Derived values (volume, set counts) are computed here with the
 * /utils helpers, never stored.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchHomeSessions, type HomeSessionRow } from '../../lib/supabase/queries';
import { totalVolume } from '../../utils/volume';
import { useAuth } from '../auth/AuthProvider';
import { usePrograms } from '../routines/usePrograms';
import type { Equipment } from '../../components/EquipmentIcon';
import type { Program, ProgramDay } from '../routines/routinesStore';

/* ------------------------------- view models ------------------------------ */

export interface HomeExercisePreview {
  name: string;
  equipment: Equipment | null;
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
  equipment: Equipment | null; // lead icon (first exercise)
}

export interface HomeReady {
  up: { program: Program; day: ProgramDay } | null; // the next day to train (null = no program)
  last7: { workouts: number; volumeKg: number };
  recent: HomeRecentSession[];
}

export type HomeState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'empty' } // brand-new account: no current program AND no workouts
  | { status: 'ready'; data: HomeReady };

/* -------------------------------- helpers --------------------------------- */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const RECENT_LIMIT = 5;

/** The completed sets across a session (the work actually done). */
function completedSets(s: HomeSessionRow) {
  return s.session_exercises.flatMap((ex) => ex.session_sets.filter((set) => set.completed));
}

/** A real workout has at least one completed set (skips empty finished sessions). */
function isReal(s: HomeSessionRow): boolean {
  return s.session_exercises.some((ex) => ex.session_sets.some((set) => set.completed));
}

/** Lead icon: the first exercise's catalog equipment. */
function leadEquipment(s: HomeSessionRow): Equipment | null {
  const first = [...s.session_exercises].sort((a, b) => a.position - b.position)[0];
  return (first?.exercises?.equipment ?? null) as Equipment | null;
}

/**
 * Simple rotation: the day after the most recently completed in-program day,
 * wrapping back to the first — or day 1 if nothing in this program is logged yet.
 * `real` is newest-first.
 */
function rotateNextDay(program: Program, real: HomeSessionRow[]): ProgramDay {
  const indexOf = new Map(program.days.map((d, i) => [d.id, i]));
  const last = real.find((s) => s.routine_day_id != null && indexOf.has(s.routine_day_id));
  if (!last || last.routine_day_id == null) return program.days[0];
  const i = indexOf.get(last.routine_day_id) ?? 0;
  return program.days[(i + 1) % program.days.length];
}

/* --------------------------------- hook ----------------------------------- */

/** Live Home data: a discriminated state the screen renders 1:1. */
export function useHome(): { state: HomeState; refetch: () => void } {
  const { session } = useAuth();
  const userId = session?.user.id;

  const sessionsQuery = useQuery({
    queryKey: ['sessions', userId],
    enabled: !!userId,
    queryFn: () => fetchHomeSessions(),
  });

  const {
    state: programsState,
    programs,
    currentRoutineId,
    refetch: refetchPrograms,
  } = usePrograms();

  const rows = sessionsQuery.data;
  const isError = sessionsQuery.isError;

  const state = useMemo<HomeState>(() => {
    const ready = rows !== undefined && programsState === 'ready';
    if (!ready) {
      // Offline-first: only an error once there's no data to show at all.
      if (programsState === 'error' || isError) return { status: 'error' };
      return { status: 'loading' };
    }

    const real = rows.filter(isReal);
    const currentProgram = currentRoutineId
      ? (programs.find((p) => p.id === currentRoutineId) ?? null)
      : null;

    if (!currentProgram && real.length === 0) return { status: 'empty' };

    const up =
      currentProgram && currentProgram.days.length > 0
        ? { program: currentProgram, day: rotateNextDay(currentProgram, real) }
        : null;

    const now = Date.now();
    const inWeek = real.filter((s) => now - new Date(s.started_at).getTime() <= WEEK_MS);
    const last7 = {
      workouts: inWeek.length,
      volumeKg: inWeek.reduce((sum, s) => sum + totalVolume(completedSets(s)), 0),
    };

    const recent: HomeRecentSession[] = real.slice(0, RECENT_LIMIT).map((s) => {
      const done = completedSets(s);
      return {
        id: s.id,
        name: s.name ?? 'Workout',
        startedAt: s.started_at,
        setsCount: done.length,
        volumeKg: totalVolume(done),
        equipment: leadEquipment(s),
      };
    });

    return { status: 'ready', data: { up, last7, recent } };
  }, [rows, isError, programsState, programs, currentRoutineId]);

  const refetch = () => {
    void sessionsQuery.refetch();
    refetchPrograms();
  };

  return { state, refetch };
}
