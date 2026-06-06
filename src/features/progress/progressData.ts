/**
 * Progress / Exercise-detail data — MOCK, shaped to the session schema
 * (workout_sessions → session_sets summarized per exercise). Every derived value
 * (e1RM, volume, PRs, deltas) is computed here from the raw sets via the /utils
 * helpers — never stored. Swap for TanStack queries over queries.ts later.
 */
import { epleyOneRepMax } from '../../utils/oneRepMax';
import { lbToKg, toDisplayInt, type WeightUnit } from '../../utils/units';
import { groupThousands } from '../../utils/format';

export type Metric = 'e1rm' | 'volume' | 'heaviest';
export type Range = '1M' | '3M' | '6M' | '1Y' | 'All';

export const RANGES: Range[] = ['1M', '3M', '6M', '1Y', 'All'];

export const METRIC_LABEL: Record<Metric, string> = {
  e1rm: 'Estimated 1RM',
  volume: 'Total volume',
  heaviest: 'Heaviest weight',
};

const RANGE_COUNT: Record<Range, number> = { '1M': 4, '3M': 8, '6M': 8, '1Y': 8, All: 8 };
const RANGE_LABEL: Record<Range, string> = {
  '1M': '30d',
  '3M': '90d',
  '6M': '180d',
  '1Y': '1y',
  All: 'all',
};

interface LiftSession {
  dateLabel: string;
  weightKg: number; // top set weight
  reps: number; // top set reps
  volumeKg: number; // exercise volume that session
}

interface Lift {
  id: string;
  name: string;
  sessions: LiftSession[]; // oldest → newest
}

/** Build a lift from [topSetLb, reps, dateLabel] rows; volume ≈ 4 working sets. */
function lift(id: string, name: string, rows: [number, number, string][]): Lift {
  return {
    id,
    name,
    sessions: rows.map(([lb, reps, dateLabel]) => ({
      dateLabel,
      weightKg: lbToKg(lb),
      reps,
      volumeKg: lbToKg(lb) * reps * 4,
    })),
  };
}

const LIFTS: Lift[] = [
  lift('bench-press', 'Bench press', [
    [130, 8, 'Apr 13'],
    [130, 8, 'Apr 20'],
    [132.5, 8, 'Apr 27'],
    [130, 8, 'May 4'],
    [135, 7, 'May 11'],
    [132.5, 8, 'May 18'],
    [135, 8, 'May 25'],
    [140, 8, 'Jun 1'],
  ]),
  lift('squat', 'Squat', [
    [225, 5, 'Apr 12'],
    [235, 5, 'Apr 19'],
    [235, 5, 'Apr 26'],
    [245, 5, 'May 3'],
    [245, 5, 'May 10'],
    [255, 5, 'May 17'],
    [255, 5, 'May 24'],
    [265, 5, 'May 31'],
  ]),
  lift('deadlift', 'Deadlift', [
    [275, 5, 'Apr 14'],
    [285, 5, 'Apr 21'],
    [295, 5, 'Apr 28'],
    [295, 3, 'May 5'],
    [305, 5, 'May 12'],
    [315, 4, 'May 19'],
    [315, 5, 'May 26'],
    [325, 5, 'Jun 2'],
  ]),
  lift('overhead-press', 'Overhead press', [
    [85, 8, 'Apr 15'],
    [85, 8, 'Apr 22'],
    [90, 6, 'Apr 29'],
    [90, 7, 'May 6'],
    [90, 8, 'May 13'],
    [95, 6, 'May 20'],
    [95, 7, 'May 27'],
    [100, 6, 'Jun 3'],
  ]),
];

const round = Math.round;

function rawMetricKg(s: LiftSession, metric: Metric): number {
  if (metric === 'e1rm') return epleyOneRepMax(s.weightKg, s.reps);
  if (metric === 'volume') return s.volumeKg;
  return s.weightKg;
}

/** Metric value in the display unit, as a whole number. */
function displayMetric(s: LiftSession, metric: Metric, unit: WeightUnit): number {
  return toDisplayInt(rawMetricKg(s, metric), unit);
}

/** Cumulative-max PR flags (raw kg, so they don't shift with the display unit). */
function prFlags(sessions: LiftSession[], metric: Metric): boolean[] {
  let max = -Infinity;
  return sessions.map((s, i) => {
    const v = rawMetricKg(s, metric);
    const isPR = i > 0 && v > max + 0.0001;
    if (v > max) max = v;
    return isPR;
  });
}

function findLift(id: string): Lift | null {
  return LIFTS.find((l) => l.id === id) ?? null;
}

export function liftExists(id: string): boolean {
  return !!findLift(id);
}

/* -------------------------------- Progress -------------------------------- */

export interface ProgressLiftRow {
  id: string;
  name: string;
  e1rmLabel: string; // "176 lb"
  deltaLb: number;
  sparkline: number[]; // e1RM series (lb)
  thin: boolean;
}

export function progressLifts(unit: WeightUnit): ProgressLiftRow[] {
  return LIFTS.map((l) => {
    const e1rms = l.sessions.map((s) => displayMetric(s, 'e1rm', unit));
    const latest = e1rms[e1rms.length - 1];
    return {
      id: l.id,
      name: l.name,
      e1rmLabel: `${groupThousands(latest)} ${unit}`,
      deltaLb: latest - e1rms[0],
      sparkline: e1rms,
      thin: l.sessions.length < 2,
    };
  });
}

// Weekly total training volume (kg), oldest → newest, for the volume card.
const WEEKLY_VOLUME_KG = [
  4200, 4550, 4380, 4720, 4600, 4900, 5050, 4820, 5200, 5380, 5240, 5600,
];
const WEEK_COUNT: Record<Range, number> = { '1M': 4, '3M': 8, '6M': 12, '1Y': 12, All: 12 };

export interface VolumeCard {
  bars: number[]; // lb per week (shown range)
  totalLabel: string; // "96,400"
  deltaPct: number;
}

export function weeklyVolume(range: Range, unit: WeightUnit): VolumeCard {
  const count = WEEK_COUNT[range];
  const weeksKg = WEEKLY_VOLUME_KG.slice(-count);
  const bars = weeksKg.map((kg) => toDisplayInt(kg, unit));
  const totalKg = weeksKg.reduce((a, b) => a + b, 0);
  // % vs the previous 4 weeks ("vs last month") — unit-independent.
  const recent = WEEKLY_VOLUME_KG.slice(-4).reduce((a, b) => a + b, 0);
  const prior = WEEKLY_VOLUME_KG.slice(-8, -4).reduce((a, b) => a + b, 0);
  const deltaPct = prior > 0 ? round(((recent - prior) / prior) * 100) : 0;
  return { bars, totalLabel: groupThousands(toDisplayInt(totalKg, unit)), deltaPct };
}

/* ----------------------------- Exercise detail ---------------------------- */

export interface ChartPoint {
  value: number;
  label: string; // date
  isPR: boolean;
}

export interface LiftDetail {
  name: string;
  unit: string;
  points: ChartPoint[];
  heroValue: number;
  delta: number;
  deltaLabel: string;
  bestSet: string; // "155 × 6"
  heaviestLabel: string; // "165 lb"
  prLabel: string; // "176 lb"
  history: { dateLabel: string; bestSet: string; e1rm: number; isPR: boolean }[];
  thin: boolean;
}

export function liftDetail(id: string, metric: Metric, range: Range, unit: WeightUnit): LiftDetail | null {
  const l = findLift(id);
  if (!l) return null;

  const flags = prFlags(l.sessions, metric);
  const start = Math.max(0, l.sessions.length - RANGE_COUNT[range]);
  const points: ChartPoint[] = l.sessions.slice(start).map((s, i) => ({
    value: displayMetric(s, metric, unit),
    label: s.dateLabel,
    isPR: flags[start + i],
  }));

  const heroValue = points.length ? points[points.length - 1].value : 0;
  const delta = points.length > 1 ? heroValue - points[0].value : 0;

  // Lifetime stats (always e1RM-based for "best set" + PR·1RM).
  const e1rms = l.sessions.map((s) => displayMetric(s, 'e1rm', unit));
  let bestIdx = 0;
  e1rms.forEach((v, i) => {
    if (v > e1rms[bestIdx]) bestIdx = i;
  });
  const bestS = l.sessions[bestIdx];
  const heaviest = Math.max(...l.sessions.map((s) => toDisplayInt(s.weightKg, unit)));
  const e1Flags = prFlags(l.sessions, 'e1rm');

  return {
    name: l.name,
    unit,
    points,
    heroValue,
    delta,
    deltaLabel: RANGE_LABEL[range],
    bestSet: `${toDisplayInt(bestS.weightKg, unit)} × ${bestS.reps}`,
    heaviestLabel: `${groupThousands(heaviest)} ${unit}`,
    prLabel: `${groupThousands(Math.max(...e1rms))} ${unit}`,
    history: l.sessions
      .map((s, i) => ({
        dateLabel: s.dateLabel,
        bestSet: `${toDisplayInt(s.weightKg, unit)} × ${s.reps}`,
        e1rm: e1rms[i],
        isPR: e1Flags[i],
      }))
      .reverse(),
    thin: l.sessions.length < 2,
  };
}
