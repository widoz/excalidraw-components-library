/** shadcn/ui "zinc" base colour scale. */
export const zinc = {
  50: "#fafafa",
  100: "#f4f4f5",
  200: "#e4e4e7",
  300: "#d4d4d8",
  400: "#9f9fa9",
  500: "#71717b",
  600: "#52525c",
  700: "#3f3f46",
  800: "#27272a",
  900: "#18181b",
  950: "#09090b",
} as const;

/**
 * Semantic colour roles. These are NAMES, not values — `Factory` resolves them against
 * the active theme at emission. Components reference roles; only `theme.ts` knows hex.
 */
export const color = {
  ink: "ink",
  surface: "surface",
  muted: "muted",
  border: "border",
  subtle: "subtle",
  mutedText: "mutedText",
  accent: "accent",
  accentText: "accentText",
  transparent: "transparent",
  canvas: "canvas",
} as const;

/**
 * Deprecated: the default theme's palette used to live here, computed via
 * `resolveTheme(DEFAULT_PRESET)`. That created a `tokens.ts` <-> `theme.ts` import
 * cycle that breaks at module-evaluation time (`palettes` is not yet initialised
 * when `resolveTheme` would run). It now lives in `theme.ts`; `validate.ts` imports
 * it from there. Task 7 replaces this with a per-theme set.
 */

/** The comic look, applied to every shape. */
export const style = {
  roughness: 2,
  strokeWidth: 4,
  /** Hard drop-shadow displacement, in px, down and right. */
  shadowOffset: 6,
} as const;

/**
 * Font roles. Names, not ids — `Factory` resolves them per theme. The body face is a
 * preset choice; headings, emphasis and button labels are always Comic Shanns.
 */
export const font = { body: "body", heading: "heading" } as const;

export const size = {
  /** Canonical width of a form control. */
  control: 320,
  rowHeight: 48,
  gap: 16,
  radius: 8,
  fontSm: 16,
  fontMd: 20,
  fontLg: 28,
} as const;

/**
 * shadcn/ui base colour scales.
 *
 * Source: shadcn-ui/ui → packages/shadcn/src/colors.ts, which defines these in OKLCH.
 * The values below are the sRGB conversion. To re-verify, convert that file's OKLCH
 * triples and compare against this table.
 */
export const palettes = {
  zinc,
  neutral: {
    50: "#fafafa", 100: "#f5f5f5", 200: "#e5e5e5", 300: "#d4d4d4", 400: "#a1a1a1",
    500: "#737373", 600: "#525252", 700: "#404040", 800: "#262626", 900: "#171717",
    950: "#0a0a0a",
  },
  stone: {
    50: "#fafaf9", 100: "#f5f5f4", 200: "#e7e5e4", 300: "#d6d3d1", 400: "#a6a09b",
    500: "#79716b", 600: "#57534d", 700: "#44403b", 800: "#292524", 900: "#1c1917",
    950: "#0c0a09",
  },
  mauve: {
    50: "#fafafa", 100: "#f3f1f3", 200: "#e7e4e7", 300: "#d7d0d7", 400: "#a89ea9",
    500: "#79697b", 600: "#594c5b", 700: "#463947", 800: "#2a212c", 900: "#1d161e",
    950: "#0c090c",
  },
  olive: {
    50: "#fbfbf9", 100: "#f4f4f0", 200: "#e8e8e3", 300: "#d8d8d0", 400: "#abab9c",
    500: "#7c7c67", 600: "#5b5b4b", 700: "#474739", 800: "#2b2b22", 900: "#1d1d16",
    950: "#0c0c09",
  },
  mist: {
    50: "#f9fbfb", 100: "#f1f3f3", 200: "#e3e7e8", 300: "#d0d6d8", 400: "#9ca8ab",
    500: "#67787c", 600: "#4b585b", 700: "#394447", 800: "#22292b", 900: "#161b1d",
    950: "#090b0c",
  },
  taupe: {
    50: "#fbfaf9", 100: "#f3f1f1", 200: "#e8e4e3", 300: "#d8d2d0", 400: "#aba09c",
    500: "#7c6d67", 600: "#5b4f4b", 700: "#473c39", 800: "#2b2422", 900: "#1d1816",
    950: "#0c0a09",
  },
} as const;

/** Not part of any palette: the literal Excalidraw uses for "no fill". */
export const TRANSPARENT = "transparent";
/** The canvas background, deliberately pure white under every palette. */
export const CANVAS = "#ffffff";

/** Stroke ladder rungs. Names, not values — `Factory` resolves them per theme. */
export const stroke = {
  /** The bold comic ink: component silhouettes. */
  outline: "outline",
  /** Hairlines: table rules, separators, carets, resize grips. */
  hairline: "hairline",
  /** The hard-shadow shape's own outline, kept thin so it doesn't fatten the silhouette. */
  shadow: "shadow",
} as const;

/** Stroke ladders. The library uses three weights at once; a preset scales all three. */
export const strokeLadders = {
  bold: { outline: 4, hairline: 2, shadow: 1 },
  medium: { outline: 2, hairline: 1, shadow: 1 },
  thin: { outline: 1, hairline: 1, shadow: 1 },
} as const;

/** Excalidraw roughness values, under Excalidraw's own names. */
export const sloppinessValues = { architect: 0, artist: 1, cartoonist: 2 } as const;

/**
 * Body face → Excalidraw font id. Headings are always Comic Shanns (7).
 * Id 1 is Excalidraw's legacy slot resolving to Excalifont; it is kept rather than
 * switching to 5 so the default preset's output stays byte-identical.
 */
export const fontFaces = {
  "comic-shanns": { body: 7, heading: 7 },
  excalifont: { body: 1, heading: 7 },
  nunito: { body: 6, heading: 7 },
} as const;

/**
 * Chars-per-em advance approximation per body face.
 *
 * `excalifont` is anchored at 0.55: the whole library was generated with that value and
 * visually verified in Excalidraw, so it is the one entry with evidence behind it. The
 * other two are estimates relative to that anchor — Comic Shanns is a wider face, Nunito
 * a slightly narrower one. None of these are measured font metrics.
 *
 * The guard is behavioural, not numeric: the per-preset containment suite fails if a text
 * element escapes its component's box. If a preset trips it, tune that face's value here.
 */
export const fontAdvance = {
  "comic-shanns": 0.58,
  excalifont: 0.55,
  nunito: 0.5,
} as const;
