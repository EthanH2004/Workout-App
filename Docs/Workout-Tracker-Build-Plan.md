# Build Plan — Workout Tracker (v1)

**Document:** 5 of 6 (Build Plan)
**Status:** Draft
**Scope:** The order to build v1 in. Each milestone is small, ends in something you can run and verify, and is committed before moving on. Build the **walking skeleton** (M0–M2) first so the app runs end to end while still mostly empty; then fill in features as vertical slices (M3–M7); then polish and ship.

> How to use this with Claude Code: tackle **one milestone (often one task) at a time**. For feature screens, come back and we'll design the page first, then I'll give you a tight task prompt that references the docs. Test on the simulator and commit after each.

---

## M0 — Project skeleton
- Create the Expo app, TypeScript strict, the folder structure from the Architecture doc.
- Build `src/theme/tokens.ts` from the Design System (colors, type scale, spacing, radius, elevation, motion).
- Load fonts: standard Archivo + a **static Archivo Expanded** family for hero numerals.
- Set up Expo Router with the tab bar and four **blank** tab screens + a blank Active Workout route.
**Verify:** app launches, tabs and the Start button navigate, fonts and accent color are visible. **Commit.**

## M1 — Backend + auth
- Apply the schema from the Data Model doc as a Supabase migration; enable RLS on every table.
- Wire the Supabase client; add Sign in with Apple + email; gate `(tabs)` behind auth.
- Create the `profiles` row on signup (trigger), with `unit_preference` default `lb`.
**Verify:** you can sign up, log in, log out; logged-out users can't reach the tabs. **Commit.**

## M2 — Data layer + offline
- Supabase queries/mutations in `/src/lib/supabase`, typed from the schema.
- TanStack Query with persisted cache (offline reads) + a persisted mutation queue (offline writes, replay on reconnect).
- `/utils`: `oneRepMax.ts` (Epley), `volume.ts`, `units.ts` (kg ↔ lb), `uuid.ts`.
**Verify:** a hardcoded test read/write round-trips, and a write made offline replays on reconnect. **Commit.**

## M3 — Exercises catalog
- Seed built-in exercises from an open dataset (name, category, equipment).
- Catalog list with search; equipment icons; create a custom exercise.
**Verify:** browse, search, and add a custom exercise that persists. **Commit.**

## M4 — Routines
- Routines list; build/edit a routine with ordered days and ordered exercises (target sets/reps).
- Adopt a prebuilt routine (copy-on-adopt per decision D2).
**Verify:** create a Push/Pull/Legs plan, edit it, and adopt a prebuilt one. **Commit.**

## M5 — Active workout (the core loop)
- Start → day picker → load that day's exercises.
- Set-logging row with "last time" ghost target; custom number pad with plate chips; check-off; edit/delete a set.
- Finish → commit the session (snapshots per D3) → land on Progress.
**Verify:** run a full workout, log sets fast, edit one, finish, and see it saved. Works offline. **Commit.**

## M6 — Progress
- Per-exercise est. 1RM line chart (Apple-Stocks style), volume secondary chart, PRs, history.
- Range chips; scrub to read values.
**Verify:** pick an exercise and see an accurate chart and PR from logged data. **Commit.**

## M7 — Profile + settings
- Lifetime stats, top PRs; Settings with the lb/kg units toggle (re-renders all displayed weights).
**Verify:** toggle units and confirm every weight converts correctly. **Commit.**

## M8 — States + polish
- Empty / loading / error states across every screen.
- Motion (spring check-off, press feedback, sheet transitions) and haptics per the design system.
- App icon and splash.
**Verify:** every screen handles no-data, loading, and failure gracefully; the app feels finished. **Commit.**

## M9 — Store prep
- Privacy manifests for all third-party libraries (avoid the ITMS-91053 rejection).
- App Store screenshots + copy; push to **TestFlight**; test on your real phone; submit for review.
**Verify:** clean TestFlight build runs on device. Submit.

---

*This is the last planning doc. After M0–M2 you have a real running app to build into.*
