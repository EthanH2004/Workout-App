/**
 * Programs mock store — shaped to the Supabase hierarchy
 * (routines = program → routine_days = day → routine_day_exercises). In-memory
 * and reactive via useSyncExternalStore so every screen shares one source of
 * truth; array order stands in for the `position` column.
 *
 * Program model: the user has a library of programs and exactly ONE "current"
 * program (`currentProgramId`). `nextDayIndex` mocks the rotation through the
 * current program's days (advances after each finished workout).
 *
 * DATA-MODEL NOTE: persisting this needs a current-program flag — add
 * `profiles.current_program_id` (+ a per-program `next_day_index` or derive the
 * next day from the latest session). See Workout-Tracker-Data-Model.md.
 *
 * Naming mirrors the Home mock (Push Pull Legs → Push/Pull/Leg day).
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

export interface ProgramDay {
  id: string; // routine_day id
  name: string;
  exercises: DayExercise[];
}

export interface Program {
  id: string; // routines id
  name: string;
  days: ProgramDay[];
}

/** What the Day editor hands back on save (ids assigned by the store). */
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

function makeDay(name: string, exercises: DayExercise[]): ProgramDay {
  return { id: uuid(), name, exercises };
}

/* ---------------------------------- seed ---------------------------------- */

const PPL: Program = {
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

/* ------------------------------- templates -------------------------------- */

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
  {
    id: 'tmpl-ppl',
    name: 'Push Pull Legs',
    meta: '6 days/week · advanced',
    equipment: 'barbell',
    days: [
      {
        name: 'Push',
        exercises: [
          tex('Barbell bench press', 'barbell', 4, 8),
          tex('Overhead press', 'barbell', 3, 10),
          tex('Incline dumbbell press', 'dumbbell', 3, 10),
          tex('Cable fly', 'cable', 3, 12),
          tex('Triceps pushdown', 'cable', 3, 12),
        ],
      },
      {
        name: 'Pull',
        exercises: [
          tex('Deadlift', 'barbell', 3, 5),
          tex('Barbell row', 'barbell', 4, 8),
          tex('Lat pulldown', 'cable', 3, 12),
          tex('Seated cable row', 'cable', 3, 10),
          tex('Barbell curl', 'barbell', 3, 12),
        ],
      },
      {
        name: 'Legs',
        exercises: [
          tex('Back squat', 'barbell', 4, 8),
          tex('Romanian deadlift', 'barbell', 3, 10),
          tex('Leg press', 'machine', 3, 12),
          tex('Leg curl', 'machine', 3, 12),
          tex('Standing calf raise', 'machine', 4, 15),
        ],
      },
    ],
  },
];

/* -------------------------------- the store ------------------------------- */

interface StoreState {
  programs: Program[];
  currentProgramId: string | null;
  nextDayIndex: number; // rotation pointer into the current program's days
}

let state: StoreState = { programs: [PPL], currentProgramId: PPL.id, nextDayIndex: 0 };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}
function set(next: StoreState) {
  state = next;
  emit();
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function getSnapshot() {
  return state;
}

/** Reactive snapshot of the whole routines state. */
export function useRoutines(): StoreState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

/* ------------------------------- selectors -------------------------------- */

export function findProgram(programId: string): Program | null {
  return state.programs.find((p) => p.id === programId) ?? null;
}

export function findDay(dayId: string): { program: Program; day: ProgramDay } | null {
  for (const program of state.programs) {
    for (const day of program.days) {
      if (day.id === dayId) return { program, day };
    }
  }
  return null;
}

export function currentProgram(): Program | null {
  return state.currentProgramId ? findProgram(state.currentProgramId) : null;
}

export function programExerciseCount(program: Program): number {
  return program.days.reduce((n, d) => n + d.exercises.length, 0);
}

/* ------------------------------- mutations -------------------------------- */

export function setCurrentProgram(programId: string): void {
  set({ ...state, currentProgramId: programId, nextDayIndex: 0 });
}

export function deleteProgram(programId: string): void {
  const programs = state.programs.filter((p) => p.id !== programId);
  const currentProgramId =
    state.currentProgramId === programId ? (programs[0]?.id ?? null) : state.currentProgramId;
  set({ programs, currentProgramId, nextDayIndex: 0 });
}

function toDayExercise(input: DayExerciseInput): DayExercise {
  return { id: uuid(), ...input };
}

/** Update an existing day's name + exercises in place. */
export function updateDay(dayId: string, input: SaveDayInput): void {
  set({
    ...state,
    programs: state.programs.map((p) => ({
      ...p,
      days: p.days.map((d) =>
        d.id === dayId ? { ...d, name: input.name, exercises: input.exercises.map(toDayExercise) } : d,
      ),
    })),
  });
}

/** Copy-on-adopt (D2): clone a template into the library and make it current. */
export function adoptTemplate(templateId: string): { programId: string; firstDayId: string } | null {
  const template = TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;
  const days: ProgramDay[] = template.days.map((td) =>
    makeDay(
      td.name,
      td.exercises.map((e) =>
        toDayExercise({
          exerciseId: slug(e.name),
          name: e.name,
          equipment: e.equipment,
          targetSets: e.targetSets,
          targetReps: e.targetReps,
        }),
      ),
    ),
  );
  const program: Program = { id: uuid(), name: template.name, days };
  set({ programs: [...state.programs, program], currentProgramId: program.id, nextDayIndex: 0 });
  return { programId: program.id, firstDayId: days[0].id };
}

/** Create an empty program. Becomes current if the library was empty. */
export function createProgram(name: string): { programId: string } {
  const program: Program = { id: uuid(), name: name.trim() || 'New program', days: [] };
  set({
    programs: [...state.programs, program],
    currentProgramId: state.currentProgramId ?? program.id,
    nextDayIndex: 0,
  });
  return { programId: program.id };
}

// TODO(Part 3): retire once new days are created via the Program editor.
/** Interim: create a one-day program from the Day editor's "new" mode. */
export function createRoutine(input: SaveDayInput): { dayId: string } {
  const day: ProgramDay = { id: uuid(), name: input.name, exercises: input.exercises.map(toDayExercise) };
  const program: Program = { id: uuid(), name: input.name, days: [day] };
  set({
    programs: [...state.programs, program],
    currentProgramId: state.currentProgramId ?? program.id,
    nextDayIndex: 0,
  });
  return { dayId: day.id };
}
