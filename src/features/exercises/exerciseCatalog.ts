/**
 * Exercise catalog — MOCK data shaped to the Supabase `exercises` table
 * (id, name, category = primary muscle, equipment, is_custom, owner_id…).
 * The screen reads a view model (`CatalogExercise`); swap `useExerciseCatalog`
 * for a TanStack query against queries.ts when the catalog is wired.
 */
import type { Equipment } from '../../components/EquipmentIcon';
import { uuid } from '../../utils/uuid';

export type Muscle = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core';

export const MUSCLE_ORDER: Muscle[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];

export const MUSCLE_LABEL: Record<Muscle, string> = {
  chest: 'Chest',
  back: 'Back',
  legs: 'Legs',
  shoulders: 'Shoulders',
  arms: 'Arms',
  core: 'Core',
};

export interface CatalogExercise {
  id: string;
  name: string;
  muscle: Muscle; // exercises.category
  equipment: Equipment; // exercises.equipment
  isCustom: boolean; // exercises.is_custom
}

/** Seed entry — slug id keeps the mock catalog stable across reloads. */
function mk(name: string, muscle: Muscle, equipment: Equipment): CatalogExercise {
  return {
    id: `${muscle}:${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    muscle,
    equipment,
    isCustom: false,
  };
}

/** ~40 common lifts across the six muscle groups. */
const SEED_CATALOG: CatalogExercise[] = [
  // Chest
  mk('Barbell bench press', 'chest', 'barbell'),
  mk('Incline barbell bench press', 'chest', 'barbell'),
  mk('Incline dumbbell press', 'chest', 'dumbbell'),
  mk('Dumbbell bench press', 'chest', 'dumbbell'),
  mk('Cable fly', 'chest', 'cable'),
  mk('Machine chest press', 'chest', 'machine'),
  mk('Push-up', 'chest', 'bodyweight'),
  // Back
  mk('Deadlift', 'back', 'barbell'),
  mk('Barbell row', 'back', 'barbell'),
  mk('Pull-up', 'back', 'bodyweight'),
  mk('Lat pulldown', 'back', 'cable'),
  mk('Seated cable row', 'back', 'cable'),
  mk('Dumbbell row', 'back', 'dumbbell'),
  mk('T-bar row', 'back', 'barbell'),
  mk('Face pull', 'back', 'cable'),
  // Legs
  mk('Back squat', 'legs', 'barbell'),
  mk('Front squat', 'legs', 'barbell'),
  mk('Leg press', 'legs', 'machine'),
  mk('Romanian deadlift', 'legs', 'barbell'),
  mk('Leg extension', 'legs', 'machine'),
  mk('Leg curl', 'legs', 'machine'),
  mk('Walking lunge', 'legs', 'dumbbell'),
  mk('Bulgarian split squat', 'legs', 'dumbbell'),
  mk('Goblet squat', 'legs', 'kettlebell'),
  mk('Standing calf raise', 'legs', 'machine'),
  // Shoulders
  mk('Overhead press', 'shoulders', 'barbell'),
  mk('Seated dumbbell shoulder press', 'shoulders', 'dumbbell'),
  mk('Arnold press', 'shoulders', 'dumbbell'),
  mk('Dumbbell lateral raise', 'shoulders', 'dumbbell'),
  mk('Cable lateral raise', 'shoulders', 'cable'),
  mk('Rear delt fly', 'shoulders', 'dumbbell'),
  mk('Upright row', 'shoulders', 'barbell'),
  // Arms
  mk('Barbell curl', 'arms', 'barbell'),
  mk('Dumbbell curl', 'arms', 'dumbbell'),
  mk('Hammer curl', 'arms', 'dumbbell'),
  mk('Preacher curl', 'arms', 'machine'),
  mk('Triceps pushdown', 'arms', 'cable'),
  mk('Overhead triceps extension', 'arms', 'dumbbell'),
  mk('Skullcrusher', 'arms', 'barbell'),
  mk('Triceps dip', 'arms', 'bodyweight'),
  // Core
  mk('Plank', 'core', 'bodyweight'),
  mk('Hanging leg raise', 'core', 'bodyweight'),
  mk('Cable crunch', 'core', 'cable'),
  mk('Russian twist', 'core', 'bodyweight'),
  mk('Ab wheel rollout', 'core', 'band'),
];

/** Build a user-created exercise with a real client-generated UUID. */
export function createCustomExercise(
  name: string,
  muscle: Muscle,
  equipment: Equipment,
): CatalogExercise {
  return { id: uuid(), name: name.trim(), muscle, equipment, isCustom: true };
}

export type CatalogState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; exercises: CatalogExercise[] };

// Preview loading / error on the simulator; null = the seeded catalog.
const FORCE_STATE: 'loading' | 'error' | null = null;

/** Mock catalog source. Returns a discriminated state the screen renders 1:1. */
export function useExerciseCatalog(): { state: CatalogState; refetch: () => void } {
  const refetch = () => {};
  if (FORCE_STATE === 'loading') return { state: { status: 'loading' }, refetch };
  if (FORCE_STATE === 'error') return { state: { status: 'error' }, refetch };
  return { state: { status: 'ready', exercises: SEED_CATALOG }, refetch };
}
