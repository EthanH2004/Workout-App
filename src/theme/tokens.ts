/**
 * tokens.ts — THE design system in code.
 *
 * Source of truth: docs/Workout-Tracker-Design-System.md.
 * Components reference these tokens ONLY — never hardcode a color, size, radius,
 * font, or duration. If a value is missing, add it here.
 *
 * Colors are dark-mode values today. They are kept behind a single active-scheme
 * indirection (`colors = darkColors`) so a light mode can be added later by
 * supplying a second palette and switching the selector — without touching any
 * component. Grays are true-neutral; the only saturated color is the accent.
 */
import type { TextStyle, ViewStyle } from 'react-native';

/* -------------------------------------------------------------------------- */
/* 1. Color                                                                   */
/* -------------------------------------------------------------------------- */

const darkColors = {
  // 1.1 Surfaces (depth by lightness; base is soft near-black, never pure #000)
  bg: '#0A0A0B',
  surface: '#141416',
  surfaceRaised: '#1E1E21',
  surfaceOverlay: '#26262A',
  surfaceHigh: '#2E2E33',

  // 1.2 Borders & dividers (hairlines)
  borderSubtle: 'rgba(255,255,255,0.07)',
  borderDefault: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.16)',

  // 1.3 Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9A9A9D',
  textTertiary: '#6A6A6D',
  textDisabled: '#4A4A4D',
  textOnAccent: '#141210', // near-black on the orange; white fails contrast here
  ghostTarget: '#838388', // "previous performance / target to beat" in set rows

  // 1.4 Accent — warm orange (single swappable token + derived values)
  accent: '#FF6A28',
  accentPressed: '#E0561C',
  accentText: '#FF8A4D', // accent-colored small text/links on dark
  accentSubtle: 'rgba(255,106,40,0.14)',
  accentBorder: 'rgba(255,106,40,0.40)',

  // 1.5 Semantic (used sparingly)
  success: '#3DDC84',
  destructive: '#FF5C5C',
  pr: '#A98BFF', // personal-record violet; small solid dot/badge only, never a gradient
  prSubtle: 'rgba(169,139,255,0.15)',
  warning: '#E8A33A',

  // Icons / tabs (§6, §8.7)
  tabInactive: '#7A7A7D',

  // Floating layers (§5)
  scrim: 'rgba(0,0,0,0.55)',
  topEdgeHighlight: 'rgba(255,255,255,0.07)',
  tabBarBackground: 'rgba(10,10,11,0.8)', // translucent fill over a 20px blur

  // Charts (§8.8)
  chartGridline: 'rgba(255,255,255,0.06)',
  chartScrubLine: 'rgba(255,255,255,0.18)',
} as const;

export type ColorToken = keyof typeof darkColors;

/** Active color scheme. Light mode later: add `lightColors` and switch here. */
export const colors: Record<ColorToken, string> = darkColors;

/* -------------------------------------------------------------------------- */
/* 2. Typography                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Font family names. These exact strings are the keys registered via `useFonts`
 * in app/_layout.tsx, so they ARE the usable `fontFamily` values.
 *
 * Standard Archivo (weights 400/500/600) comes from @expo-google-fonts/archivo.
 * The Expanded display style is a SEPARATE static font bundled in assets/fonts —
 * never the runtime variable-width axis (unreliable on device; see §2.1).
 */
export const fontFamily = {
  regular: 'Archivo_400Regular',
  medium: 'Archivo_500Medium',
  semibold: 'Archivo_600SemiBold',
  expandedBold: 'ArchivoExpanded_700Bold', // static, wdth 118 / wght 700
  expandedExtraBold: 'ArchivoExpanded_800ExtraBold', // static, wdth 118 / wght 800
} as const;

export type TypeVariant =
  | 'displayXL'
  | 'displayL'
  | 'titleXL'
  | 'title'
  | 'headline'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'overline'
  | 'numInline'
  | 'numEmphasis'
  | 'tabLabel';

/**
 * Two-speed type scale: a few big, confident Expanded moments above an otherwise
 * calm standard-width scale. Line heights are absolute px (size × ratio, rounded);
 * letter-spacing is px (em × size). Custom font files already carry their weight,
 * so we set `fontFamily` and never `fontWeight`. Numerals are lining + tabular.
 */
export const typography: Record<TypeVariant, TextStyle> = {
  displayXL: {
    fontFamily: fontFamily.expandedExtraBold,
    fontSize: 48,
    lineHeight: 46,
    fontVariant: ['tabular-nums'],
  },
  displayL: {
    fontFamily: fontFamily.expandedExtraBold,
    fontSize: 34,
    lineHeight: 34,
    fontVariant: ['tabular-nums'],
  },
  titleXL: {
    fontFamily: fontFamily.expandedExtraBold,
    fontSize: 28,
    lineHeight: 29,
    letterSpacing: 0.28,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 20,
    lineHeight: 24,
  },
  headline: {
    fontFamily: fontFamily.semibold,
    fontSize: 17,
    lineHeight: 22,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyStrong: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  overline: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 1.43,
    textTransform: 'uppercase',
  },
  numInline: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    lineHeight: 21,
    fontVariant: ['tabular-nums'],
  },
  numEmphasis: {
    fontFamily: fontFamily.expandedBold,
    fontSize: 22,
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
  // Tab-bar label (§8.7): 10px, sentence case (distinct from the uppercase overline)
  tabLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    lineHeight: 12,
  },
};

/* -------------------------------------------------------------------------- */
/* 3. Spacing & layout (8pt-based)                                            */
/* -------------------------------------------------------------------------- */

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const layout = {
  screenPaddingX: 16, // screen horizontal padding
  cardPadding: 16,
  cardPaddingMin: 14,
  sectionGap: 24,
  rowPaddingY: 12, // list / set-row vertical padding (the balanced rhythm)
  listRowHeight: 56, // 44 min
  minTapTarget: 44, // every interactive element
  buttonHeight: 50, // primary / secondary buttons (§8.1)
  inputHeight: 48, // text inputs (§8.2)
  tabBarHeight: 56, // + safe-area inset
  fabSize: 56, // the Start FAB circle (§8.1)
  fabRaise: 24, // FAB raised −24 into the tab bar (§8.7)
  borderHairline: 0.5,
} as const;

/* -------------------------------------------------------------------------- */
/* 4. Corner radius (inner radius is always one step tighter than container)   */
/* -------------------------------------------------------------------------- */

export const radius = {
  xs: 4, // chips, badges
  sm: 8, // workhorse — buttons, inputs, rows, keys
  md: 12, // cards
  lg: 16, // sheets, modals, number pad
  full: 9999, // pills, FAB, avatars, check circles
} as const;

/* -------------------------------------------------------------------------- */
/* 5. Elevation (lightness-led + a soft supporting shadow)                    */
/* -------------------------------------------------------------------------- */

export type ElevationToken = 'elev1' | 'elev2' | 'elev3' | 'sheetShadowUp' | 'fabShadow';

export const elevation: Record<ElevationToken, ViewStyle> = {
  elev1: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  elev2: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  elev3: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    elevation: 16,
  },
  // sheets / number pad rise from the bottom, so the shadow points upward
  sheetShadowUp: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.6,
    shadowRadius: 36,
    elevation: 16,
  },
  // the Start FAB carries a subtle accent glow
  fabShadow: {
    shadowColor: darkColors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.42,
    shadowRadius: 22,
    elevation: 10,
  },
};

/* -------------------------------------------------------------------------- */
/* 6. Iconography                                                             */
/* -------------------------------------------------------------------------- */

export const icon = {
  size: { inline: 20, standard: 24, large: 28, fab: 26 }, // fab: the Start glyph (§8.1)
  stroke: 1.5, // line weight; filled weight reserved for active states
} as const;

/* -------------------------------------------------------------------------- */
/* 7. Motion & interaction                                                    */
/* -------------------------------------------------------------------------- */

export const motion = {
  duration: {
    instant: 80, // micro feedback
    fast: 130, // default: taps, toggles, set check-off
    medium: 200, // sheet / number-pad rise, content transitions
    slow: 280, // large / screen-level transitions only
  },
  // cubic-bezier control points, ready for Easing.bezier(...easing.standard)
  easing: {
    standard: [0.2, 0, 0, 1], // entrances / most (quick decelerate)
    exit: [0.4, 0, 1, 1],
  },
  // the "satisfying" spring for check-off and press (Reanimated)
  spring: { damping: 18, stiffness: 180 },
  // press feedback: scale(0.97) + brightness(0.92) — brightness approximated by opacity
  press: { scale: 0.97, opacity: 0.92 },
} as const;

/* -------------------------------------------------------------------------- */
/* Aggregate (optional convenience import)                                    */
/* -------------------------------------------------------------------------- */

export const tokens = {
  colors,
  fontFamily,
  typography,
  spacing,
  layout,
  radius,
  elevation,
  icon,
  motion,
} as const;
