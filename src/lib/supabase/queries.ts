import { supabase } from './client';
import type { Tables } from './database.types';
import type { WeightUnit } from '../../utils/units';

export type Profile = Tables<'profiles'>;

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
