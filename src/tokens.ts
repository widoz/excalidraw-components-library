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

/**
 * The comic look, applied to every shape.
 *
 * `roughness` and `strokeWidth` used to live here as fixed numbers. Both are preset
 * choices now (`theme.roughness`, `theme.strokes.*`), and a component reaching for a
 * number here would silently pin one preset's value under every preset — a `Factory`
 * rung name, by contrast, is checked and throws. They were unused, so they are gone.
 */
export const style = {
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
