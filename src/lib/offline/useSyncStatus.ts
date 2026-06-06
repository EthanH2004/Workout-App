/**
 * Live sync status derived from real device connectivity (onlineManager) and the
 * offline mutation queue (the TanStack mutation cache). "Pending" counts every
 * queued/in-flight write — a workout save, a routine edit, a unit change, etc. —
 * so the Settings row can show the truth and update as the queue drains.
 */
import { useSyncExternalStore } from 'react';
import { onlineManager } from '@tanstack/react-query';
import { queryClient } from './queryClient';

const subscribeOnline = (cb: () => void) => onlineManager.subscribe(cb);
const getOnline = () => onlineManager.isOnline();

const subscribeMutations = (cb: () => void) => queryClient.getMutationCache().subscribe(cb);
const getPending = () =>
  queryClient
    .getMutationCache()
    .getAll()
    .filter((m) => m.state.status === 'pending').length; // in-flight + paused (offline)

export interface SyncStatus {
  online: boolean;
  pending: number;
}

export function useSyncStatus(): SyncStatus {
  const online = useSyncExternalStore(subscribeOnline, getOnline);
  const pending = useSyncExternalStore(subscribeMutations, getPending);
  return { online, pending };
}
