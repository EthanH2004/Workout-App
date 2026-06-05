# Workout Tracker — v1 Build Handoff

This is the build packet for v1. It pairs with the eleven HTML screen mockups (`screen-*.html`) — each mockup is the **visual source of truth**; this doc is the **spec + build instructions**.

Stack assumed: **React Native + Expo**, TypeScript, file-based navigation (Expo Router or React Navigation). Local-first with Supabase cloud sync (the UI is sync-agnostic).

How to use it: build screen-by-screen in the suggested order. For each screen there's (1) a spec covering layout, components, every state, and interactions, and (2) a ready Claude Code prompt — paste it into Claude Code **with the matching `screen-*.html` file attached** and it'll have everything it needs.

---

## 1. Foundations

### 1.1 Theme tokens

> **Reference only.** The repo already ships `src/theme/tokens.ts` (plus a typed data layer in `src/lib/supabase/queries.ts` and pure helpers in `src/utils/` from M2) — those are the source of truth. The block below documents what's there; use the real `tokens.ts` and, if a token is missing, add it there rather than recreating this object.

Reference it everywhere. These match the design system exactly — don't hand-pick colors outside this object.

```ts
export const color = {
  bg: '#0A0A0B',            // app background — never pure #000
  surface: '#141416',        // cards
  surfaceRaised: '#1E1E21',  // active/raised cards, inputs, secondary buttons
  surfaceOverlay: '#26262A', // sheets (number pad), scrub bubble
  surfaceHigh: '#2E2E33',    // plate chips, keypad pressed, toggle track (off)

  borderSubtle: 'rgba(255,255,255,0.07)',
  borderDefault: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.16)',

  textPrimary: '#FFFFFF',
  textSecondary: '#9A9A9D',
  textTertiary: '#6A6A6D',
  textDisabled: '#4A4A4D',
  ghostTarget: '#838388',    // "last time" target numbers to beat

  accent: '#FF6A28',         // the only saturated brand color
  accentPressed: '#E0561C',
  accentText: '#FF8A4D',     // small accent text on dark
  accentSubtle: 'rgba(255,106,40,0.14)',
  accentBorder: 'rgba(255,106,40,0.40)',
  textOnAccent: '#141210',   // near-black — text/glyphs ON orange, NEVER white

  success: '#3DDC84',
  destructive: '#FF5C5C',
  pr: '#A98BFF',             // PR violet — personal records ONLY, solid dot/badge
  prSubtle: 'rgba(169,139,255,0.15)',
  warning: '#E8A33A',
} as const;

export const radius = { xs: 4, sm: 8, md: 12, lg: 16, full: 9999 } as const;

export const space = { screenX: 16, card: 16, section: 24, setRowY: 12 } as const;

export const elevation = {
  e1: { shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 20, shadowOffset: { width: 0, height: 6 } },
  e2: { shadowColor: '#000', shadowOpacity: 0.50, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
  e3: { shadowColor: '#000', shadowOpacity: 0.60, shadowRadius: 36, shadowOffset: { width: 0, height: -12 } },
  fab: { shadowColor: '#FF6A28', shadowOpacity: 0.42, shadowRadius: 22, shadowOffset: { width: 0, height: 8 } },
};
```

### 1.2 Typography

One family: **Archivo**. Load the static weights (400/500/600/700). For hero/expanded text, use the static Archivo Expanded family the project already loads (no variable font axis). In Expo, load via `expo-font` / `@expo-google-fonts/archivo`. The expanded look is used only for hero numbers and big titles.

| Token | Size / weight | Use |
|---|---|---|
| displayXL | 48 / expanded | number-pad weight entry |
| displayL | 34 / expanded | hero stat (1RM on detail) |
| titleXL | 28 / expanded | screen hero ("Ready to lift") |
| title | 20–24 / 600 | screen/section titles |
| headline | 17 / 600 | card titles, exercise names |
| body | 16 / 400 | content |
| bodyStrong | 15 / 500 | row labels, buttons |
| caption | 13 / 400 | sub-text |
| overline | 11 / 500, 0.13em, UPPERCASE | section labels |

All numerals **tabular** (`fontVariantNumeric: ['tabular-nums']` or the Archivo tabular feature). Content is sentence case; UPPERCASE only for overline labels.

### 1.3 Data model

> **Reference only.** The repo already ships the typed data layer (`src/lib/supabase/queries.ts`) and the derived-value helpers in `src/utils/` (`oneRepMax.ts`, `volume.ts`, `units.ts`, `uuid.ts`) from M2, alongside `src/theme/tokens.ts` — those are the source of truth. The types and formulas below are reference; defer to the code (and to `Workout-Tracker-Data-Model.md` for the Supabase schema).

```ts
type Units = 'lb' | 'kg';
type Equipment = 'barbell' | 'dumbbell' | 'kettlebell' | 'plate' | 'bodyweight' | 'cable' | 'machine' | 'band';
type Muscle = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core';

interface Exercise {
  id: string;
  name: string;            // "Barbell bench press"
  primaryMuscle: Muscle;
  equipment: Equipment;
  isCustom: boolean;
}

interface RoutineExercise {
  exerciseId: string;
  targetSets: number;      // e.g. 4
  targetReps: number;      // e.g. 8
  order: number;
}

interface Routine {
  id: string;
  name: string;            // "Push day"
  groupId?: string;        // belongs to a RoutineGroup (e.g. PPL)
  exercises: RoutineExercise[];
}

interface RoutineGroup {    // a split / folder, e.g. "Push Pull Legs"
  id: string;
  name: string;
  routineIds: string[];
}

interface SetEntry {
  weight: number;          // in the user's units, stored canonical (kg) + display-converted
  reps: number;
  completed: boolean;
}

interface WorkoutExercise {
  exerciseId: string;
  sets: SetEntry[];
}

interface Workout {
  id: string;
  routineId?: string;      // null = freestyle / quick start
  name: string;            // "Push day"
  startedAt: number;       // epoch ms
  endedAt?: number;
  exercises: WorkoutExercise[];
}

type PRType = 'e1RM' | 'heaviest' | 'bestSet';
interface PersonalRecord {
  exerciseId: string;
  type: PRType;
  value: number;
  reps?: number;           // for bestSet (e.g. 155 × 6)
  date: number;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  authProvider: 'apple' | 'email';
  units: Units;            // default 'lb'
  joinedAt: number;
}
```

**Estimated 1RM (the primary progress metric).** Use **Epley**:

```
e1RM = weight * (1 + reps / 30)
```

A set's e1RM feeds the per-exercise e1RM stat (the max over the chosen range). "Previous / ghost target" on the logging screen = the matching set from the most recent completed session of that exercise. A **PR** fires when a new max is set for any `PRType` — surface it as the violet PR chip/dot.

**Units:** store canonical (kg) and convert for display; default display unit is `lb`. The Settings units toggle flips display only.

### 1.4 Navigation map

```
Tab bar (translucent, blur): Home · Routines · [Start FAB] · Progress · Profile
  Home        (tab)
  Routines    (tab)
    └ Routine builder      (modal/stack — Cancel/Save header)
        └ Exercise picker  (modal over builder — Cancel/Done header)
  Progress    (tab)
    └ Exercise detail      (stack push — back header)
  Profile     (tab)
    └ Settings             (stack push — back header)
  Start FAB → Active workout (full-screen modal flow, NO tab bar)
        └ Number pad       (bottom sheet over Active workout)
  Welcome / sign-in        (pre-auth, outside the tab navigator)
```

Screens **with** the tab bar: Home, Routines, Progress, Profile.
Screens **without** (full-screen / modal / stack): Active workout, Number pad, Routine builder, Exercise picker, Exercise detail, Settings, Welcome.

### 1.5 Shared components

Build these once: `ScreenScaffold` (status-bar-safe padding + scroll), `Card` (surface/raised variants + elevation), `Button` (primary/secondary/tertiary/destructive, h≈50–52), `EquipmentIcon` (the 8-icon set — SVGs are in the mockups, reuse verbatim), `SetRow`, `StatCard`, `SectionLabel` (overline), `TabBar` + `StartFab`, `RangeChips`, `Toggle`, `SegmentedControl`. Icons are Phosphor line style (1.5px, round caps); active tab icons are filled accent.

### 1.6 Hard rules (don't break these)

- Background is `#0A0A0B`, never pure `#000`.
- Text/glyphs on orange are `textOnAccent` (#141210), **never white**.
- Violet (`pr`) is for personal records only — small solid dot/badge, never a gradient or fill.
- Accent orange is the only saturated color; it's a seasoning, not a coat of paint.
- Deltas: gains use accent, losses use `textSecondary` — no red/green good/bad coding.
- No emoji, no neon, no bubble corners, no social-feed patterns. Calm and premium.

---

## 2. Screens

### 2.1 Home — `screen-home.html` ✅ approved

**Purpose:** landing after launch; one-tap into today's session.

**Layout (top→bottom):** status bar → hero ("Ready to lift" in titleXL expanded + date secondary) → "Up next" card (routine name, 3 exercise previews + "+N more", orange **Start workout** button) → "Last 7 days" 2-up stat strip (workouts / volume) → "Recent" list (last 2 sessions: name, date, quick stat) → tab bar (Home active).

**States:**
- *Populated:* as mocked.
- *Empty (new user, no routine/history):* hero becomes a welcome; "Up next" card shows "Start your first workout" with a primary that opens Routines/quick-start; hide "Last 7 days" and "Recent".
- *No routine but has history:* "Up next" suggests "Start an empty workout" + a "Pick a routine" link.
- *Loading:* skeleton blocks for the card + stat strip (no spinner).
- *Error (sync/load fail):* keep last-known cached content; small inline "Couldn't refresh" with retry. Never block the Start button.

**Interactions:** Start workout → Active workout (full-screen). Tapping a recent session → that workout's summary (read-only). Stat strip is non-interactive in v1.

```text
CLAUDE CODE PROMPT — Home
Attach: screen-home.html, theme/tokens.ts
Build app/(tabs)/index.tsx as the Home screen in React Native + Expo, matching screen-home.html pixel-for-pixel (layout, type scale, spacing, colors). Use the theme tokens from tokens.ts — no ad-hoc colors. Archivo font, static Archivo Expanded for the "Ready to lift" hero. Implement these states: populated (use the mocked Push Pull Legs data), empty (new user, no routine/history → "Start your first workout" CTA, hide stat strip + recent), loading (skeleton blocks, no spinner), error (cached content + inline retry, never block Start). Wire the orange "Start workout" button to navigate to the Active Workout modal flow. Tab bar present, Home active. Pull data from the Workout/Routine types in the handoff data model. Hard rules: bg #0A0A0B, textOnAccent on orange, tabular numerals, no emoji.
```

---

### 2.2 Active workout — `screen-active-workout.html` ⭐ core

**Purpose:** the at-the-gym logging loop. This screen has to be fast and thumb-friendly.

**Layout:** status bar → nav (back/minimize chevron · "Push day" + "Push Pull Legs" sub · elapsed timer in accent) → scroll of exercise cards → "Add exercise" (secondary) + "Finish workout" (primary). **No tab bar.**

**Exercise card:** equipment icon + name (+ PR chip if a PR is live) → "Last time · date · best set" caption → column header (Set / Lbs / Reps / ✓) → set rows → "Add set" (tertiary, accent). The first/active exercise is a **raised** card; the rest are **surface**.

**Set row** grid `[set] [weight] [reps] [check]`:
- *Completed:* solid white numbers + accent-filled check (near-black tick).
- *Active (next to log):* `accentSubtle` background, ghost target numbers, empty check. Tapping it opens the number pad.
- *To-do:* ghost target numbers, empty ring check.

**States:**
- *Populated / mid-session:* as mocked.
- *Empty workout (freestyle):* one card prompting "Add your first exercise" → opens Exercise picker.
- *All sets done:* "Finish workout" gets subtle emphasis; optional "all sets complete" hint.
- *Loading:* only when resuming a synced in-progress workout — skeleton cards.
- *Error:* logging is local-first; never block on sync. If a write fails, keep the value and retry silently.

**Interactions:** tap a set row → number pad (2.3). Tap empty check → mark complete (also confirms ghost values if untouched). Long-press set row → edit/delete. "Add set" appends a row pre-filled with the last set's values. Back chevron → confirm discard if sets exist. "Finish workout" → summary + writes PRs.

```text
CLAUDE CODE PROMPT — Active Workout
Attach: screen-active-workout.html, theme/tokens.ts
Build the Active Workout screen (full-screen modal, NO tab bar) in React Native + Expo to match screen-active-workout.html exactly. Components: nav row (back chevron, title + routine sub, accent elapsed timer that ticks), scrollable exercise cards, Add exercise (secondary) + Finish workout (primary). Exercise card = equipment icon + name + optional PR chip, "last time" caption, column header (Set/Lbs/Reps/check), set rows, Add set. First exercise card is raised (surfaceRaised + e2), others surface. Set row states: completed (solid numbers + accent check w/ near-black tick), active (accentSubtle bg, ghost target numbers, empty check — tapping opens number pad), to-do (ghost numbers, empty ring). Ghost numbers use ghostTarget color and come from the most recent completed session (data model). Tapping a set row opens the Number Pad sheet; long-press = edit/delete; Add set appends a row pre-filled from the prior set. Back = confirm-discard if any sets logged. Local-first: never block logging on sync. Use Workout/WorkoutExercise/SetEntry types. Hard rules apply (textOnAccent on checks, tabular nums, no emoji).
```

---

### 2.3 Number pad — `screen-active-numberpad.html` ⭐ core

**Purpose:** fast weight/reps entry without the OS keyboard.

**Layout:** the Active workout dimmed behind a `rgba(0,0,0,0.55)` scrim → bottom sheet (`surfaceOverlay`, radius lg, e3 shadow): grabber → Weight / Reps fields (the active field has a 2px **accent** underline, the inactive a `surfaceHigh` underline) → plate chips (+2.5 / +5 / +10 / +25) → 3-col keypad (1–9, ., 0, ⌫) → "Log & next set" (primary + check).

**States:**
- *Weight active* (default on open) vs *Reps active* (tap to switch; underline moves).
- *First set of an exercise:* fields pre-fill with the ghost target; user can overwrite.
- *Editing an existing set:* sheet title/CTA reads "Save set" instead of "Log & next set"; no auto-advance.
- *Last set of last exercise:* CTA reads "Log & finish" (or "Log set" then surfaces Finish).
- *Invalid (reps 0 / weight blank):* CTA disabled (reduced opacity).

**Interactions:** keypad edits the active field; plate chips increment weight by their amount; tapping a field switches focus; ⌫ deletes last digit. "Log & next set" writes the set, marks the check, advances to the next set/exercise, and re-seeds the ghost. Swipe-down or tap scrim dismisses.

```text
CLAUDE CODE PROMPT — Number Pad
Attach: screen-active-numberpad.html, theme/tokens.ts
Build the Number Pad as a bottom sheet over the Active Workout, matching screen-active-numberpad.html. Sheet = surfaceOverlay, radius lg, e3 shadow, grabber, behind content dimmed by a 0.55 black scrim. Two big tabular fields Weight × Reps; active field has a 2px accent underline, inactive a surfaceHigh underline; tapping a field moves focus. Plate chips (+2.5/+5/+10/+25) increment weight. Custom 3-col keypad (1-9, decimal, 0, backspace) edits the active field — do NOT use the OS keyboard. Primary "Log & next set" with near-black check writes the SetEntry, marks it complete, advances to the next set/exercise, reseeds the ghost target, and animates the sheet. CTA variants: "Save set" when editing (no advance), "Log & finish" on the final set, disabled state when reps=0 or weight empty. Pre-fill from ghost target on a fresh set. Swipe-down / scrim tap dismisses. Tabular numerals, textOnAccent on the orange CTA + check.
```

---

### 2.4 Routines — `screen-routines.html`

**Purpose:** manage saved routines and start one; discover templates.

**Layout:** status bar → nav ("Routines" title + "+" new) → "Your routines" (the PPL group card: header with name + "3 days · 17 exercises", then day-rows Push/Pull/Leg each with exercise count + accent play button) → "New routine" dashed ghost row → "Start from a template" (Full Body, Upper/Lower rows with add buttons) → tab bar (Routines active).

**States:**
- *Populated:* as mocked.
- *Empty (no routines):* hide "Your routines"; lead with "Create your first routine" + the template section promoted.
- *Loading:* skeleton group card.
- *Error:* cached list + inline retry.

**Interactions:** play button on a day-row → starts that routine as an Active workout. Tapping a day-row (not the play) → Routine builder (edit). "+" / "New routine" → Routine builder (empty). Template add button → clones template into "Your routines" then opens the builder.

```text
CLAUDE CODE PROMPT — Routines
Attach: screen-routines.html, theme/tokens.ts
Build app/(tabs)/routines.tsx to match screen-routines.html. Sections: "Your routines" rendered as a RoutineGroup card (group name + meta, then a day-row per Routine with exercise count and an accent play button in an accentSubtle circle), a dashed "New routine" ghost row, and "Start from a template" rows with outline add buttons. Tab bar present, Routines active. Interactions: play button → start that routine as an Active Workout; tapping the day-row body → Routine builder (edit mode); New routine / "+" → Routine builder (empty); template add → clone into Your routines then open builder. States: populated, empty (no routines → promote templates + "Create your first routine"), loading (skeleton), error (cached + retry). Use Routine/RoutineGroup/RoutineExercise types. Hard rules apply.
```

---

### 2.5 Routine builder — `screen-routine-builder.html` ⭐ core

**Purpose:** create/edit a routine and its per-exercise set/rep targets.

**Layout:** nav (Cancel · "Edit routine" / "New routine" · Save in accent) → "Routine name" label + text input → "Exercises · N" label → exercise config cards → "Add exercise" (secondary) → sticky footer **Save routine** (primary). **No tab bar.**

**Exercise config card:** equipment icon + name + drag handle → two steppers (Sets, Target reps) each `[−] value [+]` → "Remove" row.

**States:**
- *Edit existing:* fields populated; title "Edit routine".
- *New:* empty name (placeholder "Routine name"), no exercises → empty hint "Add your first exercise"; title "New routine".
- *Reordering:* drag handle active; card lifts (e2).
- *Unsaved-changes:* Cancel → confirm discard.
- *Validation:* Save disabled until name + ≥1 exercise.

**Interactions:** steppers clamp at sane mins (sets ≥1, reps ≥1). Drag handle reorders. Remove deletes the row (optionally undo toast). Add exercise → Exercise picker (2.6); returns selected exercises appended as cards. Save persists and pops back.

```text
CLAUDE CODE PROMPT — Routine Builder
Attach: screen-routine-builder.html, theme/tokens.ts
Build the Routine Builder (modal/stack, NO tab bar) matching screen-routine-builder.html. Header: Cancel (left), title "Edit routine"/"New routine", Save (accent, right, disabled until name + ≥1 exercise). Body: "Routine name" text input, "Exercises · N" label, a config card per exercise (equipment icon + name + drag handle; two steppers Sets and Target reps with [−]/[+] clamped to ≥1; a Remove row), then a secondary "Add exercise". Sticky footer primary "Save routine". Add exercise opens the Exercise Picker and appends returned selections as cards. Drag handle reorders (lifted card uses e2). Cancel with unsaved changes → confirm discard. States: edit (populated), new (empty + "add your first exercise" hint), reordering, validation-disabled. Persist using Routine/RoutineExercise types, then pop. Hard rules apply.
```

---

### 2.6 Exercise picker — `screen-exercise-picker.html`

**Purpose:** search/filter the catalog and multi-select exercises to add.

**Layout:** nav (Cancel · "Add exercise" · "Done · N") → search field → muscle-group filter chips (All/Chest/Back/Legs/Shoulders/Arms/Core, horizontal scroll, active = accent) → grouped catalog rows (equipment icon + name + "Muscle · Equipment" sub + select circle) → "Create custom exercise" row → sticky **"Add N exercises"** primary. **No tab bar.**

**States:**
- *Browse (default):* grouped by muscle.
- *Searching:* rows filter live; show count or "No matches → Create '<query>'".
- *Filtered:* chip active narrows the list.
- *Selection:* selected rows show accent-filled check; footer count + CTA label update; CTA hidden/disabled at 0.
- *Empty catalog:* only "Create custom exercise" (shouldn't happen with the seeded catalog).

**Interactions:** tap row toggles selection (multi). Chip filters. Search filters by name. "Create custom exercise" → small form (name, muscle, equipment) → adds an `isCustom` exercise and selects it. "Add N" returns selections to the caller (builder or active workout).

```text
CLAUDE CODE PROMPT — Exercise Picker
Attach: screen-exercise-picker.html, theme/tokens.ts
Build the Exercise Picker (modal, NO tab bar) matching screen-exercise-picker.html. Header: Cancel, "Add exercise", "Done · N". Search field (filters catalog by name, live). Horizontal muscle-group filter chips (All/Chest/Back/Legs/Shoulders/Arms/Core; active = accent + textOnAccent). Catalog grouped by muscle: row = equipment icon + name + "Muscle · Equipment" sub + multi-select circle (accent-filled check when selected). "Create custom exercise" row opens a small form (name, primaryMuscle, equipment) creating an isCustom Exercise and auto-selecting it. Sticky primary "Add N exercises" (disabled/hidden at 0) returns the selected exercise IDs to the caller. States: browse, searching (incl. "no matches → create '<query>'"), filtered, selection. Use Exercise type + the seeded catalog. Hard rules apply.
```

---

### 2.7 Progress — `screen-progress.html` ⭐ core

**Purpose:** the calm "gallery of gains" overview.

**Layout:** status bar → "Progress" title → "Total volume · weekly" card (volume hero in expanded tabular + accent "+12% vs last month", muted weekly bars with the current bar in accent, range chips 1M/3M/6M/1Y/All) → "Your lifts" list (per-exercise rows: name + "est. 1RM <value> +delta" + mini accent sparkline + chevron) → tab bar (Progress active).

**States:**
- *Populated:* as mocked.
- *Empty (no history):* friendly "Log a few workouts to see progress" + hide bars/list.
- *Thin data (1–2 sessions):* show what exists; sparkline degrades to a dot/short line; hide deltas until there's a baseline.
- *Loading:* skeleton card + rows.
- *Error:* cached + inline retry.

**Interactions:** range chips re-scope the volume card. Tapping a lift row → Exercise detail (2.8). Volume bar tap (optional) → that week's tooltip.

```text
CLAUDE CODE PROMPT — Progress
Attach: screen-progress.html, theme/tokens.ts
Build app/(tabs)/progress.tsx matching screen-progress.html. Top: "Total volume · weekly" card — expanded tabular volume hero, accent "+X% vs last month" delta (gains=accent, losses=textSecondary), a weekly bar chart (bars surfaceRaised, the current/last bar accent), faint gridlines (≤3), and range chips (active=accent). Below: "Your lifts" — a row per exercise with name, "est. 1RM <value> +delta · 90d", a small accent sparkline (~74×34), and a chevron; tapping → Exercise Detail. Compute e1RM via Epley from the data model. States: populated, empty ("log a few workouts…" + hide chart/list), thin-data (sparkline → dot, hide deltas until baseline), loading (skeleton), error (cached + retry). Tab bar present, Progress active. Hard rules apply.
```

---

### 2.8 Exercise detail — `screen-exercise-detail.html` ⭐ core

**Purpose:** one exercise's trend over time (Apple-Stocks feel).

**Layout:** nav (back · "Bench press" · overflow) → metric segmented toggle (Est. 1RM / Volume / Heaviest) → "Estimated 1RM" overline + big tabular value (expanded) + accent "+26 · 90d" → line chart (2.5px accent line, gradient fill 0.30→0, ≤3 gridlines + labels, dashed scrub line with white/accent dot + `surfaceOverlay` value bubble, **violet PR point**) → range chips → 3 stat cards (Best set / Heaviest / PR·1RM with violet value) → "History" list (date · best set · e1RM, violet PR dot on PR sessions). **No tab bar.**

**States:**
- *Populated:* as mocked.
- *Metric = Volume / Heaviest:* same chart shell, different series + stat emphasis.
- *Scrubbing:* finger drag moves the dashed line + bubble; the hero value follows the scrub point; release returns to latest.
- *Thin data:* line with few points or a single marker; PR point still highlighted; hide delta if no baseline.
- *Empty (exercise never logged):* "No history yet" placeholder (reachable only via search, not from Progress).
- *Loading:* skeleton chart.

**Interactions:** metric toggle swaps series. Range chips rescope. Horizontal scrub on the chart. Overflow → rename/replace exercise, or jump to its routine.

```text
CLAUDE CODE PROMPT — Exercise Detail
Attach: screen-exercise-detail.html, theme/tokens.ts
Build the Exercise Detail screen (stack push, NO tab bar) matching screen-exercise-detail.html. Header: back, exercise name, overflow. Metric segmented toggle (Est. 1RM / Volume / Heaviest) over a shared chart shell. Hero: overline + big expanded tabular value + accent "+delta · range". Line chart: 2.5px accent line, vertical gradient fill (0.30→0), ≤3 faint gridlines with right-edge labels, a draggable dashed scrub line with a white-core/accent-ring dot and a surfaceOverlay value bubble (date · value); the hero value tracks the scrub point and resets to latest on release. Render personal-record points as a solid VIOLET (pr) dot — PR color nowhere else. Range chips (active=accent). Three stat cards: Best set (reps×weight), Heaviest, PR·1RM (violet value). History list: date · best set · e1RM, with a violet PR dot on PR sessions. Compute e1RM via Epley. States: per-metric, scrubbing, thin-data, empty, loading. Use PersonalRecord + Workout types. Hard rules apply.
```

---

### 2.9 Profile — `screen-profile.html`

**Purpose:** identity, lifetime stats, account entry points.

**Layout:** status bar → nav ("Profile" + settings gear) → identity row (accent-subtle avatar with initial, name, "email · since") → lifetime stats 2×2 grid (Workouts / Total volume / PRs / Hours, expanded tabular values) → "Account" group (Settings →, Personal records → with count, Export data →, Help & feedback →) → "Sign out" (destructive, centered) → tab bar (Profile active).

**States:**
- *Populated:* as mocked.
- *New user:* stats show 0 / "—"; copy nudges toward a first workout.
- *Loading:* skeleton stat grid.
- *Signed in with Apple + hidden email:* show the relay address or "Apple ID".

**Interactions:** gear and "Settings" → Settings. "Personal records" → PR list. "Export data" → share sheet (CSV/JSON). "Help & feedback" → mailto/feedback. "Sign out" → confirm.

```text
CLAUDE CODE PROMPT — Profile
Attach: screen-profile.html, theme/tokens.ts
Build app/(tabs)/profile.tsx matching screen-profile.html. Nav: "Profile" + settings gear (→ Settings). Identity row: round accent-subtle avatar with the user's initial (accentText), name (title), "email · since <month year>". Lifetime stats as a 2×2 grid of surface cards (Workouts, Total volume, PRs, Hours) with expanded tabular values. "Account" group (rounded surface, hairline-divided rows): Settings →, Personal records → (with count), Export data →, Help & feedback →. Centered destructive "Sign out" (→ confirm). Tab bar present, Profile active. States: populated, new user (zeros + nudge), loading (skeleton), Apple-hidden-email. Use UserProfile + aggregate stats. Hard rules apply.
```

---

### 2.10 Settings — `screen-settings.html`

**Purpose:** preferences (units is the key one), sync, account, about.

**Layout:** nav (back · "Settings") → "Preferences" group (Units **lb/kg segmented**, default lb; Default rest reminder toggle off; Appearance = Dark) → "Data & sync" group (Supabase cloud sync toggle on; Status = synced + green dot + time; Export workout data →) → "Account" group (Email; Signed in with Apple) → "About" group (Privacy →, Terms →) → "Delete account" (destructive) → "Version 1.0.0". **No tab bar.**

**States:**
- *Units lb (default)* vs *kg* — flips display units app-wide.
- *Sync on/off;* status variants: synced / syncing (spinner + "Syncing…") / offline ("Last synced <time>") / error (warning color + retry).
- *Rest reminder off (default)* / on.
- *Delete account:* destructive confirm (type-to-confirm or double prompt).

**Interactions:** segmented control sets `units` and persists immediately. Toggles persist immediately. Export → share sheet. Privacy/Terms → in-app web or external. Delete → confirm flow → sign out.

```text
CLAUDE CODE PROMPT — Settings
Attach: screen-settings.html, theme/tokens.ts
Build the Settings screen (stack push, NO tab bar) matching screen-settings.html. Grouped rounded-surface lists with overline section labels and hairline-divided rows. Preferences: Units as a lb/kg SegmentedControl (active=accent+textOnAccent, default lb) that sets UserProfile.units and converts displayed weights app-wide immediately; "Default rest reminder" Toggle (default off); "Appearance" value "Dark". Data & sync: "Supabase cloud sync" Toggle (on), "Status" row with a synced state (green success dot + relative time) plus syncing/offline/error variants, "Export workout data →" (share sheet). Account: Email row, "Signed in with" = Apple. About: Privacy →, Terms →. Destructive "Delete account" with a confirm flow. "Version 1.0.0" footer. Toggle track off = surfaceHigh, on = accent with white knob. Hard rules apply.
```

---

### 2.11 Welcome / sign-in — `screen-welcome.html`

**Purpose:** first-launch auth entry. ⚠️ **Brand placeholder:** the wordmark ("LIFT") and the upward-line mark are placeholders — the name/logo aren't decided yet. Swap when branding lands.

**Layout:** status bar → hero (accent-subtle rounded mark with the upward progress-line glyph, expanded wordmark, "working name · placeholder" micro-label, tagline) → CTA stack (**Continue with Apple** = white button per Apple HIG; **Continue with email** = orange primary) → legal line (Terms / Privacy). Subtle warm radial glow from the bottom. **No tab bar.**

**States:**
- *Default:* as mocked.
- *Apple in progress:* button shows a spinner; others disabled.
- *Email tapped:* → email auth screen (enter email → magic link or password; handles both new + returning — a standard input screen, not separately mocked).
- *Auth error:* inline message above the CTAs (destructive), buttons re-enabled.

**Interactions:** Apple → native Sign in with Apple → on success, into the tab app (Home). Email → email flow. Terms/Privacy → web view.

```text
CLAUDE CODE PROMPT — Welcome / Sign-in
Attach: screen-welcome.html, theme/tokens.ts
Build the Welcome/sign-in screen (pre-auth, outside the tab navigator) matching screen-welcome.html. Centered hero: rounded accentSubtle/accentBorder mark containing the upward progress-line glyph, an expanded wordmark (PLACEHOLDER "LIFT" — leave easy to swap), a "working name · placeholder" micro-label, and a two-line tagline with the second line in accentText. CTA stack: "Continue with Apple" as a WHITE button with the Apple glyph (Apple HIG; near-black text) wired to expo-apple-authentication; "Continue with email" as the orange primary → email auth flow. Legal line with Terms/Privacy links. Subtle warm radial glow at the bottom. States: default, apple-in-progress (spinner, others disabled), auth error (inline destructive message above CTAs). On success → tab app Home. No tab bar. Hard rules apply (textOnAccent on the orange button, never white).
```

---

## 3. Suggested build order

1. **Foundations** — tokens, fonts, `ScreenScaffold`, `Card`, `Button`, `EquipmentIcon`, `TabBar`, navigation skeleton.
2. **Welcome** — get auth + the tab shell standing.
3. **Home** — the landing (already approved).
4. **Active workout + Number pad** — the core loop; most of the app's value.
5. **Exercise picker** — needed by both the workout flow and the builder.
6. **Routines + Routine builder** — planning side.
7. **Progress + Exercise detail** — the payoff/charts.
8. **Profile + Settings** — wrap-up, units toggle.

Build each against its mockup, keep the hard rules in §1.6 in view, and lean on the shared components so the eleven screens stay one coherent app. Customize freely from here — this is a foundation, not a cage.
