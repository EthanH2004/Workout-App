# Design System — Workout Tracker (v1)

**Document:** 2 of 6 (Design)
**Status:** v1.0
**Scope:** The reusable foundation — design tokens and components — for the iPhone app described in the PRD. It deliberately does **not** lay out individual screens; that is a later document. Built in React Native (Expo).

---

## 0. Personality in one paragraph

Sophisticated, minimal, premium — in the spirit of Polestar, Apple, and Uber, applied to a dense numeric app. The interface is **dark only**, near-black and mostly grayscale, with a **single quiet accent** (warm orange) used sparingly but confidently. Type is set in **Archivo**, with a few genuinely big, bold numeric/heading moments floating above an otherwise calm, restrained scale ("two-speed"). Restraint reads as expensive. Every decision is in service of the at-the-gym logging loop feeling fast, and the progress view feeling like a calm gallery of your gains. The number-one job of this system is to keep the app from ever looking generic or AI-generated.

---

## 1. Color

All v1 colors are **dark-mode values**. Tokens are defined semantically so a light mode can be added later by supplying a second value per token without touching components. The grays are **true neutral** (no warm/cool tint).

### 1.1 Surfaces (separated by lightness)

Elevation is communicated primarily by surfaces getting **lighter** as they rise, with a soft supporting shadow (see §6). Base is a soft near-black — **never pure `#000`**.

| Token | Hex | Use |
|---|---|---|
| `bg` | `#0A0A0B` | App background / page canvas |
| `surface` | `#141416` | Cards, the resting content layer |
| `surfaceRaised` | `#1E1E21` | Active/selected rows, inputs, secondary buttons |
| `surfaceOverlay` | `#26262A` | Bottom sheets, number pad, popovers, modals |
| `surfaceHigh` | `#2E2E33` | Pressed keys, chips, the topmost interactive fills |

### 1.2 Borders & dividers (hairlines)

Thin hairlines handle fine separation only (row dividers, sheet top edges). Cards lean on lightness, not borders.

| Token | Value | Use |
|---|---|---|
| `borderSubtle` | `rgba(255,255,255,0.07)` | Row dividers, sheet top edge (default) |
| `borderDefault` | `rgba(255,255,255,0.10)` | Input outlines, card edges when needed |
| `borderStrong` | `rgba(255,255,255,0.16)` | Hover/emphasis outline |

### 1.3 Text

| Token | Hex | Contrast on `bg` | Use |
|---|---|---|---|
| `textPrimary` | `#FFFFFF` | ~20:1 | Headlines, values, primary content |
| `textSecondary` | `#9A9A9D` | ~6.6:1 | Supporting text, labels, captions |
| `textTertiary` | `#6A6A6D` | ~3.4:1 | Hints, axis labels — **large/non-essential text only** |
| `textDisabled` | `#4A4A4D` | — | Disabled states |
| `textOnAccent` | `#141210` | ~6.3:1 on accent | **Near-black** text/icons on the orange accent (buttons, FAB, checks). White fails contrast on this orange; dark-on-orange passes and reads more premium |
| `ghostTarget` | `#838388` | ~4.6:1 | The "previous performance / target to beat" ghost number in set rows. Kept at AA because it is **functional**, not decorative |

### 1.4 Accent — warm orange (single swappable token)

The accent is the only saturated color in the UI. It marks the brand and **interactive/active** elements (primary button, active set/tab, chart line, focus). It is intentionally isolated to one token plus derived values, so the hue can be changed app-wide in one place.

| Token | Value | Use |
|---|---|---|
| `accent` | `#FF6A28` | Primary buttons, active fills, chart line, active tab, checked sets |
| `accentPressed` | `#E0561C` | Pressed/active state of accent surfaces |
| `accentText` | `#FF8A4D` | Accent-colored **small text/links on dark** (bright orange clears AA comfortably on near-black) |
| `accentSubtle` | `rgba(255,106,40,0.14)` | Translucent fills: selected states, PR-adjacent chips |
| `accentBorder` | `rgba(255,106,40,0.40)` | Focus rings, featured-card outline |

> **Text and icons on the accent are near-black** (`textOnAccent` `#141210`), never white. White on this orange fails WCAG contrast; dark-on-orange passes comfortably (~6.3:1) and is the more premium look (think fintech "black-on-bright"). This applies to the primary button label, the Start FAB glyph, and the set check mark.

> **Swapping the accent later:** change `accent` (and re-derive the four values above). Because grays are true-neutral and nothing hardcodes a color, the swap is a single-source change.

### 1.5 Semantic colors (used sparingly)

| Token | Hex | Use |
|---|---|---|
| `success` | `#3DDC84` | Confirmations (workout saved, sync ok). *Not* used for the set-check (that's accent blue). |
| `destructive` | `#FF5C5C` | Delete actions, errors. **Reserved for danger** — never used as an accent. |
| `pr` (personal record) | `#A98BFF` | The PR highlight — a **cool violet**, reserved solely for the personal-record moment so it stays distinct from the warm orange accent and never reads as "interactive." Used only as a small solid dot/badge, **never** a gradient |
| `prSubtle` | `rgba(169,139,255,0.15)` | PR chip/badge background |
| `warning` | `#E8A33A` | Rare cautions only |

### 1.6 Progress deltas (decided)

- **Gains:** `accent` / `accentText` (e.g. `+26 lb`).
- **Losses:** `textSecondary` (muted neutral) — direction carried by the `−` sign / arrow.
- Red and green are **not** used for deltas, keeping the progress screen monochrome + accent.

---

## 2. Typography

### 2.1 Families

- **Display & numerals:** **Archivo** at its **Expanded** width (variable axis `wdth ≈ 118`, `wght 800`). Used for hero numbers, big stats, and screen-hero titles.
- **Body & UI:** **Archivo** standard width, weights 400/500/600.
- **Fallback stack:** `Archivo, system-ui, -apple-system, "Helvetica Neue", sans-serif`.
- **Not Inter.** Archivo is the single family across the app; personality comes from the *width and weight* range, not from mixing fonts.

> **Expo setup:** load standard **Archivo** (weights 400/500/600) as the body/UI family via `@expo-google-fonts/archivo`. For the Expanded display style (hero numbers and titles), **bundle a separate STATIC Archivo Expanded instance as its own named family** (e.g. `ArchivoExpanded-Bold.ttf` → family `"ArchivoExpanded"`) and reference it directly. Do **not** rely on the variable-width axis (`fontVariationSettings: 'wdth'`) at runtime: variable-font width support is unreliable in React Native, especially on Android and older iOS, so the expanded width that looks perfect in a browser mockup may silently render at normal width on a device. Shipping the expanded width as its own static font is what makes the device match the design.

### 2.2 Numerals

- **Lining + tabular** everywhere numbers appear (so columns align and a `1` doesn't reshuffle a row when it becomes an `8`).
- React Native (iOS): `style={{ fontVariant: ['tabular-nums'] }}`.
- No separate mono font — numbers stay in Archivo for full cohesion.

### 2.3 Type scale (dramatic, two-speed)

Big and confident only at hero moments; calm and restrained everywhere else.

| Role | Font / width | Size | Weight | Line height | Letter-spacing | Notes |
|---|---|---|---|---|---|---|
| `displayXL` | Archivo Expanded | 48 | 800 | 0.95 | 0 | The weight being entered (number pad), biggest moment, tabular |
| `displayL` | Archivo Expanded | 34 | 800 | 1.0 | 0 | Hero stat (e.g. current 1RM), tabular |
| `titleXL` | Archivo Expanded | 28 | 800 | 1.05 | 0.01em | Screen hero ("Ready to lift") |
| `title` | Archivo | 20 | 600 | 1.2 | 0 | Screen titles |
| `headline` | Archivo | 17 | 600 | 1.3 | 0 | Card titles, exercise names |
| `body` | Archivo | 16 | 400 | 1.5 | 0 | Default body |
| `bodyStrong` | Archivo | 15 | 500 | 1.45 | 0 | Emphasized body, button labels |
| `caption` | Archivo | 13 | 400 | 1.4 | 0 | Secondary captions |
| `overline` | Archivo | 11 | 500 | 1.2 | 0.13em | UPPERCASE labels (e.g. "BENCH PRESS", "UP NEXT") |
| `numInline` | Archivo | 16 | 500 | 1.3 | 0 | Set-table values, tabular |
| `numEmphasis` | Archivo Expanded | 22 | 700 | 1.1 | 0 | Emphasized inline number, tabular |

- **Sentence case** for content; UPPERCASE reserved for the `overline` label role only.

---

## 3. Spacing & layout (8pt-based)

Density is **balanced** — comfortable and premium, efficient where it counts (the logging table).

| Token | px |
|---|---|
| `space-1` | 4 |
| `space-2` | 8 |
| `space-3` | 12 |
| `space-4` | 16 |
| `space-5` | 20 |
| `space-6` | 24 |
| `space-8` | 32 |
| `space-10` | 40 |
| `space-12` | 48 |

**Layout rhythm**
- Screen horizontal padding: **16**.
- Card padding: **16** (min 14).
- Section gap: **24**.
- List/set-row vertical padding: **~12** (the balanced rhythm — keeps a full exercise's sets on screen while staying calm).
- Use `rem`-equivalent steps for vertical rhythm; px for component-internal gaps.

---

## 4. Corner radius (8px-anchored scale)

| Token | px | Applies to |
|---|---|---|
| `radius-xs` | 4 | Chips, badges (e.g. the PR chip), small toggles |
| `radius-sm` | 8 | **Workhorse** — buttons, inputs, list rows, number-pad keys |
| `radius-md` | 12 | Cards |
| `radius-lg` | 16 | Bottom sheets, modals, number pad |
| `radius-full` | 9999 | Pills, FAB, avatars, check circles |

**Rules**
- **Nesting:** an element inside a `radius-md` card uses `radius-sm`; a chip inside that uses `radius-xs`. Inner radius is always one step tighter than its container — this is what makes radii look intentional.
- **No rounded corners on single-sided borders** (e.g. an accent `border-left`); set that element's radius to 0.
- Keep it crisp — never drift toward soft 18–20px bubble cards.

---

## 5. Elevation (lightness-led + supporting shadow, mode-aware)

On dark, depth comes mostly from **lightness** (the surface ramp in §1.1); shadows are a soft supporting layer. All shadow values are stored as **mode-aware tokens**, so a future light mode supplies its own (more visible) shadows under the same names.

| Token | Surface | Shadow (dark) | Use |
|---|---|---|---|
| `elev-1` | `surface` `#141416` | `0 6px 20px rgba(0,0,0,0.45)` | Resting cards |
| `elev-2` | `surfaceRaised` `#1E1E21` | `0 8px 24px rgba(0,0,0,0.50)` | Active/raised cards |
| `elev-3` | `surfaceOverlay` `#26262A` | `0 -12px 36px rgba(0,0,0,0.60)` (sheets, upward) / `0 12px 32px rgba(0,0,0,0.60)` | Bottom sheets, number pad, popovers |
| `fabShadow` | `accent` | `0 8px 22px rgba(255,106,40,0.42)` | The Start FAB (subtle accent glow) |

- **Floating layers** (sheets, modals, number pad) also place a **scrim** behind them: `rgba(0,0,0,0.55)`, and a faint top-edge highlight (`rgba(255,255,255,0.07)` 0.5px) so the lighter surface reads as catching light.
- Cards never rely on shadow alone — the lightness step does the primary work.

---

## 6. Iconography

- **Style:** line, **1.5px** stroke, **round** caps and joins (echoing the soft-ish 8px corners). Filled weight used only for *active* states.
- **Library:** **Phosphor** (`phosphor-react-native`) — ships matched line + fill weights, so the inactive-line / active-fill pattern is built-in, and it's distinctive rather than the default everyone uses. Tune to ~1.5px (its `regular`/`light` weight).
- **Sizes:** 20 inline · 24 standard (nav/tab) · 28 large. Decorative icons get `aria-hidden`; icon-only controls get an `accessibilityLabel`.
- **Color:** inactive `#7A7A7D` (tab) / `textSecondary` (inline); **active = `accent`, filled**.
- **Per-exercise icons (PRD requirement):** a small **custom** set keyed to *equipment category*, not per-exercise — `barbell, dumbbell, machine, cable, kettlebell, bodyweight, band, plate`. Drawn at the same 1.5px round style for consistency; each exercise maps to one. Custom-exercise creation inherits the category icon.

---

## 7. Motion & interaction

Snappy and responsive — motion is present but never makes you wait, which matters for an app used between sets.

**Durations**
- `instant` 80ms — micro feedback
- `fast` 130ms — **default**: taps, toggles, button press, set check-off
- `medium` 200ms — sheet/number-pad rise, content transitions
- `slow` 280ms — large/screen-level transitions only

**Easing**
- Entrances / most: `cubic-bezier(0.2, 0, 0, 1)` (quick decelerate)
- Exits: `cubic-bezier(0.4, 0, 1, 1)`
- Interactive "satisfying" moments (check-off, press): a light spring (Reanimated `damping ≈ 18`, `stiffness ≈ 180`)

**Transitions**
- Screens: native iOS stack push (horizontal slide).
- Number pad / sheets / modals: bottom-sheet slide up, `medium` decel, with scrim fade.

**Press feedback:** `scale(0.97)` + `brightness(0.92)`, `fast`.

**Haptics (`expo-haptics`)**
- Selection tick on each number-key tap and field focus.
- Light impact (rigid) on **set check-off** — the core satisfying moment.
- Notification **success** on a new PR and on finishing a workout.
- Medium impact when starting a workout (the Start FAB).

---

## 8. Core components

### 8.1 Buttons

Hierarchy: **orange primary → gray secondary → text tertiary → red destructive.** Orange stays special by being the only saturated element.

| Variant | Fill | Text | Notes |
|---|---|---|---|
| Primary | `accent` `#FF6A28` | `textOnAccent` `#141210`, Archivo 600/15 | Height 50, `radius-sm`; press → `accentPressed` + scale 0.97 |
| Secondary | `surfaceRaised` `#1E1E21` | `#EDEDED`, 600/15 | Same metrics; clear "second place" weight |
| Tertiary | transparent | `textSecondary` or `accentText` | Low-emphasis actions (e.g. "Cancel") |
| Destructive | transparent (or filled red in confirm dialogs) | `destructive` `#FF5C5C` | "Delete set" etc. |
| Icon button | transparent | icon 24 | 44×44 minimum tap area |
| FAB (Start) | `accent` circle 56 | **near-black** `+` / Start glyph 26 (`textOnAccent`, dark-on-accent) | Raised −24 into the tab bar, `fabShadow`, label "Start" |

### 8.2 Inputs

- **Text input:** height 48, `surfaceRaised` bg, `borderDefault` 0.5px, `radius-sm`; text 16 `textPrimary`, placeholder `textTertiary`; focus → `accentBorder` ring (subtle, no heavy glow). Label uses the `overline` role above the field.

### 8.3 Number pad (the logging input — custom)

A bottom sheet (`radius-lg` top, `elev-3`, scrim behind):
- **Grabber** bar at top.
- **Field display:** active field's value in `displayL` (Archivo Expanded 34, tabular); the active field gets a 2px `accent` underline, inactive a `surfaceHigh` underline.
- **Plate chips:** `+2.5 / +5 / +10 / +25` pills (`surfaceHigh`, `radius-full`) for one-tap weight bumps.
- **Keypad:** 3-column grid — `1–9`, `.`, `0`, backspace — Archivo 26, tabular; keys ≥ 44 tall, `radius-sm` pressed highlight.
- **Primary action:** "Log & next set" (primary button + check icon) — logs the set, checks it off, advances to the next. A full set is one or two taps.

### 8.4 Set-logging row (the heart of the app)

- Grid: `[ set label ] [ weight ] [ reps ] [ check ]`, ~12 vertical padding, `borderSubtle` divider between rows.
- Numbers `numInline` (tabular). Previous performance shows as **ghost text** (`ghostTarget` `#838388`, kept at AA since it is the functional target to beat) until you enter your own.
- **Check circle:** 24 visual / 44 tap area; **`accent` filled** when complete (check glyph in near-black `textOnAccent` for contrast), hairline ring when not; light haptic on check.
- **Tap row** → number pad for that set. **Tap a logged value** → edit. **Swipe** → delete (`destructive`). All without leaving the screen.

### 8.5 Cards

`surface` bg, `radius-md`, padding 16, `elev-1` shadow. Featured/selected card may use a 1px `accentBorder` (keep the same fill). Active card steps to `surfaceRaised` + `elev-2`.

### 8.6 List rows

Height 56 (44 min), `borderSubtle` divider, optional leading icon, trailing chevron in `textTertiary`; pressed = `surfaceRaised`.

### 8.7 Tab bar (center action)

- Height 56 + safe-area inset; background **subtly translucent/blurred** (`rgba(10,10,11,0.8)` + 20px blur) with a `borderSubtle` top edge.
- Four labeled items — **Home · Routines · Progress · Profile** — plus a raised **center Start FAB** (−24) between Routines and Progress.
- Inactive: line icon `#7A7A7D` + 10px label `#7A7A7D`. Active: **filled `accent` icon + `accent` label**.
- The home screen *also* keeps its own primary "Start workout" button — both Start entry points are intentional, so there is always a one-tap way to begin.

### 8.8 Charts (progress — Apple-Stocks style)

- **Line:** `accent`, 2.5px, round caps/joins.
- **Fill:** soft vertical gradient under the line, `accent` `0.30 → 0` opacity.
- **Gridlines:** up to 3 faint horizontals `rgba(255,255,255,0.06)`; **right-aligned** value labels in `textTertiary`, tabular, ~9–10px.
- **PR point:** `pr` violet dot (r≈4.5) with a soft `0.35` ring.
- **Scrub:** dashed vertical hairline `rgba(255,255,255,0.18)` + white dot with `accent` ring + a value bubble (`surfaceOverlay`); tap/drag to read exact values (replaces a dense grid).
- **Range chips:** `1M · 3M · 6M · 1Y · All` pills; active = `accent`.
- **Primary metric:** estimated 1RM. **Secondary chart:** total volume, drawn as muted bars (`surfaceRaised`) with the current/selected bar in `accent`.

---

## 9. Do / Don't (the personality, in words)

**Do**
- Keep it near-black, true-neutral, and mostly grayscale; let one warm orange accent carry all the energy.
- Put near-black (not white) on the orange — it's the accessible, premium choice.
- Make a few numeric/heading moments genuinely big and confident; keep everything else calm.
- Use lightness for depth, hairlines for fine detail, and a soft shadow as support.
- Align every number (tabular), and keep tap targets generous.
- Let restraint do the work — empty space is a feature.

**Don't**
- No pure `#000` (crushes detail, smears on OLED).
- No neon or glowing accents (the orange is confident, not fluorescent); no gradient-mesh backgrounds.
- No violet beyond the small solid PR highlight — never as a gradient, fill, or background.
- No Inter or the default system font.
- No soft, pillowy bubble corners.
- No stock icon set used by every app.
- No "color confetti" — multiple bright tag colors competing.
- No emoji as UI.
- No heavy, muddy shadows.
- Nothing resembling a cluttered social feed or home feed (this is "ready to lift," not "see what others posted").
- Don't invent or improvise outside this system — follow it precisely, page by page.

---

## 10. Accessibility

- **Contrast:** target **WCAG AA** (4.5:1 body text, 3:1 large text and UI). `textPrimary`/`textSecondary` clear it comfortably; `textTertiary` is reserved for large or non-essential text, and the functional set-row target uses `ghostTarget` (~4.6:1) instead. Accent-colored small text on dark uses `accentText` `#FF8A4D`; text/icons sitting **on** the orange accent use near-black `textOnAccent` (~6.3:1), not white.
- **Tap targets:** **44pt minimum** hit area for every interactive element, even when the icon/visual inside is smaller (e.g. the 24px check circle).
- **Dynamic Type:** support iOS Dynamic Type so text scales with the user's system setting, with sensible maximum caps so hero numbers and set tables reflow without breaking.
- A dedicated high-contrast mode is **not** in v1 but the token structure leaves room for it later.

---

## 11. Brand / logo — to explore (not yet decided)

No name or logo yet. Recommended direction when explored:
- **Wordmark** set in **Archivo Expanded** (cohesive with the app type), monochrome white or `accent`.
- **Mark / app icon:** a single minimal symbol on a deep near-black tile — the **upward progress-line** motif is a strong conceptual tie-in (it echoes the 1RM chart); a clean **barbell** glyph is the alternate. Keep it line-based, 1.5px, in white or `accent`.

---

## Appendix — implementation notes

- Centralize every value above in one `tokens.ts` (colors, type, spacing, radius, elevation, motion). Components reference tokens only — **never hardcode a color or size** (this is what makes the accent swap and a future light mode trivial).
- Structure color tokens as `{ dark: '#…' }` now, ready to add `{ light: '#…' }` later.
- Fonts: standard **Archivo** via Expo for body/UI; a **separate static Archivo Expanded** font family for the display/numeral style (do not rely on the runtime variable-width axis — see §2.1). Icons: `phosphor-react-native` for UI; a small custom SVG set for equipment.
- Tabular numbers on iOS: `fontVariant: ['tabular-nums']`.
- Motion: Reanimated for the spring-based check-off and press; native stack for screen transitions; a bottom-sheet library (or Reanimated) for the number pad.
- Haptics: `expo-haptics` mapped to the moments in §7.
