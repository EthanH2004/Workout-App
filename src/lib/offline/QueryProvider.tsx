import { useEffect, type ReactNode } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { focusManager, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { persister, persistMaxAge, queryClient } from './queryClient';

// Wire TanStack's online state to real device connectivity so a mutation fired
// offline is paused and then replayed when the connection returns.
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});

/**
 * Provides the persisted QueryClient. The query cache (offline reads) and the
 * mutation queue (offline writes) are persisted to MMKV; on launch we replay any
 * mutations that were queued in a previous offline session.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
    });
    return () => sub.remove();
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: persistMaxAge }}
      onSuccess={() => {
        queryClient.resumePausedMutations();
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
