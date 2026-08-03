import { CANVAS, fontAdvance, fontFaces, sloppinessValues, strokeLadders, TRANSPARENT } from "./tokens.js";
import { palettes } from "./palettes.js";

export type ColorRole =
  | "ink" | "surface" | "muted" | "border" | "subtle"
  | "mutedText" | "accent" | "accentText" | "transparent" | "canvas";
export type FontRole = "body" | "heading";
export type StrokeRung = "outline" | "hairline" | "shadow";

export type PaletteName = keyof typeof palettes;
export type StrokeName = keyof typeof strokeLadders;
export type SloppinessName = keyof typeof sloppinessValues;
export type FontName = keyof typeof fontFaces;
export type EdgesName = "sharp" | "round";

export interface Preset {
  name: string;
  strokeWidth?: StrokeName;
  sloppiness?: SloppinessName;
  edges?: EdgesName;
  font?: FontName;
  palette?: PaletteName;
  accent?: PaletteName;
}

export interface Theme {
  name: string;
  palette: Record<ColorRole, string>;
  fonts: Record<FontRole, number>;
  strokes: Record<StrokeRung, number>;
  roughness: 0 | 1 | 2;
  edges: EdgesName;
  /** Chars-per-em advance approximation for the body face. */
  advance: number;
}

export const DEFAULT_PRESET: Required<Preset> = {
  name: "default",
  strokeWidth: "bold",
  sloppiness: "cartoonist",
  edges: "round",
  font: "excalifont",
  palette: "zinc",
  accent: "zinc",
};

const EDGES: readonly EdgesName[] = ["sharp", "round"];

/**
 * A preset name becomes a path segment (`dist/<name>/`, `presets/<name>.json`), and
 * `buildAll` starts by recursively removing its output directory. A name containing
 * `..`, a slash, or a leading dot therefore resolves that removal outside `dist/` —
 * `{"name": ".."}` resolves to the repository root. Restricting the charset to a
 * single safe path segment is what makes the name unable to express a traversal at
 * all.
 */
const NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/i;

/** Presets are hand-edited, so a typo must fail loudly rather than silently defaulting. */
function pick<T extends string>(field: string, value: T, legal: readonly T[]): T {
  if (!legal.includes(value)) {
    throw new Error(
      `Preset field "${field}" has illegal value "${value}". Legal values: ${legal.join(", ")}.`,
    );
  }
  return value;
}

export function resolveTheme(preset: Preset): Theme {
  if (!preset.name) throw new Error(`Preset field "name" is required and must be non-empty.`);
  if (!NAME_PATTERN.test(preset.name)) {
    throw new Error(
      `Preset name "${preset.name}" is illegal: a name becomes a path segment, so it must ` +
      `start with a letter or digit and contain only letters, digits and hyphens.`,
    );
  }
  const paletteName = pick("palette", preset.palette ?? DEFAULT_PRESET.palette,
    Object.keys(palettes) as PaletteName[]);
  // Defaulting to the base palette rather than to DEFAULT_PRESET.accent is what makes
  // every preset written before this field existed resolve unchanged.
  const accentName = pick("accent", preset.accent ?? paletteName,
    Object.keys(palettes) as PaletteName[]);
  const strokeName = pick("strokeWidth", preset.strokeWidth ?? DEFAULT_PRESET.strokeWidth,
    Object.keys(strokeLadders) as StrokeName[]);
  const sloppiness = pick("sloppiness", preset.sloppiness ?? DEFAULT_PRESET.sloppiness,
    Object.keys(sloppinessValues) as SloppinessName[]);
  const fontName = pick("font", preset.font ?? DEFAULT_PRESET.font,
    Object.keys(fontFaces) as FontName[]);
  const edges = pick("edges", preset.edges ?? DEFAULT_PRESET.edges, EDGES);

  const base = palettes[paletteName];
  const accent = palettes[accentName];

  return {
    name: preset.name,
    palette: {
      ink: base[900],
      surface: base[50],
      muted: base[200],
      border: base[300],
      // On the base scale, not the accent: this is the only one of the four
      // accent-eligible roles rendered as plain secondary body text on `surface`
      // (placeholders, card descriptions, breadcrumbs, pagination, help text). Measured
      // against a light or high-chroma accent it falls below 4.5:1 (WCAG AA) — e.g.
      // wp-admin's blue accent measures 3.60. `subtle`, `accent` and `accentText` stay
      // on the accent scale because they all sit on controlled backgrounds, not text.
      mutedText: base[500],
      subtle: accent[400],
      accent: accent[700],
      accentText: accent[50],
      transparent: TRANSPARENT,
      canvas: CANVAS,
    },
    fonts: { ...fontFaces[fontName] },
    strokes: { ...strokeLadders[strokeName] },
    roughness: sloppinessValues[sloppiness],
    edges,
    advance: fontAdvance[fontName],
  };
}

/** Every value legally allowed as a stroke or background under this theme. */
export function paletteValues(theme: Theme): ReadonlySet<string> {
  return new Set(Object.values(theme.palette));
}
