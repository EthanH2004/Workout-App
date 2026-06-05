/**
 * Estimated one-rep max — the primary progress metric. Epley formula:
 *   1RM = weight × (1 + reps / 30)   (a single rep returns the weight itself).
 * Computed on read from stored sets, never persisted (one source of truth).
 */
export function epleyOneRepMax(weightKg: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

interface SetLike {
  weight_kg: number | null;
  reps: number | null;
}

/** Best estimated 1RM across a group of sets (e.g. one exercise in one session). */
export function bestEstimatedOneRepMax(sets: SetLike[]): number {
  let best = 0;
  for (const set of sets) {
    if (set.weight_kg == null || set.reps == null) continue;
    const estimate = epleyOneRepMax(set.weight_kg, set.reps);
    if (estimate > best) best = estimate;
  }
  return best;
}
