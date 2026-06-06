/**
 * Progress / Exercise-detail data — live now. Sessions come from Supabase
 * (fetchProgressSessions), cached for offline via TanStack Query + the MMKV
 * persister; every derived value (e1RM via the Epley util, volume, heaviest,
 * PRs, deltas) is computed here from the raw sets and never stored.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchProgressSessions, type ProgressSessionRow } from '../../lib/supabase/queries';
import { epleyOneRepMax } from '../../utils/oneRepMax';
import { toDisplayInt, type WeightUnit } from '../../utils/units';
import { formatShortDate, groupThousands } from '../../utils/format';
import { useAuth } from '../auth/AuthProvider';

export type Metric = 'e1rm' | 'volume' | 'heaviest';
export type Range = '1M' | '3M' | '6M' | '1Y' | 'All';

export const RANGES: Range[] = ['1M', '3M', '6M', '1Y', 'All'];

export const METRIC_LABEL: Record<Metric, string> = {
  e1rm: 'Estimated 1RM',
  volume: 'Total volume',
  heaviest: 'Heaviest weight',
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const RANGE_DAYS: Record<Range, number | null> = {
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
  All: null,
};
const RANGE_LABEL: Record<Range, string> = {
  '1M': '30d',
  '3M': '90d',
  '6M': '180d',
  '1Y': '1y',
  All: 'all',
};
const WEEK_COUNT: Record<Range, number> = { '1M': 4, '3M': 8, '6M': 12, '1Y': 12, All: 12 };

/* ----------------------------- derived model ------------------------------ */

/** One exercise's performance in one session (canonical kg). */
interface SessionSummary {
  date: Date;
  dateLabel: string;
  e1rmKg: number; // best estimated 1RM that session
  e1rmWeightKg: number; // the set that produced it
  e1rmReps: number;
  heaviestKg: number; // top weight that session
  heaviestReps: number;
  volumeKg: number; // exercise volume that session
}

export interface LiftSeries {
  id: string; // exercise_id
  name: string;
  sessions: SessionSummary[]; // oldest → newest
}

export interface SessionVolume {
  date: Date;
  volumeKg: number; // whole-session volume across all exercises
}

/** Build the per-exercise series + per-session volumes from raw rows (desc). */
function build(rows: ProgressSessionRow[]): { lifts: LiftSeries[]; sessionVolumes: SessionVolume[] } {
  const ascending = [...rows].reverse();
  const byExercise = new Map<string, LiftSeries>();
  const sessionVolumes: SessionVolume[] = [];

  for (const s of ascending) {
    const date = new Date(s.started_at);
    let sessionVol = 0;

    for (const ex of s.session_exercises) {
      const sets = ex.session_sets.filter(
        (x) => x.completed && x.weight_kg != null && x.reps != null,
      );
      if (sets.length === 0) continue;

      let e1rmKg = 0;
      let e1rmWeightKg = 0;
      let e1rmReps = 0;
      let heaviestKg = -1;
      let heaviestReps = 0;
      let volumeKg = 0;
      for (const set of sets) {
        const w = set.weight_kg as number;
        const r = set.reps as number;
        const e = epleyOneRepMax(w, r);
        if (e > e1rmKg) {
          e1rmKg = e;
          e1rmWeightKg = w;
          e1rmReps = r;
        }
        if (w > heaviestKg) {
          heaviestKg = w;
          heaviestReps = r;
        }
        volumeKg += w * r;
      }
      sessionVol += volumeKg;

      const summary: SessionSummary = {
        date,
        dateLabel: formatShortDate(date),
        e1rmKg,
        e1rmWeightKg,
        e1rmReps,
        heaviestKg: Math.max(0, heaviestKg),
        heaviestReps,
        volumeKg,
      };
      const existing = byExercise.get(ex.exercise_id);
      if (existing) {
        existing.sessions.push(summary);
        existing.name = ex.exercise_name; // latest name wins
      } else {
        byExercise.set(ex.exercise_id, {
          id: ex.exercise_id,
          name: ex.exercise_name,
          sessions: [summary],
        });
      }
    }

    if (sessionVol > 0) sessionVolumes.push({ date, volumeKg: sessionVol });
  }

  const lifts = [...byExercise.values()];
  // Most recently trained first.
  lifts.sort(
    (a, b) =>
      b.sessions[b.sessions.length - 1].date.getTime() -
      a.sessions[a.sessions.length - 1].date.getTime(),
  );
  return { lifts, sessionVolumes };
}

function rawMetricKg(s: SessionSummary, metric: Metric): number {
  if (metric === 'e1rm') return s.e1rmKg;
  if (metric === 'volume') return s.volumeKg;
  return s.heaviestKg;
}

/** Cumulative-max PR flags (raw kg, so they don't shift with the display unit). */
function prFlags(sessions: SessionSummary[], value: (s: SessionSummary) => number): boolean[] {
  let max = -Infinity;
  return sessions.map((s, i) => {
    const v = value(s);
    const isPR = i > 0 && v > max + 1e-6;
    if (v > max) max = v;
    return isPR;
  });
}

/* -------------------------------- Progress -------------------------------- */

export interface ProgressLiftRow {
  id: string;
  name: string;
  e1rmLabel: string; // "176 lb"
  deltaLb: number; // 90-day change, in the display unit
  sparkline: number[]; // e1RM series (display unit)
  thin: boolean;
}

/** Per-lift rows: latest e1RM + a 90-day trend + sparkline. */
export function progressLifts(lifts: LiftSeries[], unit: WeightUnit): ProgressLiftRow[] {
  const cutoff = Date.now() - 90 * DAY_MS;
  return lifts.map((l) => {
    const window = l.sessions.filter((s) => s.date.getTime() >= cutoff);
    const thin = window.length < 2;
    const latest = toDisplayInt(l.sessions[l.sessions.length - 1].e1rmKg, unit);
    const series = window.map((s) => toDisplayInt(s.e1rmKg, unit));
    return {
      id: l.id,
      name: l.name,
      e1rmLabel: `${groupThousands(latest)} ${unit}`,
      deltaLb: thin ? 0 : series[series.length - 1] - series[0],
      sparkline: thin ? [latest] : series,
      thin,
    };
  });
}

export interface VolumeCard {
  bars: number[]; // per week (display unit), oldest → newest
  totalLabel: string; // "96,400"
  deltaPct: number;
}

/** Weekly total training volume for the range (+ a 4-week-over-4-week delta). */
export function weeklyVolume(
  sessionVolumes: SessionVolume[],
  range: Range,
  unit: WeightUnit,
): VolumeCard {
  const now = Date.now();
  const count = WEEK_COUNT[range];
  const buckets = new Array(Math.max(count, 8)).fill(0) as number[];
  for (const sv of sessionVolumes) {
    const wi = Math.floor((now - sv.date.getTime()) / WEEK_MS);
    if (wi >= 0 && wi < buckets.length) buckets[wi] += sv.volumeKg;
  }
  const weeksKg = buckets.slice(0, count).reverse(); // oldest → newest
  const bars = weeksKg.map((kg) => toDisplayInt(kg, unit));
  const totalKg = weeksKg.reduce((a, b) => a + b, 0);
  const recent = buckets.slice(0, 4).reduce((a, b) => a + b, 0);
  const prior = buckets.slice(4, 8).reduce((a, b) => a + b, 0);
  const deltaPct = prior > 0 ? Math.round(((recent - prior) / prior) * 100) : 0;
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
  bestSet: string; // "155 × 6" — the best single set by e1RM
  heaviestLabel: string; // "165 lb"
  prLabel: string; // "176 lb" — best e1RM ever
  history: { dateLabel: string; bestSet: string; e1rm: number; isPR: boolean }[];
  thin: boolean;
}

/** One lift's detail for the selected metric + range (display unit). */
export function liftDetail(
  lift: LiftSeries,
  metric: Metric,
  range: Range,
  unit: WeightUnit,
): LiftDetail {
  const sessions = lift.sessions; // ascending
  const metricFlags = prFlags(sessions, (s) => rawMetricKg(s, metric));
  const days = RANGE_DAYS[range];
  const cutoff = days == null ? -Infinity : Date.now() - days * DAY_MS;

  const points: ChartPoint[] = [];
  sessions.forEach((s, i) => {
    if (s.date.getTime() < cutoff) return;
    points.push({
      value: toDisplayInt(rawMetricKg(s, metric), unit),
      label: s.dateLabel,
      isPR: metricFlags[i],
    });
  });

  const heroValue = points.length ? points[points.length - 1].value : 0;
  const delta = points.length > 1 ? heroValue - points[0].value : 0;

  // Lifetime stats.
  let bestIdx = 0;
  sessions.forEach((s, i) => {
    if (s.e1rmKg > sessions[bestIdx].e1rmKg) bestIdx = i;
  });
  const best = sessions[bestIdx];
  const heaviestKg = Math.max(...sessions.map((s) => s.heaviestKg));

  // PR (#3): a new best e1RM OR a new heaviest set.
  const e1rmFlags = prFlags(sessions, (s) => s.e1rmKg);
  const heaviestFlags = prFlags(sessions, (s) => s.heaviestKg);

  return {
    name: lift.name,
    unit,
    points,
    heroValue,
    delta,
    deltaLabel: RANGE_LABEL[range],
    bestSet: `${toDisplayInt(best.e1rmWeightKg, unit)} × ${best.e1rmReps}`,
    heaviestLabel: `${groupThousands(toDisplayInt(heaviestKg, unit))} ${unit}`,
    prLabel: `${groupThousands(toDisplayInt(best.e1rmKg, unit))} ${unit}`,
    history: sessions
      .map((s, i) => ({
        dateLabel: s.dateLabel,
        bestSet: `${toDisplayInt(s.heaviestKg, unit)} × ${s.heaviestReps}`,
        e1rm: toDisplayInt(s.e1rmKg, unit),
        isPR: e1rmFlags[i] || heaviestFlags[i],
      }))
      .reverse(),
    thin: sessions.length < 2,
  };
}

/* --------------------------------- hooks ---------------------------------- */

export type ProgressState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'empty' } // no logged data yet
  | { status: 'ready'; lifts: LiftSeries[]; sessionVolumes: SessionVolume[] };

export type DetailState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'empty' } // this exercise has no logged history
  | { status: 'ready'; lift: LiftSeries };

const sessionsKey = (userId: string | undefined) => ['progress-sessions', userId];

function useBuiltSessions() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const query = useQuery({
    queryKey: sessionsKey(userId),
    enabled: !!userId,
    queryFn: fetchProgressSessions,
  });
  const built = useMemo(() => (query.data ? build(query.data) : null), [query.data]);
  return { query, built };
}

/** Live Progress data (cached offline). */
export function useProgress(): { state: ProgressState; refetch: () => void } {
  const { query, built } = useBuiltSessions();
  const refetch = () => void query.refetch();

  if (!built) {
    return { state: query.isError ? { status: 'error' } : { status: 'loading' }, refetch };
  }
  if (built.lifts.length === 0) return { state: { status: 'empty' }, refetch };
  return {
    state: { status: 'ready', lifts: built.lifts, sessionVolumes: built.sessionVolumes },
    refetch,
  };
}

/** Live detail for one exercise (shares the Progress cache). */
export function useLiftDetail(id: string | undefined): { state: DetailState; refetch: () => void } {
  const { query, built } = useBuiltSessions();
  const refetch = () => void query.refetch();

  if (!built) {
    return { state: query.isError ? { status: 'error' } : { status: 'loading' }, refetch };
  }
  const lift = id ? (built.lifts.find((l) => l.id === id) ?? null) : null;
  if (!lift) return { state: { status: 'empty' }, refetch };
  return { state: { status: 'ready', lift }, refetch };
}
