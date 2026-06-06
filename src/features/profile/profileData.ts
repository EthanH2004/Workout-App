/**
 * Profile data — live. Lifetime stats + personal records are aggregated from the
 * user's real sessions (reusing the shared ['progress-sessions'] query cache, so
 * no extra fetch), and data export compiles everything the user owns into JSON
 * shared via the built-in React Native Share API (no native modules). Derived
 * values use the /utils helpers; nothing is stored.
 */
import { useMemo } from 'react';
import { Alert, Share } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  fetchExportData,
  fetchProgressSessions,
  type ProgressSessionRow,
} from '../../lib/supabase/queries';
import { bestEstimatedOneRepMax } from '../../utils/oneRepMax';
import { useAuth } from '../auth/AuthProvider';

export interface LifetimeStats {
  workouts: number;
  totalSets: number;
  totalVolumeKg: number;
  prs: number; // number of exercises with a recorded best
}

export interface PrRecord {
  id: string; // exercise_id (for navigation to detail)
  name: string;
  e1rmKg: number; // best estimated 1RM (canonical kg)
}

export type ProfileStatsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'empty' } // signed in, but no workouts logged yet
  | { status: 'ready'; stats: LifetimeStats; prs: PrRecord[] };

function aggregate(rows: ProgressSessionRow[]): { stats: LifetimeStats; prs: PrRecord[] } {
  let totalSets = 0;
  let totalVolumeKg = 0;
  let workouts = 0;
  const best = new Map<string, PrRecord>();

  for (const s of rows) {
    let counted = false;
    for (const ex of s.session_exercises) {
      const sets = ex.session_sets.filter(
        (x) => x.completed && x.weight_kg != null && x.reps != null,
      );
      if (sets.length === 0) continue;
      counted = true;
      for (const set of sets) {
        totalSets += 1;
        totalVolumeKg += (set.weight_kg as number) * (set.reps as number);
      }
      const e1rm = bestEstimatedOneRepMax(sets);
      const prev = best.get(ex.exercise_id);
      if (!prev || e1rm > prev.e1rmKg) {
        best.set(ex.exercise_id, { id: ex.exercise_id, name: ex.exercise_name, e1rmKg: e1rm });
      }
    }
    if (counted) workouts += 1;
  }

  const prs = [...best.values()].sort((a, b) => b.e1rmKg - a.e1rmKg);
  return { stats: { workouts, totalSets, totalVolumeKg, prs: prs.length }, prs };
}

/** Lifetime totals + personal records (cached offline; shares the Progress query). */
export function useLifetimeStats(): { state: ProfileStatsState; refetch: () => void } {
  const { session } = useAuth();
  const userId = session?.user.id;

  const query = useQuery({
    queryKey: ['progress-sessions', userId],
    enabled: !!userId,
    queryFn: fetchProgressSessions,
  });

  const built = useMemo(() => (query.data ? aggregate(query.data) : null), [query.data]);
  const refetch = () => void query.refetch();

  if (!built) {
    return { state: query.isError ? { status: 'error' } : { status: 'loading' }, refetch };
  }
  if (built.stats.workouts === 0) return { state: { status: 'empty' }, refetch };
  return { state: { status: 'ready', stats: built.stats, prs: built.prs }, refetch };
}

/** Compile + share the user's full data as JSON via the built-in Share API. */
export function useExportData(): { exportData: () => Promise<void> } {
  const { session } = useAuth();
  const userId = session?.user.id;

  return {
    async exportData() {
      if (!userId) return;
      try {
        const bundle = await fetchExportData(userId);
        await Share.share({
          title: 'Workout Tracker data export',
          message: JSON.stringify(bundle, null, 2),
        });
      } catch {
        Alert.alert("Couldn't export data", 'Please try again.');
      }
    },
  };
}
