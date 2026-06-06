/**
 * Routines mock store — shaped to the Supabase hierarchy
 * (routines = group → routine_days = day → routine_day_exercises). In-memory and
 * reactive via useSyncExternalStore so the Routines tab and the Builder share one
 * source of truth; array order stands in for the `position` column. Swap for
 * TanStack Query + queries.ts when persistence lands.
 *
 * Naming mirrors the Home mock (Push Pull Legs → Push/Pull/Leg day) so the two
 * screens stay consistent.
 */
import { useSyncExternalStore } from 'react';
import type { Equipment } from '../../components/EquipmentIcon';
import { uuid } from '../../utils/uuid';

export interface DayExercise {
  id: string; // routine_day_exercise id
  exerciseId: string;
  name: string;
  equipment: Equipment | null;
  targetSets: number;
  targetReps: number;
}

export interface RoutineDay {
  id: string; // routine_day id
  name: string;
  exercises: DayExercise[];
}

export interface RoutineGroup {
  id: string; // routines id
  name: string;
  days: RoutineDay[];
}

/** What the Builder hands back on save (ids assigned by the store). */
export interface DayExerciseInput {
  exerciseId: string;
  name: string;
  equipment: Equipment | null;
  targetSets: number;
  targetReps: number;
}

export interface SaveDayInput {
  name: string;
  exercises: DayExerciseInput[];
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

function dayEx(name: string, equipment: Equipment, sets: number, reps: number): DayExercise {
  return { id: uuid(), exerciseId: slug(name), name, equipment, targetSets: sets, targetReps: reps };
}

function makeDay(name: string, exercises: DayExercise[]): RoutineDay {
  return { id: uuid(), name, exercises };
}

/* ---------------------------------- seed ---------------------------------- */

const PPL: RoutineGroup = {
  id: uuid(),
  name: 'Push Pull Legs',
  days: [
    makeDay('Push day', [
      dayEx('Barbell bench press', 'barbell', 4, 8),
      dayEx('Incline dumbbell press', 'dumbbell', 3, 10),
      dayEx('Seated shoulder press', 'dumbbell', 3, 10),
      dayEx('Cable fly', 'cable', 3, 12),
      dayEx('Triceps pushdown', 'cable', 3, 12),
      dayEx('Lateral raise', 'dumbbell', 3, 15),
    ]),
    makeDay('Pull day', [
      dayEx('Deadlift', 'barbell', 3, 5),
      dayEx('Barbell row', 'barbell', 4, 8),
      dayEx('Pull-up', 'bodyweight', 3, 10),
      dayEx('Lat pulldown', 'cable', 3, 12),
      dayEx('Seated cable row', 'cable', 3, 10),
      dayEx('Biceps curl', 'dumbbell', 3, 12),
    ]),
    makeDay('Leg day', [
      dayEx('Back squat', 'barbell', 4, 8),
      dayEx('Romanian deadlift', 'barbell', 3, 10),
      dayEx('Leg press', 'machine', 3, 12),
      dayEx('Leg curl', 'machine', 3, 12),
      dayEx('Standing calf raise', 'machine', 4, 15),
    ]),
  ],
};

/* -------------------------------- templates ------------------------------- */

interface TemplateExercise {
  name: string;
  equipment: Equipment;
  targetSets: number;
  targetReps: number;
}
export interface RoutineTemplate {
  id: string;
  name: string;
  meta: string; // "3 days/week · beginner"
  equipment: Equipment; // leading icon
  days: { name: string; exercises: TemplateExercise[] }[];
}

const tex = (
  name: string,
  equipment: Equipment,
  targetSets: number,
  targetReps: number,
): TemplateExercise => ({ name, equipment, targetSets, targetReps });

export const TEMPLATES: RoutineTemplate[] = [
  {
    id: 'tmpl-full-body',
    name: 'Full Body',
    meta: '3 days/week · beginner',
    equipment: 'barbell',
    days: [
      {
        name: 'Full Body A',
        exercises: [
          tex('Back squat', 'barbell', 3, 8),
          tex('Barbell bench press', 'barbell', 3, 8),
          tex('Barbell row', 'barbell', 3, 8),
          tex('Overhead press', 'barbell', 3, 10),
          tex('Plank', 'bodyweight', 3, 1),
        ],
      },
      {
        name: 'Full Body B',
        exercises: [
          tex('Deadlift', 'barbell', 3, 5),
          tex('Incline dumbbell press', 'dumbbell', 3, 10),
          tex('Lat pulldown', 'cable', 3, 12),
          tex('Dumbbell lateral raise', 'dumbbell', 3, 15),
          tex('Hanging leg raise', 'bodyweight', 3, 12),
        ],
      },
      {
        name: 'Full Body C',
        exercises: [
          tex('Front squat', 'barbell', 3, 8),
          tex('Dumbbell bench press', 'dumbbell', 3, 10),
          tex('Seated cable row', 'cable', 3, 12),
          tex('Hammer curl', 'dumbbell', 3, 12),
          tex('Triceps pushdown', 'cable', 3, 12),
        ],
      },
    ],
  },
  {
    id: 'tmpl-upper-lower',
    name: 'Upper / Lower',
    meta: '4 days/week · intermediate',
    equipment: 'dumbbell',
    days: [
      {
        name: 'Upper A',
        exercises: [
          tex('Barbell bench press', 'barbell', 4, 8),
          tex('Barbell row', 'barbell', 4, 8),
          tex('Overhead press', 'barbell', 3, 10),
          tex('Barbell curl', 'barbell', 3, 12),
        ],
      },
      {
        name: 'Lower A',
        exercises: [
          tex('Back squat', 'barbell', 4, 8),
          tex('Romanian deadlift', 'barbell', 3, 10),
          tex('Leg curl', 'machine', 3, 12),
          tex('Standing calf raise', 'machine', 4, 15),
        ],
      },
      {
        name: 'Upper B',
        exercises: [
          tex('Incline dumbbell press', 'dumbbell', 4, 10),
          tex('Lat pulldown', 'cable', 4, 12),
          tex('Dumbbell lateral raise', 'dumbbell', 3, 15),
          tex('Triceps pushdown', 'cable', 3, 12),
        ],
      },
      {
        name: 'Lower B',
        exercises: [
          tex('Deadlift', 'barbell', 3, 5),
          tex('Leg press', 'machine', 4, 12),
          tex('Leg extension', 'machine', 3, 15),
          tex('Standing calf raise', 'machine', 4, 15),
        ],
      },
    ],
  },
];

/* -------------------------------- the store ------------------------------- */

let state: { groups: RoutineGroup[] } = { groups: [PPL] };
const listeners = new Set<() => void>();

function emit() {
  state = { ...state };
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() {
  return state;
}

/** Reactive list of routine groups. */
export function useRoutineGroups(): RoutineGroup[] {
  return useSyncExternalStore(subscribe, getSnapshot).groups;
}

export function findDay(dayId: string): { group: RoutineGroup; day: RoutineDay } | null {
  for (const group of state.groups) {
    for (const day of group.days) {
      if (day.id === dayId) return { group, day };
    }
  }
  return null;
}

function toDayExercise(input: DayExerciseInput): DayExercise {
  return { id: uuid(), ...input };
}

/** Update an existing day's name + exercises in place. */
export function updateDay(dayId: string, input: SaveDayInput): void {
  state = {
    groups: state.groups.map((g) => ({
      ...g,
      days: g.days.map((d) =>
        d.id === dayId ? { ...d, name: input.name, exercises: input.exercises.map(toDayExercise) } : d,
      ),
    })),
  };
  emit();
}

/** Create a new standalone routine (a one-day group). */
export function createRoutine(input: SaveDayInput): { dayId: string } {
  const day: RoutineDay = { id: uuid(), name: input.name, exercises: input.exercises.map(toDayExercise) };
  const group: RoutineGroup = { id: uuid(), name: input.name, days: [day] };
  state = { groups: [...state.groups, group] };
  emit();
  return { dayId: day.id };
}

/** Copy-on-adopt (data-model D2): clone a template into the user's routines. */
export function cloneTemplate(templateId: string): { firstDayId: string } | null {
  const template = TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;
  const days: RoutineDay[] = template.days.map((td) => ({
    id: uuid(),
    name: td.name,
    exercises: td.exercises.map((e) =>
      toDayExercise({
        exerciseId: slug(e.name),
        name: e.name,
        equipment: e.equipment,
        targetSets: e.targetSets,
        targetReps: e.targetReps,
      }),
    ),
  }));
  const group: RoutineGroup = { id: uuid(), name: template.name, days };
  state = { groups: [...state.groups, group] };
  emit();
  return { firstDayId: days[0].id };
}

/** Total exercises across a group's days. */
export function groupExerciseCount(group: RoutineGroup): number {
  return group.days.reduce((n, d) => n + d.exercises.length, 0);
}
