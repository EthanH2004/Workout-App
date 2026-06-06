import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { mmkvPersistStorage } from './storage';
import {
  deleteSession,
  insertCustomExercise,
  insertSession,
  runProgramMutation,
  updateUnitPreference,
  type DeleteSessionInput,
  type NewCustomExercise,
  type ProgramAction,
  type SaveSessionInput,
} from '../supabase/queries';
import type { WeightUnit } from '../../utils/units';

/** Keep cached data well past the session so reads work offline. */
const ONE_WEEK = 1000 * 60 * 60 * 24 * 7;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // offlineFirst: serve cache immediately, fetch when a connection exists.
      networkMode: 'offlineFirst',
      staleTime: 1000 * 60,
      gcTime: ONE_WEEK,
      retry: 2,
    },
    mutations: {
      // offlineFirst: a mutation fired offline is paused and replayed on reconnect.
      networkMode: 'offlineFirst',
      retry: 3,
    },
  },
});

/**
 * Mutation defaults keyed by mutationKey. The mutationFn is NOT serialized into
 * the persisted cache, so a queued mutation can only replay after a restart if
 * its function is registered here. Every offline-capable mutation needs an entry.
 */
queryClient.setMutationDefaults(['profile', 'updateUnitPreference'], {
  mutationFn: (vars: { userId: string; unit: WeightUnit }) =>
    updateUnitPreference(vars.userId, vars.unit),
});

queryClient.setMutationDefaults(['exercises', 'createCustom'], {
  mutationFn: (vars: NewCustomExercise) => insertCustomExercise(vars),
});

queryClient.setMutationDefaults(['programs', 'mutate'], {
  mutationFn: (vars: ProgramAction) => runProgramMutation(vars),
});

queryClient.setMutationDefaults(['sessions', 'save'], {
  mutationFn: (vars: SaveSessionInput) => insertSession(vars),
  // Defined here (not on the component's useMutation) so it still fires after the
  // Active Workout screen unmounts on finish, refreshing the session-derived
  // screens (Home, Progress, Exercise detail).
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
    queryClient.invalidateQueries({ queryKey: ['progress-sessions'] });
  },
});

queryClient.setMutationDefaults(['sessions', 'delete'], {
  mutationFn: (vars: DeleteSessionInput) => deleteSession(vars),
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
    queryClient.invalidateQueries({ queryKey: ['progress-sessions'] });
  },
});

/** Persists both the query cache (offline reads) and the mutation queue (offline writes). */
export const persister = createSyncStoragePersister({
  storage: mmkvPersistStorage,
  key: 'workout-tracker-query-cache',
});

export const persistMaxAge = ONE_WEEK;
