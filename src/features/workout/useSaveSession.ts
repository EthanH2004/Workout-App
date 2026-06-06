/**
 * Persist a finished workout. One offline-queued mutation (its mutationFn is
 * registered in queryClient.ts, same pattern as the custom-exercise create and
 * the routine writes) inserts the session + its exercises + its logged sets.
 *
 * The save is fire-and-forget: the caller navigates away immediately and the
 * write replays from the queue if it was made offline. Nothing reads sessions
 * yet (Home/Progress are still on mock), so there is no cache to update.
 */
import { useMutation } from '@tanstack/react-query';
import { type SaveSessionInput } from '../../lib/supabase/queries';
import { useAuth } from '../auth/AuthProvider';
import { isLoggedSet, type ActiveSession } from './activeWorkoutData';

export function useSaveSession() {
  const { session: auth } = useAuth();
  const userId = auth?.user.id;

  const mutation = useMutation<void, Error, SaveSessionInput>({
    mutationKey: ['sessions', 'save'], // mutationFn registered in queryClient.ts
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
