/**
 * Live exercise catalog, cached for offline via TanStack Query + the MMKV
 * persister (M2). Reads survive a cold start with no network; creating a custom
 * exercise goes through the offline mutation queue (registered in queryClient.ts)
 * and optimistically appears in the list immediately.
 */
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchExercises, type ExerciseRow, type NewCustomExercise } from '../../lib/supabase/queries';
import { uuid } from '../../utils/uuid';
import { useAuth } from '../auth/AuthProvider';
import { rowToCatalog, type CatalogExercise, type Muscle } from './exerciseCatalog';
import type { Equipment } from '../../components/EquipmentIcon';

export type CatalogState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; exercises: CatalogExercise[] };

const exercisesKey = (userId: string | undefined) => ['exercises', userId];

/** The signed-in user's catalog (global built-ins + their customs). */
export function useExerciseCatalog(): { state: CatalogState; refetch: () => void } {
  const { session } = useAuth();
  const userId = session?.user.id;

  const query = useQuery({
    queryKey: exercisesKey(userId),
    enabled: !!userId,
    queryFn: fetchExercises,
  });

  const exercises = useMemo(
    () => (query.data ? query.data.map(rowToCatalog) : []),
    [query.data],
  );

  let state: CatalogState;
  if (query.data) state = { status: 'ready', exercises };
  else if (query.isError) state = { status: 'error' };
  else state = { status: 'loading' };

  return { state, refetch: () => void query.refetch() };
}

/** Create a custom exercise (offline-queued + optimistic). */
export function useCreateCustomExercise() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();

  const mutation = useMutation<void, Error, NewCustomExercise, { previous?: ExerciseRow[] }>({
    mutationKey: ['exercises', 'createCustom'], // mutationFn registered in queryClient.ts
    onMutate: async (vars) => {
      const key = exercisesKey(userId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<ExerciseRow[]>(key);
      const now = new Date().toISOString();
      const optimistic: ExerciseRow = {
        id: vars.id,
        owner_id: vars.ownerId,
        name: vars.name,
        category: vars.category,
        equipment: vars.equipment,
        is_custom: true,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      qc.setQueryData<ExerciseRow[]>(key, (old) => [...(old ?? []), optimistic]);
      return { previous };
    },
    onError: (_e, _vars, context) => {
      if (context?.previous) qc.setQueryData(exercisesKey(userId), context.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: exercisesKey(userId) });
    },
  });

  return {
    /** Persist + optimistically add; returns the new exercise (for auto-select). */
    create(name: string, muscle: Muscle, equipment: Equipment): CatalogExercise | null {
      if (!userId) return null;
      const id = uuid();
      const trimmed = name.trim();
      mutation.mutate({ id, ownerId: userId, name: trimmed, category: muscle, equipment });
      return { id, name: trimmed, muscle, equipment, isCustom: true };
    },
  };
}
