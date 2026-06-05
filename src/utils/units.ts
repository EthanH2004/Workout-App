/**
 * Weight unit conversion. Canonical storage is kilograms (decision D1); display
 * converts to the user's preference and rounds to the nearest plate increment
 * (0.5 lb / 0.25 kg) for display only — never for storage.
 */
export type WeightUnit = 'lb' | 'kg';

const LB_PER_KG = 2.2046226218;

/** Smallest meaningful display step per unit (a half-pound / quarter-kilo). */
const DISPLAY_INCREMENT: Record<WeightUnit, number> = { lb: 0.5, kg: 0.25 };

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG;
}

export function lbToKg(lb: number): number {
  return lb / LB_PER_KG;
}

function roundTo(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}

/** Canonical kg → the user's unit, rounded to a sensible plate increment for display. */
export function toDisplayWeight(kg: number, unit: WeightUnit): number {
  const converted = unit === 'kg' ? kg : kgToLb(kg);
  return roundTo(converted, DISPLAY_INCREMENT[unit]);
}

/** A value the user typed (in their unit) → canonical kg for storage (unrounded). */
export function fromDisplayWeight(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : lbToKg(value);
}

/** "135 lb" / "60 kg" — tabular-friendly display string. */
export function formatWeight(kg: number, unit: WeightUnit): string {
  const display = toDisplayWeight(kg, unit);
  // Drop a trailing .0 / .00 so whole numbers read cleanly.
  const text = Number.isInteger(display) ? String(display) : String(display);
  return `${text} ${unit}`;
}
