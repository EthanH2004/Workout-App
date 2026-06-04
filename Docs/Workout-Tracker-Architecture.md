# Architecture — Workout Tracker (v1)

**Document:** 4 of 6 (Architecture)
**Status:** Draft for review
**Scope:** How the code is organized and how it behaves: stack, folder structure, state management, navigation map + screen inventory, and conventions. Pairs with the PRD (#1), Design System (#2), and Data Model (#3).

---

## 1. Stack

| Concern | Choice | Why |
|---|---|---|
| App framework | **React Native + Expo** | Native, App-Store-safe, cloud builds (EAS) so no Mac required |
| Language | **TypeScript (strict)** | Catches errors before the device |
| Navigation | **Expo Router** | File-based routing, native stacks + tabs |
| Server data | **TanStack Query** over a Supabase client | Caching, retries, and offline persistence in one |
| Backend | **Supabase** (Postgres + Auth) | Schema in doc #3; RLS for security |
| Active-session state | **Zustand** (light store) | The in-progress workout being logged, before it's committed |
| Offline | **Persisted Query cache + persisted mutation queue** (MMKV) | Cached reads work offline; writes queue and replay on reconnect (per PRD's one-direction sync) |
| Motion | **Reanimated** | Spring check-off, press feedback; native stack for screen transitions |
| Icons | **phosphor-react-native** + small custom equipment set | Per design system |
| Haptics | **expo-haptics** | Mapped to the moments in the design system |

> Offline upgrade path (not v1): if simple queue-and-replay proves insufficient, move to WatermelonDB or PowerSync. The data model's client-UUID + soft-delete design already supports that switch.

---

## 2. State management (the rule of three)

1. **Server / persistent data** → TanStack Query, talking to a Supabase data layer in `/src/lib/supabase`. Persist the cache so reads work offline.
2. **Active-workout draft** → a Zustand store. The session being logged lives here (and is persisted) until "Finish," then it's committed as one batch of mutations.
3. **Ephemeral UI state** → local `useState` in the component.

Nothing passes giant state blobs down through props. Screens read what they need from queries or the store.

---

## 3. Folder structure (feature-based)

```
/app                       Expo Router routes (thin; delegate to features)
  /(auth)
    welcome.tsx
    sign-in.tsx
  /(tabs)
    _layout.tsx            tab bar
    home.tsx
    routines.tsx
    progress.tsx
    profile.tsx
  /workout/active.tsx      full-screen active session
  /routine/[id].tsx        build / edit a routine
  /exercise/[id].tsx       exercise detail + progress
  /settings.tsx
/src
  /components              shared primitives built from tokens (Button, Card, SetRow, NumberPad, Chart, TabBar…)
  /features
    /auth
    /routines
    /workout               active-session logic + Zustand store
    /exercises
    /progress
  /lib
    /supabase              client, queries, mutations, types
    /offline               query persistence + mutation queue
  /theme
    tokens.ts              THE design system in code (colors, type, spacing, radius, elevation, motion)
  /hooks
  /utils                   oneRepMax.ts, volume.ts, units.ts, uuid.ts
/docs                      the planning docs (this folder)
CLAUDE.md                  always-on rules for Claude Code
```

---

## 4. Navigation map + screen inventory

```
Root
├─ (auth)              [shown when logged out]
│   ├─ Welcome
│   └─ Sign in         (Apple + email)
└─ (tabs)              [shown when logged in]
    ├─ Home            "ready to lift": up-next day, recent, Start
    ├─ Routines        list of plans → build/edit, adopt prebuilt
    ├─ Progress        pick exercise → 1RM chart, volume, PRs, history
    └─ Profile         lifetime stats, PRs, → Settings
   Modals / pushed screens (over tabs):
    ├─ Day picker      choose which day of the routine to run
    ├─ Active Workout  the logging loop (full screen)
    ├─ Routine editor  build/edit a routine + its days + exercises
    ├─ Exercise picker add exercises (search catalog / create custom)
    ├─ Exercise detail progress + history for one exercise
    └─ Settings        units toggle, account
```

Detailed per-screen layout is **not** specified here on purpose — each screen is designed during the build loop (see build plan) using the Design System and Visual Reference as the source of truth.

---

## 5. Conventions

- **Tokens only.** No component hardcodes a color, size, radius, or duration. Everything comes from `tokens.ts`. This is what makes the look consistent and a future light mode or accent swap trivial.
- **Every screen ships three states:** empty, loading, and error, in addition to the populated state. This is non-negotiable and is the main thing that separates "real app" from "demo."
- **Derived values live in `/utils`:** estimated 1RM, volume, and unit conversion are pure functions used everywhere, never re-implemented inline.
- **Client-generated UUIDs** for every new row (so offline works); never wait on the server for an ID.
- **One component per file**, named clearly; features own their logic, `/components` holds shared primitives.
- **TypeScript strict**, types generated from the Supabase schema where possible.
- **No new dependency** added without a note in the PR/commit explaining why.
- **Ask before any large refactor** or any change that touches the schema or `tokens.ts`.

---

*Next: doc #5 is the build plan; CLAUDE.md sits at the repo root.*
