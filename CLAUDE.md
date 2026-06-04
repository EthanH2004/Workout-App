# CLAUDE.md — Workout Tracker

Read this first, every session. It is the contract for how this project is built.

## What this is
A premium, minimal iPhone workout tracker (React Native + Expo, Supabase backend). It lets a lifter pick or build a routine, log sets fast at the gym, and see progress over time. Calmer and cleaner than Hevy; no social feed; free.

## Source of truth — read before building
All in `/docs`:
- `PRD.md` — what v1 is and is not (scope).
- `Workout-Tracker-Design-System.md` — colors, type, spacing, components. **The visual contract.**
- `Workout-Tracker-Visual-Reference.html` — what the components look like assembled.
- `Workout-Tracker-Data-Model.md` — the Supabase schema, RLS, and decisions.
- `Workout-Tracker-Architecture.md` — stack, folders, state, navigation.
- `Workout-Tracker-Build-Plan.md` — the order to build in. Follow it.

## Stack
Expo + React Native, TypeScript (strict), Expo Router, TanStack Query, Zustand (active-session only), Supabase, Reanimated, phosphor-react-native, expo-haptics.

## Hard rules (do not break)
1. **Never hardcode a color, size, radius, font, or duration.** Use `src/theme/tokens.ts` only. If a token is missing, add it there.
2. **Follow the Design System precisely.** Do not improvise styling or invent new patterns. Dark only, warm-orange accent, near-black on the accent, Archivo (static Expanded for hero numerals — not the variable width axis).
3. **Build one screen / one task at a time**, in the build-plan order. Do not scaffold many half-finished screens.
4. **Every screen ships empty, loading, and error states**, not just the happy path.
5. **Client-generated UUIDs** for all new rows. **RLS on every table** (`owner_id = auth.uid()`).
6. **Derived values** (1RM, volume, PRs) are computed in `/utils`, never stored.
7. **Commit after each working piece.** Small, verifiable commits.
8. **Ask before** any schema change, any edit to `tokens.ts`, any large refactor, or adding a dependency.
9. Don't reproduce the "AI app" look: no Inter, no default icon set, no neon, no gradient-mesh, no pure `#000`.

## Where things go
Routes in `/app`; shared primitives in `/src/components`; feature logic in `/src/features`; Supabase in `/src/lib/supabase`; offline in `/src/lib/offline`; tokens in `/src/theme`; pure helpers in `/src/utils`.

## Definition of done for a task
Builds and runs on the simulator, matches the design system, has its three states, is typed, and is committed.
