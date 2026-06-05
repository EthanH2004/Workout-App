import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchProfile, type Profile } from '../lib/supabase/queries';
import { useAuth } from '../features/auth/AuthProvider';
import type { WeightUnit } from '../utils/units';

/** The signed-in user's profile (cached + offline-readable). */
export function useProfile() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: () => fetchProfile(userId as string),
  });
}

/**
 * Toggle the lb/kg unit preference. Optimistic (the UI flips instantly, even
 * offline); the write queues and replays on reconnect via the mutation default
 * registered in queryClient.ts.
 */
export function useUpdateUnitPreference() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const qc = useQueryClient();

  const mutation = useMutation<
    void,
    Error,
    { userId: string; unit: WeightUnit },
    { previous?: Profile }
  >({
    mutationKey: ['profile', 'updateUnitPreference'],
    onMutate: async ({ unit }) => {
      await qc.cancelQueries({ queryKey: ['profile', userId] });
      const previous = qc.getQueryData<Profile>(['profile', userId]);
      if (previous) {
        qc.setQueryData<Profile>(['profile', userId], { ...previous, unit_preference: unit });
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) qc.setQueryData(['profile', userId], context.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });

  return {
    isPending: mutation.isPending,
    setUnit: (unit: WeightUnit) => {
      if (userId) mutation.mutate({ userId, unit });
    },
  };
}
