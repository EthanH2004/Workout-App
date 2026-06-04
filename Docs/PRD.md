# Product Requirements Document — Workout Tracker (v1)

**Document:** 1 of 6 (Planning)
**Status:** Draft for review
**Scope:** This document defines *what* version 1 is and *why*. It deliberately does not cover visual design or database schema — those are separate documents.

**Product philosophy:** Get the fundamentals excellent first. V1 is about doing the core job — track your workouts, run them at the gym, see your progress — exceptionally well, with a clean and premium feel, and then holding that quality bar for a while before expanding. The bigger features (social/friends, streaks, an AI assistant, and a premium tier) are genuinely planned and wanted, not rejected. They are simply sequenced *after* the foundation is amazing. We earn the right to build them by nailing the core first; we don't go wide on extras users don't strictly need until the essentials are great.

---

## 1. Problem & Why It's Worth Solving

People who lift weights want to follow a routine and get steadily stronger over time (progressive overload). To do that well, they need to track every workout: what they're supposed to do today, what they did last time, and whether they're beating it.

Apps that do this already exist and work — Hevy is the clearest example and the direct inspiration for this product. The opportunity is not a missing capability. It's that the leading apps feel cluttered, lean on social-feed mechanics most lifters don't want, and put a price tag on the core experience. There is room for a tool that does the same fundamental job but feels calmer, more premium, more intuitive, and is free.

The bet: a clean, elegant, genuinely free workout tracker can win users on feel and price, then layer on differentiated features (smarter progress insights, an AI helper, integrations) over time.

## 2. Target User

People who go to the gym to lift weights and want to track it. More specifically:

- They train against a routine (their own, or a standard split like Push/Pull/Legs or Full Body).
- They care about progressive overload — beating last session's numbers — and want to *see* that improvement over time.
- They want logging to be fast and frictionless, because they're doing it mid-workout between sets.
- They range from people who already have a routine they want to digitize, to people who want to grab a sensible standard plan and start immediately.

This is not for casual exercisers tracking general activity, runners, or people looking for a social fitness network. The user is a lifter who tracks.

## 3. Core Value & What Makes It Different

**Core value:** The fastest, cleanest way to run your workout at the gym and watch yourself get stronger.

The heart of the product is the *at-the-gym loop*: open the app, see today's workout, see what you did last time as the target to beat, log each set in seconds, check it off. Everything else serves that loop.

**What makes it different from Hevy:**

- **Cleaner and more premium.** A calm, focused, elegant interface — not a social-media-style home feed. The standard of polish is the differentiator.
- **No social layer.** No public posts, no feed, no followers. The home screen is "ready to lift," not "see what others posted."
- **More intuitive routine and workout management.** Specifically addressing the parts of Hevy that feel unintuitive (the routine/home experience).
- **Free.** The core experience costs nothing.

These are the v1 differentiators. Smarter progress insights, an AI helper, and integrations are planned differentiators for later, not part of v1.

## 4. MVP Scope — Must-Haves for v1

Kept deliberately tight. V1 must do exactly this, and do it well:

**Accounts**
- Sign in with Apple and email. An account is required (Sign in with Apple is also an App Store expectation).
- Data is tied to the account, stored in the cloud, and syncs across the user's devices.
- Local-first: the app works fully offline (e.g. gym with no Wi-Fi), stores logs on the phone, and syncs to the cloud when a connection is available.

**Routines**
- A small library of prebuilt standard routines (1–2 solid ones to start, e.g. a Push/Pull/Legs or Full Body split) the user can pick and start immediately.
- Build a custom routine from scratch.
- Take a prebuilt routine and customize it into their own.
- Heavy emphasis on customization, balanced against the ability to get started in seconds with a standard plan.

**Exercise catalog**
- A broad built-in catalog of exercises, organized so variations are easy to find (e.g. Bench Press → barbell / incline / seated; Curl → barbell / dumbbell / hammer / one-arm).
- Each exercise has a simple identifying icon.
- Users can create their own custom exercises and add them to the catalog / their routines.

**Logging (the core loop)**
- For the active workout, show each exercise with its prescribed sets laid out as a clean sheet/table.
- For each set, show the user's previous performance (weight × reps) as the target to beat.
- Fast entry: tap a field, a number pad opens, type weight and reps per set.
- Check off each set as completed.
- Automatically record the date and time of each logged workout (stored now; the calendar view that uses it comes later).

**Progress**
- Per-exercise progress view with a line chart over time. Primary metric: **estimated 1-rep max** (chosen because it combines weight and reps into one comparable number, unlike "heaviest weight" alone).
- View weight and reps history per exercise.
- Secondary chart: total volume over time.
- Personal-record (PR) tracking per exercise.

**Settings**
- Units toggle: pounds or kilograms. **Default: pounds.**

## 5. Out of Scope for Now ("Later" List)

These are **planned and wanted features, deliberately sequenced after v1** — not rejected ideas. The goal is to make the fundamentals excellent and hold that bar before expanding. When these arrive, some may sit behind a premium tier. In rough order of intent:

- **Social layer** — add friends and compare progress with them. (No public feed / followers in the open-network sense; this is friend-based comparison.)
- **Streaks & consistency** — track how many days in a row, or how many planned workout days you actually hit, to drive return engagement.
- **Calendar / consistency view** — visualize which days were trained, rest, or skipped. (Dates are already stored in v1; only the view is later.)
- **AI assistant** — a coaching/helper bot for guidance and bonus features.
- **Premium tier** — a paid plan (intended around ~$5/month) gating bonus features. Everything a user genuinely needs stays free; premium is for extras. No payment scaffolding in v1.
- **Notifications / reminders** to come back and train.
- **Set types beyond standard** — supersets, drop sets, warmup labeling, RPE.
- **Rest timers** between sets.
- **Body-weight tracking.**
- **Third-party integrations** — e.g. Cronometer, Apple Health.
- **Expanded prebuilt routine library** — grows beyond the initial 1–2 over time.

The principle: none of this is "never." It's "not until the core is amazing."

## 6. Main User Flows (Plain Words)

**First-time setup**
1. User opens the app and signs in (Apple or email).
2. User either picks a standard routine to start immediately, or builds their own (optionally by customizing a standard one).

**Running a workout at the gym (the core flow)**
1. User opens the app to the home screen, which is in a "ready to lift" state, and taps **Start Workout**.
2. The app shows today's workout: each exercise with its sets laid out, and last time's numbers shown as the target.
3. For each set, the user taps to enter weight and reps via the number pad and checks the set off.
4. Works offline if needed; the session is saved locally and syncs to the cloud when connected.
5. The workout's date and time are recorded automatically.

**Reviewing progress (later, at home)**
1. User opens the app and views their progress.
2. User selects an exercise to see its estimated-1RM line chart over time, plus weight/reps history and PRs.
3. User can view overall progress and total volume trends.

## 7. Success Criteria for v1

V1 is considered done and shippable when it can **track your workouts and show you your progress** — reliably, offline, and with a level of polish that feels clearly more premium and calmer than the cluttered incumbents.

Concretely, v1 succeeds if:
- A user can sign in, pick or build a routine, and complete a logged workout without confusion on first use.
- Logging a set mid-workout is fast enough to do between sets without breaking flow.
- Logging works with no internet connection and syncs correctly once reconnected.
- A user can return weeks later and see a clear, accurate chart of their progress on a given exercise.
- It is approved and live on the App Store.

## 8. Known Constraints & Risks

- **Offline sync is the biggest technical risk.** Local-first storage with cloud sync introduces sync-conflict and data-loss failure modes if implemented naively. For a solo developer this is the single most likely area to cause hard-to-debug problems and must be designed carefully. Losing a user's logged workout is the worst possible failure for a tracking app.
- **Solo developer, limited bandwidth.** One person is building, shipping, and maintaining this. Scope discipline is essential; the "later" list exists to protect v1 from bloat.
- **Free with no revenue in v1.** No monetization initially. This is an intentional user-acquisition bet, not an oversight, but it means ongoing costs (backend, App Store) are unfunded until a later premium tier exists.
- **Competing against a polished incumbent.** Hevy already covers the feature set well. V1's entire case rests on feel, intuitiveness, and price rather than capability — so execution quality on the core loop is non-negotiable.
- **App Store requirements.** Sign in with Apple and general App Store review guidelines must be satisfied to ship.
- **Exercise catalog completeness.** "Hopefully every exercise" is a large content task; the catalog needs to feel complete enough that users rarely hit a missing exercise, while custom-exercise creation acts as the safety valve.

## 9. Non-Goals

- **In v1**, this is not a social network or a place to share workouts. (Friend-based comparison is a planned later feature, but v1 ships with zero social layer.)
- This is not a general fitness, cardio, or activity tracker — it is a weightlifting log.
- This is not a nutrition or body-composition tracker.
- This is not an AI coaching product (in v1).
- V1 is not trying to out-feature Hevy. It is trying to out-*feel* it on the fundamentals.

---

*Next documents in this project will cover areas intentionally excluded here, including visual design and data/schema.*
