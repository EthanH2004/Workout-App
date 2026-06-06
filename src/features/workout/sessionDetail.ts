/**
 * Read-only workout detail + delete. The session is read by id (cached), and
 * delete goes through the offline mutation queue (registered in queryClient.ts),
 * optimistically removing the session from the Home + Progress caches so both
 * update immediately. Derived values (volume, duration) use the /utils helpers.
 */
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchSessionDetail,
  type DeleteSessionInput,
  type HomeSessionRow,
  type ProgressSessionRow,
  type SessionDetailRow,
} from '../../lib/supabase/queries';
import { totalVolume } from '../../utils/volume';
import { useAuth } from '../auth/AuthProvider';

export interface DetailSet {
  setIndex: number;
  weightKg: number | null;
  reps: number | null;
  completed: boolean;
}

export interface DetailExercise {
  id: string;
  name: string;
  sets: DetailSet[];
  volumeKg: number;
}

export interface SessionDetailView {
  id: string;
  name: string;
  startedAt: string;
  durationMin: number | null;
  totalVolumeKg: number;
  totalSets: number;
  exerciseIds: string[]; // for the soft-delete
  exercises: DetailExercise[];
}

function assemble(row: SessionDetailRow): SessionDetailView {
  const exercises: DetailExercise[] = [...row.session_exercises]
    .sort((a, b) => a.position - b.position)
    .map((ex) => {
      const sets: DetailSet[] = [...ex.session_sets]
        .sort((a, b) => a.set_index - b.set_index)
        .map((s) => ({
          setIndex: s.set_index,
          weightKg: s.weight_kg,
          reps: s.reps,
          completed: s.completed,
        }));
      const volumeKg = totalVolume(
        sets.filter((s) => s.completed).map((s) => ({ weight_kg: s.weightKg, reps: s.reps })),
      );
      return { id: ex.id, name: ex.exercise_name, sets, volumeKg };
    });

  const totalSets = exercises.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0);
  const totalVolumeKg = exercises.reduce((n, e) => n + e.volumeKg, 0);
  const durationMin = row.ended_at
    ? Math.max(0, Math.round((new Date(row.ended_at).getTime() - new Date(row.started_at).getTime()) / 60000))
    : null;

  return {
    id: row.id,
    name: row.name ?? 'Workout',
    startedAt: row.started_at,
    durationMin,
    totalVolumeKg,
    totalSets,
    exerciseIds: exercises.map((e) => e.id),
    exercises,
  };
}

export type SessionDetailState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'empty' } // not found / already deleted
  | { status: 'ready'; detail: SessionDetailView };

/** Read one workout's detail (cached offline). */
export function useSessionDetail(id: string | undefined): {
  state: SessionDetailState;
  refetch: () => void;
} {
  const query = useQuery({
    queryKey: ['session', id],
    enabled: !!id,
    queryFn: () => fetchSessionDetail(id as string),
  });
  const detail = useMemo(() => (query.data ? assemble(query.data) : null), [query.data]);
  const refetch = () => void query.refetch();

  if (query.data === undefined) {
    return { state: query.isError ? { status: 'error' } : { status: 'loading' }, refetch };
  }
  if (!detail) return { state: { status: 'empty' }, refetch };
  return { state: { status: 'ready', detail }, refetch };
}

/** Delete a workout (optimistic across Home + Progress; offline-queued). */
export function useDeleteSession() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();

  const mutation = useMutation<
    void,
    Error,
    DeleteSessionInput,
    { home?: HomeSessionRow[]; progress?: ProgressSessionRow[] }
  >({
    mutationKey: ['sessions', 'delete'], // mutationFn + onSettled registered in queryClient.ts
    onMutate: async (vars) => {
      const homeKey = ['sessions', userId];
      const progKey = ['progress-sessions', userId];
      await qc.cancelQueries({ queryKey: homeKey });
      await qc.cancelQueries({ queryKey: progKey });
      const home = qc.getQueryData<HomeSessionRow[]>(homeKey);
      const progress = qc.getQueryData<ProgressSessionRow[]>(progKey);
      qc.setQueryData<HomeSessionRow[]>(homeKey, (old) =>
        old?.filter((s) => s.id !== vars.sessionId),
      );
      qc.setQueryData<ProgressSessionRow[]>(progKey, (old) =>
        old?.filter((s) => s.id !== vars.sessionId),
      );
      return { home, progress };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.home) qc.setQueryData(['sessions', userId], ctx.home);
      if (ctx?.progress) qc.setQueryData(['progress-sessions', userId], ctx.progress);
    },
  });

  return {
    remove(detail: SessionDetailView) {
      mutation.mutate({ sessionId: detail.id, exerciseIds: detail.exerciseIds });
    },
  };
}
