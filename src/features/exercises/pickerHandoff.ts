/**
 * Hand-off for the shared Exercise Picker. expo-router can't return a value from
 * a pushed modal, so the opener registers a callback here, navigates to the
 * picker, and the picker delivers the chosen exercises back on "Add". One
 * request is in flight at a time (you can only be on one picker screen).
 */
import type { CatalogExercise } from './exerciseCatalog';

type PickHandler = (picked: CatalogExercise[]) => void;

let handler: PickHandler | null = null;

/** Opener: register where the picked exercises should go, then navigate. */
export function requestExercises(onPick: PickHandler): void {
  handler = onPick;
}

/** Picker: deliver the selection to the opener (no-op if nothing registered). */
export function deliverExercises(picked: CatalogExercise[]): void {
  const current = handler;
  handler = null;
  current?.(picked);
}

/** Picker: drop the pending request on cancel. */
export function cancelExerciseRequest(): void {
  handler = null;
}
