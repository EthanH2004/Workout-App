import { createMMKV } from 'react-native-mmkv';

/** Fast synchronous key-value store backing the persisted query cache + queue. */
export const storage = createMMKV({ id: 'workout-tracker' });

/**
 * Adapter matching the sync Storage interface expected by
 * createSyncStoragePersister (getItem/setItem/removeItem).
 */
export const mmkvPersistStorage = {
  getItem: (key: string): string | null => storage.getString(key) ?? null,
  setItem: (key: string, value: string): void => storage.set(key, value),
  removeItem: (key: string): void => {
    storage.remove(key);
  },
};
