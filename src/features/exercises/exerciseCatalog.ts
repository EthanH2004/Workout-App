/**
 * Exercise catalog types + the muscle taxonomy. The data now comes from Supabase
 * (see useExercises.ts / queries.fetchExercises); this file maps DB rows to the
 * view model the picker renders and is the home of the shared types.
 */
import type { Equipment } from '../../components/EquipmentIcon';
import type { ExerciseRow } from '../../lib/supabase/queries';

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

/** Map a DB exercises row to the picker's view model. Seed + custom rows store
 *  category/equipment as the lowercase Muscle/Equipment keys. */
export function rowToCatalog(row: ExerciseRow): CatalogExercise {
  return {
    id: row.id,
    name: row.name,
    muscle: (row.category ?? 'chest') as Muscle,
    equipment: (row.equipment ?? 'barbell') as Equipment,
    isCustom: row.is_custom,
  };
}
