/**
 * App preferences — the single source of truth for units (lb/kg) and the other
 * Settings toggles. Persisted synchronously via the shared MMKV instance (M2)
 * and reactive via useSyncExternalStore, so flipping units converts every weight
 * shown across the app instantly. Default unit: lb.
 *
 * NOTE: this is the display source of truth; mirroring units to
 * profiles.unit_preference (M2) for cross-device sync is a follow-up.
 */
import { useSyncExternalStore } from 'react';
import { storage } from '../../lib/offline/storage';
import type { WeightUnit } from '../../utils/units';

const K_UNIT = 'settings.unit';
const K_REST = 'settings.restReminder';
const K_SYNC = 'settings.syncEnabled';

export interface AppSettings {
  unit: WeightUnit;
  restReminder: boolean;
  syncEnabled: boolean;
}

function read(): AppSettings {
  return {
    unit: storage.getString(K_UNIT) === 'kg' ? 'kg' : 'lb',
    restReminder: storage.getBoolean(K_REST) ?? false,
    syncEnabled: storage.getBoolean(K_SYNC) ?? true,
  };
}

let state: AppSettings = read();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const snapshot = () => state;
const unitSnapshot = () => state.unit;

/** Full settings (for the Settings screen). */
export function useSettings(): AppSettings {
  return useSyncExternalStore(subscribe, snapshot);
}

/** The app-wide weight unit — re-renders only when the unit changes. */
export function useUnit(): WeightUnit {
  return useSyncExternalStore(subscribe, unitSnapshot);
}

export function setUnit(unit: WeightUnit): void {
  storage.set(K_UNIT, unit);
  state = { ...state, unit };
  emit();
}

export function setRestReminder(restReminder: boolean): void {
  storage.set(K_REST, restReminder);
  state = { ...state, restReminder };
  emit();
}

export function setSyncEnabled(syncEnabled: boolean): void {
  storage.set(K_SYNC, syncEnabled);
  state = { ...state, syncEnabled };
  emit();
}
