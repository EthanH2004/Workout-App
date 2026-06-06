/**
 * Persist a finished workout. One offline-queued mutation (its mutationFn +
 * reconciling onSettled are registered in queryClient.ts, same pattern as the
 * custom-exercise create and the workout delete) inserts the session + its
 * exercises + its logged sets.
 *
 * The save is fire-and-forget — the caller navigates away immediately. onMutate
 * optimistically prepends the new session to the Home (['sessions']) and
 * Progress/Profile (['progress-sessions']) caches, so it shows instantly even
 * offline; the registered onSettled invalidates both, reconciling to the server
 * row (same id → no duplicate) once the write lands.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type HomeSessionRow,
  type ProgressSessionRow,
  type SaveSessionInput,
} from '../../lib/supabase/queries';
import { useAuth } from '../auth/AuthProvider';
import { isLoggedSet, type ActiveSession } from './activeWorkoutData';

type Ctx = { home?: HomeSessionRow[]; progress?: ProgressSessionRow[] };

export function useSaveSession() {
  const { session: auth } = useAuth();
  const userId = auth?.user.id;
  const qc = useQueryClient();

  const mutation = useMutation<void, Error, SaveSessionInput, Ctx>({
    mutationKey: ['sessions', 'save'], // mutationFn + onSettled registered in queryClient.ts
    onMutate: async (vars) => {
      const homeKey = ['sessions', userId];
      const progKey = ['progress-sessions', userId];
      await qc.cancelQueries({ queryKey: homeKey });
      await qc.cancelQueries({ queryKey: progKey });
      const home = qc.getQueryData<HomeSessionRow[]>(homeKey);
      const progress = qc.getQueryData<ProgressSessionRow[]>(progKey);

      const setsFor = (exerciseRowId: string) =>
        vars.sets
          .filter((s) => s.sessionExerciseId === exerciseRowId)
          .map((s) => ({ weight_kg: s.weightKg, reps: s.reps, completed: s.completed }));

      const homeRow: HomeSessionRow = {
        id: vars.session.id,
        name: vars.session.name,
        started_at: vars.session.startedAt,
        routine_day_id: vars.session.routineDayId,
        session_exercises: vars.exercises.map((ex) => ({
          position: ex.position,
          exercise_name: ex.exerciseName,
          exercises: { equipment: ex.equipment },
          session_sets: setsFor(ex.id),
        })),
      };
      const progRow: ProgressSessionRow = {
        id: vars.session.id,
        started_at: vars.session.startedAt,
        session_exercises: vars.exercises.map((ex) => ({
          exercise_id: ex.exerciseId,
          exercise_name: ex.exerciseName,
          session_sets: setsFor(ex.id),
        })),
      };

      // Newest-first, matching the fetch order.
      qc.setQueryData<HomeSessionRow[]>(homeKey, (old) => [homeRow, ...(old ?? [])]);
      qc.setQueryData<ProgressSessionRow[]>(progKey, (old) => [progRow, ...(old ?? [])]);
      return { home, progress };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.home) qc.setQueryData(['sessions', userId], ctx.home);
      if (ctx?.progress) qc.setQueryData(['progress-sessions', userId], ctx.progress);
    },
  });

  return {
    isError: mutation.isError,
    /**
     * Persist the session and every logged set. Exercises with nothing logged
     * are skipped. No-op if not signed in. startedAt is an ISO timestamp.
     */
    save(session: ActiveSession, startedAt: string) {
      if (!userId) return;
      const endedAt = new Date().toISOString();

      const exercises: SaveSessionInput['exercises'] = [];
      const sets: SaveSessionInput['sets'] = [];

      session.exercises.forEach((ex, position) => {
        const logged = ex.sets.filter(isLoggedSet);
        if (logged.length === 0) return; // an exercise with nothing logged isn't a record
        exercises.push({
          id: ex.id,
          ownerId: userId,
          sessionId: session.id,
          exerciseId: ex.exerciseId,
          exerciseName: ex.name,
          position,
          equipment: ex.equipment,
        });
        for (const s of logged) {
          sets.push({
            id: s.id,
            ownerId: userId,
            sessionExerciseId: ex.id,
            setIndex: s.setIndex,
            weightKg: s.weightKg,
            reps: s.reps,
            completed: s.completed,
            loggedAt: endedAt,
          });
        }
      });

      mutation.mutate({
        session: {
          id: session.id,
          ownerId: userId,
          routineDayId: session.routineDayId,
          name: session.dayName,
          startedAt,
          endedAt,
        },
        exercises,
        sets,
      });
    },
  };
}
