import { supabase } from './client';
import type { Tables } from './database.types';
import type { WeightUnit } from '../../utils/units';

export type Profile = Tables<'profiles'>;
export type ExerciseRow = Tables<'exercises'>;

/**
 * The exercise catalog the user can see: global built-ins (owner_id null) plus
 * their own custom exercises. RLS does the scoping (`owner_id is null OR
 * owner_id = auth.uid()`), so we just select all live rows.
 */
export async function fetchExercises(): Promise<ExerciseRow[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .is('deleted_at', null)
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export interface NewCustomExercise {
  id: string; // client-generated UUID (offline-safe)
  ownerId: string;
  name: string;
  category: string; // muscle group
  equipment: string;
}

/** Insert a user's custom exercise (is_custom true). owner_id must be the caller. */
export async function insertCustomExercise(input: NewCustomExercise): Promise<void> {
  const { error } = await supabase.from('exercises').insert({
    id: input.id,
    owner_id: input.ownerId,
    name: input.name,
    category: input.category,
    equipment: input.equipment,
    is_custom: true,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/** Read the signed-in user's profile row (created by the signup trigger). */
export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Update the unit preference. We set updated_at on the client so last-write-wins
 * sync has a timestamp even for writes made offline (decision: client-owned updated_at).
 */
export async function updateUnitPreference(userId: string, unit: WeightUnit): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ unit_preference: unit, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}
