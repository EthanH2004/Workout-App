import { randomUUID } from 'expo-crypto';

/**
 * Client-generated UUID for every new row (so offline writes get a permanent ID
 * with no server round-trip). One place, used everywhere a row is created.
 */
export function uuid(): string {
  return randomUUID();
}
