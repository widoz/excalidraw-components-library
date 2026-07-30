import { CANVAS, fontAdvance, fontFaces, palettes, sloppinessValues, strokeLadders, TRANSPARENT } from "./tokens.js";

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
};

const EDGES: readonly EdgesName[] = ["sharp", "round"];

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

  const paletteName = pick("palette", preset.palette ?? DEFAULT_PRESET.palette,
    Object.keys(palettes) as PaletteName[]);
  const strokeName = pick("strokeWidth", preset.strokeWidth ?? DEFAULT_PRESET.strokeWidth,
    Object.keys(strokeLadders) as StrokeName[]);
  const sloppiness = pick("sloppiness", preset.sloppiness ?? DEFAULT_PRESET.sloppiness,
    Object.keys(sloppinessValues) as SloppinessName[]);
  const fontName = pick("font", preset.font ?? DEFAULT_PRESET.font,
    Object.keys(fontFaces) as FontName[]);
  const edges = pick("edges", preset.edges ?? DEFAULT_PRESET.edges, EDGES);

  const p = palettes[paletteName];

  return {
    name: preset.name,
    palette: {
      ink: p[900],
      surface: p[50],
      muted: p[200],
      border: p[300],
      subtle: p[400],
      mutedText: p[500],
      accent: p[700],
      accentText: p[50],
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
