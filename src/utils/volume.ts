/**
 * Training volume — the secondary progress metric. Volume = Σ (weight × reps),
 * in canonical kg. Computed on read, never stored.
 */
interface SetLike {
  weight_kg: number | null;
  reps: number | null;
}

export function setVolume(weightKg: number, reps: number): number {
  return weightKg * reps;
}

/** Total volume (kg) across a group of sets — a session, a day, or a week. */
export function totalVolume(sets: SetLike[]): number {
  let total = 0;
  for (const set of sets) {
    if (set.weight_kg == null || set.reps == null) continue;
    total += set.weight_kg * set.reps;
  }
  return total;
}
