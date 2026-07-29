# Style Presets and Build CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the 58-component library be generated in more than one visual style, driven by committed preset files and a small CLI.

**Architecture:** Design tokens stop being literal values and become role *names*. `Factory` — already the only module that writes element JSON — resolves a role into a concrete value against a `Theme`. A `Theme` is resolved from a preset file by `src/theme.ts`. `build.ts` takes a theme and writes to `dist/` (default) or `dist/<preset>/`.

**Tech Stack:** Node 20+, TypeScript 5, tsx, vitest. No runtime dependencies. `node:readline/promises` for CLI prompts.

## Global Constraints

- Node 20+. ES modules. Zero runtime dependencies. `typescript`, `tsx`, `vitest` are devDependencies only.
- No inline hex anywhere outside `src/tokens.ts`.
- Builds are deterministic: seeded PRNG only, never `Math.random()`, never `Date.now()`. Seeds derive from the component name only, never the preset — two presets produce the same wobble with different styling.
- All elements of one component share exactly one groupId.
- Text elements are standalone: `containerId` and `boundElements` always `null`.
- `Factory.line` contract: `x`/`y` is the origin, `points` relative, first point always `[0, 0]`, non-zero extent.
- Fill-only rectangles go through `comic.fillBand()`, never a bare `f.rect`.
- Never nest a rounded shape inside another rounded shape.
- Text-width arithmetic calls `estimateTextWidth`, never re-derived.
- Registry keys stay alphabetical. The default preset's `dist/` is committed; other presets' output is not.
- **The acceptance criterion for Tasks 3–6: `git diff --stat dist/` must be empty.** Those tasks are refactors. If the default preset's output changes by one byte, the refactor is wrong. Task 1 is the only task permitted to change `dist/`.

## Verification every task must pass

`npm run build && npm run validate && npx vitest run && npx tsc --noEmit`, all clean, before committing.

## File structure

| File | Responsibility |
|---|---|
| `src/tokens.ts` (modify) | Role names, the seven palettes, stroke ladders, font maps, advance factors. No logic. |
| `src/theme.ts` (create) | `Preset` schema, `Theme` type, `resolveTheme`, `DEFAULT_PRESET`. Pure. |
| `src/element.ts` (modify) | `Factory` holds a `Theme` and resolves roles at emission. |
| `src/comic.ts` (modify) | Literal stroke widths → rungs. |
| `src/components/*.ts` (modify, 58) | Builder signature; stroke rungs; font roles. No geometry changes. |
| `src/registry.ts` (modify) | `ComponentBuilder` takes a `Theme`. |
| `src/validate.ts` (modify) | Validates against the theme the output was built with. |
| `src/build.ts` (modify) | Takes a theme; resolves the output directory. |
| `src/preset.ts` (create) | The `preset` CLI. |
| `presets/*.json` (create) | Committed preset files. |
| `tests/theme.test.ts` (create) | Theme resolution unit tests. |
| `tests/presets.test.ts` (create) | Cross-preset invariant suite. |

---

### Task 1: Adopt Tailwind v4 zinc

Isolated on purpose. This is the only task allowed to change `dist/`, and it must change nothing else, so the diff reads as the no-op it is.

**Files:**
- Modify: `src/tokens.ts`
- Test: `tests/tokens.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `zinc` with three shifted values.

- [ ] **Step 1: Update the failing test first**

In `tests/tokens.test.ts`, the "exposes the shadcn zinc scale" test pins exact hex. Add assertions for the three that change:

```ts
it("uses shadcn's current (Tailwind v4) zinc values", () => {
  expect(zinc[400]).toBe("#9f9fa9");
  expect(zinc[500]).toBe("#71717b");
  expect(zinc[600]).toBe("#52525c");
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/tokens.test.ts`
Expected: FAIL — receives `#a1a1aa`, `#71717a`, `#52525b`.

- [ ] **Step 3: Update the three values**

In `src/tokens.ts`, inside `zinc`:

```ts
  400: "#9f9fa9",
  500: "#71717b",
  600: "#52525c",
```

- [ ] **Step 4: Run tests and rebuild**

```bash
npx vitest run tests/tokens.test.ts
npm run build && npm run validate && npx vitest run && npx tsc --noEmit
```

- [ ] **Step 5: Confirm the diff is only these three values**

```bash
git diff --stat dist/ | tail -1
git diff dist/ | grep '^[+-]' | grep -oE '#[0-9a-f]{6}' | sort -u
```

Expected: the second command prints only `#9f9fa9 #a1a1aa #71717b #71717a #52525c #52525b`. If any other hex appears, stop — something else changed.

- [ ] **Step 6: Commit**

```bash
git add src/tokens.ts tests/tokens.test.ts dist
git commit -m "chore: adopt shadcn's current Tailwind v4 zinc values"
```

---

### Task 2: The theme module

Pure and self-contained. Nothing consumes it yet, so it can be built and tested in isolation.

**Files:**
- Create: `src/theme.ts`
- Modify: `src/tokens.ts` (add the palette table, ladders, font maps, advance factors)
- Test: `tests/theme.test.ts`

**Interfaces:**
- Consumes: `zinc` from `src/tokens.js`.
- Produces:
  - `type ColorRole = "ink" | "surface" | "muted" | "border" | "subtle" | "mutedText" | "accent" | "accentText" | "transparent" | "canvas"`
  - `type FontRole = "body" | "heading"`
  - `type StrokeRung = "outline" | "hairline" | "shadow"`
  - `type PaletteName = "neutral" | "stone" | "zinc" | "mauve" | "olive" | "mist" | "taupe"`
  - `type StrokeName = "bold" | "medium" | "thin"`
  - `type SloppinessName = "architect" | "artist" | "cartoonist"`
  - `type EdgesName = "sharp" | "round"`
  - `type FontName = "comic-shanns" | "excalifont" | "nunito"`
  - `interface Preset { name: string; strokeWidth?: StrokeName; sloppiness?: SloppinessName; edges?: EdgesName; font?: FontName; palette?: PaletteName }`
  - `interface Theme { name: string; palette: Record<ColorRole, string>; fonts: Record<FontRole, number>; strokes: Record<StrokeRung, number>; roughness: 0 | 1 | 2; edges: EdgesName; advance: number }`
  - `DEFAULT_PRESET: Required<Preset>`
  - `resolveTheme(preset: Preset): Theme`
  - `paletteValues(theme: Theme): ReadonlySet<string>`

- [ ] **Step 1: Add the lookup tables to `src/tokens.ts`**

Append. Keep `zinc` where it is; the new `palettes` record includes it by reference so there is one source of truth for those eleven values.

```ts
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
 * Chars-per-em advance approximation per body face. These are estimates, not measured
 * metrics; the guard is the per-preset containment suite, which fails if text escapes
 * its component's box.
 */
export const fontAdvance = {
  "comic-shanns": 0.55,
  excalifont: 0.5,
  nunito: 0.5,
} as const;
```

- [ ] **Step 2: Write the failing tests**

Create `tests/theme.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET, paletteValues, resolveTheme } from "../src/theme.js";

describe("resolveTheme", () => {
  it("resolves the default preset to today's look", () => {
    const t = resolveTheme({ name: "default" });
    expect(t.palette.ink).toBe("#18181b");
    expect(t.palette.accent).toBe("#3f3f46");
    expect(t.palette.transparent).toBe("transparent");
    expect(t.palette.canvas).toBe("#ffffff");
    expect(t.fonts).toEqual({ body: 7, heading: 7 });
    expect(t.strokes).toEqual({ outline: 4, hairline: 2, shadow: 1 });
    expect(t.roughness).toBe(2);
    expect(t.edges).toBe("round");
    expect(t.advance).toBe(0.55);
  });

  it("fills omitted fields from the default", () => {
    const t = resolveTheme({ name: "partial", palette: "mist" });
    expect(t.palette.ink).toBe("#161b1d");
    expect(t.strokes.outline).toBe(4);
    expect(t.roughness).toBe(2);
  });

  it("maps every palette's roles onto the right shades", () => {
    const t = resolveTheme({ name: "m", palette: "mauve" });
    expect(t.palette.ink).toBe("#1d161e");
    expect(t.palette.surface).toBe("#fafafa");
    expect(t.palette.muted).toBe("#e7e4e7");
    expect(t.palette.border).toBe("#d7d0d7");
    expect(t.palette.subtle).toBe("#a89ea9");
    expect(t.palette.mutedText).toBe("#79697b");
    expect(t.palette.accent).toBe("#463947");
    expect(t.palette.accentText).toBe("#fafafa");
  });

  it("resolves each stroke ladder", () => {
    expect(resolveTheme({ name: "a", strokeWidth: "medium" }).strokes)
      .toEqual({ outline: 2, hairline: 1, shadow: 1 });
    expect(resolveTheme({ name: "b", strokeWidth: "thin" }).strokes)
      .toEqual({ outline: 1, hairline: 1, shadow: 1 });
  });

  it("resolves each sloppiness", () => {
    expect(resolveTheme({ name: "a", sloppiness: "architect" }).roughness).toBe(0);
    expect(resolveTheme({ name: "b", sloppiness: "artist" }).roughness).toBe(1);
    expect(resolveTheme({ name: "c", sloppiness: "cartoonist" }).roughness).toBe(2);
  });

  it("pins headings to Comic Shanns whatever the body face", () => {
    for (const font of ["comic-shanns", "excalifont", "nunito"] as const) {
      expect(resolveTheme({ name: "x", font }).fonts.heading).toBe(7);
    }
    expect(resolveTheme({ name: "n", font: "nunito" }).fonts.body).toBe(6);
    expect(resolveTheme({ name: "e", font: "excalifont" }).fonts.body).toBe(1);
  });

  it("carries the advance factor for the body face", () => {
    expect(resolveTheme({ name: "n", font: "nunito" }).advance).toBe(0.5);
    expect(resolveTheme({ name: "c", font: "comic-shanns" }).advance).toBe(0.55);
  });

  it("throws on an illegal value, naming the field and the legal set", () => {
    expect(() => resolveTheme({ name: "x", palette: "burgundy" as never }))
      .toThrow(/palette.*burgundy.*neutral/s);
    expect(() => resolveTheme({ name: "x", strokeWidth: "chunky" as never }))
      .toThrow(/strokeWidth.*chunky.*bold/s);
    expect(() => resolveTheme({ name: "x", edges: "bevelled" as never }))
      .toThrow(/edges.*bevelled.*sharp/s);
  });

  it("requires a name", () => {
    expect(() => resolveTheme({ name: "" })).toThrow(/name/);
  });
});

describe("paletteValues", () => {
  it("admits only the active palette, plus transparent and canvas", () => {
    const zincValues = paletteValues(resolveTheme({ name: "z", palette: "zinc" }));
    expect(zincValues.has("#18181b")).toBe(true);   // zinc-900
    expect(zincValues.has("transparent")).toBe(true);
    expect(zincValues.has("#ffffff")).toBe(true);
    expect(zincValues.has("#1d161e")).toBe(false);  // mauve-900 must NOT pass
  });

  it("is per-palette, so a wrong-palette hex is rejected", () => {
    const mist = paletteValues(resolveTheme({ name: "m", palette: "mist" }));
    expect(mist.has("#161b1d")).toBe(true);         // mist-900
    expect(mist.has("#18181b")).toBe(false);        // zinc-900
  });
});

describe("DEFAULT_PRESET", () => {
  it("describes today's look with every field set", () => {
    expect(DEFAULT_PRESET).toEqual({
      name: "default",
      strokeWidth: "bold",
      sloppiness: "cartoonist",
      edges: "round",
      font: "comic-shanns",
      palette: "zinc",
    });
  });
});
```

- [ ] **Step 3: Run and watch them fail**

Run: `npx vitest run tests/theme.test.ts`
Expected: FAIL — cannot resolve `../src/theme.js`.

- [ ] **Step 4: Write `src/theme.ts`**

```ts
import { fontAdvance, fontFaces, palettes, sloppinessValues, strokeLadders } from "./tokens.js";

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
  font: "comic-shanns",
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
      transparent: "transparent",
      canvas: "#ffffff",
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
```

- [ ] **Step 5: Run tests and full verification**

```bash
npx vitest run tests/theme.test.ts
npm run build && npm run validate && npx vitest run && npx tsc --noEmit
git diff --stat dist/
```

Expected: theme tests pass, everything else unchanged, `dist/` diff empty.

- [ ] **Step 6: Commit**

```bash
git add src/tokens.ts src/theme.ts tests/theme.test.ts
git commit -m "feat: add theme resolution and the seven shadcn palettes"
```

---

### Task 3: Factory resolves colour roles

The first of three refactor sweeps. Each ends with `git diff --stat dist/` empty.

**Files:**
- Modify: `src/tokens.ts` (`color` becomes role names)
- Modify: `src/element.ts` (`Factory` takes a `Theme`, resolves colours, applies roughness and edges)
- Modify: `src/registry.ts` (`ComponentBuilder` takes a `Theme`)
- Modify: all 58 `src/components/*.ts` (signature + factory construction)
- Modify: `tests/*.test.ts` wherever they compare against `color.*`

**Interfaces:**
- Consumes: `Theme`, `resolveTheme`, `DEFAULT_PRESET` from `src/theme.js`.
- Produces:
  - `color` is now `Record<ColorRole, ColorRole>` — `color.accent === "accent"`.
  - `new Factory(componentName: string, theme: Theme)`
  - `Factory.theme: Theme` (readonly, so `comic.ts` helpers can reach rungs and components can reach `advance`)
  - `type ComponentBuilder = (theme: Theme) => ExcalidrawElement[]`

- [ ] **Step 1: Turn `color` into role names**

In `src/tokens.ts`, replace the `color` object:

```ts
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
```

**Do not delete `PALETTE_VALUES` yet.** `validate.ts` imports it and Task 7 is what replaces that consumer; removing it here would break the build mid-task. Instead redefine it in terms of the default theme so it keeps working unchanged:

```ts
import { DEFAULT_PRESET, resolveTheme } from "./theme.js";

/** Deprecated: the default theme's palette. Task 7 replaces this with a per-theme set. */
export const PALETTE_VALUES: ReadonlySet<string> = new Set(
  Object.values(resolveTheme(DEFAULT_PRESET).palette),
);
```

That creates a `tokens.ts` → `theme.ts` → `tokens.ts` import cycle. ES modules tolerate it here because `resolveTheme` is called at module-evaluation time only after `theme.ts`'s own imports have been initialised — but it is fragile, and Task 7 removes it. If the cycle causes a `TypeError: Cannot read properties of undefined` at startup, move this constant into `theme.ts` as a temporary export instead and import it from there in `validate.ts`.

Leave `style`, `size` and `font` alone for now.

- [ ] **Step 2: Make `Factory` hold a theme and resolve roles**

In `src/element.ts`:

```ts
import type { ColorRole, Theme } from "./theme.js";
```

Add to the class:

```ts
export class Factory {
  readonly groupId: string;
  readonly theme: Theme;
  private readonly rng: () => number;
  private counter = 0;

  constructor(componentName: string, theme: Theme) {
    this.rng = mulberry32(seedFromString(componentName));
    this.groupId = `${componentName}-group`;
    this.theme = theme;
  }

  /** Role name → concrete hex for this theme. */
  private paint(role: string): string {
    const value = this.theme.palette[role as ColorRole];
    if (value === undefined) {
      throw new Error(`Unknown colour role "${role}" — components must use tokens.color.*`);
    }
    return value;
  }
```

In `base()`, resolve the two colour fields and take roughness from the theme:

```ts
      strokeColor: this.paint(o.stroke),
      backgroundColor: this.paint(o.fill),
      ...
      roughness: this.theme.roughness,
```

In `rect()`, apply the edge override:

```ts
      roundness: this.theme.edges === "sharp"
        ? null
        : (o.rounded ?? true) ? { type: 3 } : null,
```

`ellipse()` and `text()` already pass `roundness: null`; `line()` passes `{ type: 2 }`, which is a linear-element curve setting, not a corner radius — leave it alone under `sharp`.

- [ ] **Step 3: Widen the registry's builder type**

In `src/registry.ts`:

```ts
import type { Theme } from "./theme.js";

export type ComponentBuilder = (theme: Theme) => ExcalidrawElement[];
```

The `registry` object itself does not change shape.

- [ ] **Step 4: Sweep the 58 component files**

Each component gains a theme parameter and passes it to its factory. Two lines per file. For example, `src/components/button.ts` goes from:

```ts
export default function button(): ExcalidrawElement[] {
  const f = new Factory("button");
```

to:

```ts
export default function button(theme: Theme): ExcalidrawElement[] {
  const f = new Factory("button", theme);
```

with `import type { Theme } from "../theme.js";` added.

Do this mechanically, then confirm none were missed:

```bash
grep -L "theme: Theme" src/components/*.ts
```

Expected: no output. Any file listed still has the old signature.

- [ ] **Step 5: Update `build.ts` and the tests' call sites so the suite compiles**

`build.ts` needs a theme to pass. Give it the default for now — Task 8 makes it configurable:

```ts
import { DEFAULT_PRESET, resolveTheme } from "./theme.js";

export function buildAll(outDir: string = DEFAULT_OUT): void {
  const theme = resolveTheme(DEFAULT_PRESET);
  ...
    const elements = entry.build(theme);
```

Then fix every test that compares an element's colour to `color.*`. Those now need the resolved value:

```ts
import { DEFAULT_PRESET, resolveTheme } from "../src/theme.js";
const theme = resolveTheme(DEFAULT_PRESET);
// was: e.backgroundColor === color.accent
// now: e.backgroundColor === theme.palette.accent
```

Find them with:

```bash
grep -rn "color\." tests/
```

- [ ] **Step 6: Verify — the acceptance criterion**

```bash
npm run build && npm run validate && npx vitest run && npx tsc --noEmit
git diff --stat dist/
```

Expected: all clean, and **`git diff --stat dist/` prints nothing**. If `dist/` changed, the refactor altered output — find out why before continuing. Do not commit a changed `dist/` in this task.

- [ ] **Step 7: Commit**

```bash
git add src tests
git commit -m "refactor: resolve colour roles through the theme at emission"
```

---

### Task 4: Stroke rungs

**Files:**
- Modify: `src/tokens.ts` (add `stroke` rung names)
- Modify: `src/element.ts` (resolve rung → px)
- Modify: `src/comic.ts` (literal widths → rungs)
- Modify: 19 `src/components/*.ts` files carrying literal `strokeWidth: 2` or `1`

**Interfaces:**
- Consumes: `Factory.theme` from Task 3.
- Produces: `stroke = { outline: "outline", hairline: "hairline", shadow: "shadow" }` in `tokens.ts`; `RectOptions.strokeWidth`, `LineOptions.strokeWidth` and `xMark`'s `strokeWidth` accept a `StrokeRung` name instead of a number.

- [ ] **Step 1: Add the rung names**

In `src/tokens.ts`:

```ts
/** Stroke ladder rungs. Names, not values — `Factory` resolves them per theme. */
export const stroke = {
  /** The bold comic ink: component silhouettes. */
  outline: "outline",
  /** Hairlines: table rules, separators, carets, resize grips. */
  hairline: "hairline",
  /** The hard-shadow shape's own outline, kept thin so it doesn't fatten the silhouette. */
  shadow: "shadow",
} as const;
```

- [ ] **Step 2: Resolve rungs in `Factory`**

In `src/element.ts`, change the option types from `strokeWidth?: number` to `strokeWidth?: StrokeRung` in `RectOptions` and `LineOptions`, and add:

```ts
  private weight(rung: string | undefined): number {
    const value = this.theme.strokes[(rung ?? "outline") as StrokeRung];
    if (value === undefined) {
      throw new Error(`Unknown stroke rung "${rung}" — use tokens.stroke.*`);
    }
    return value;
  }
```

Replace every `o.strokeWidth ?? style.strokeWidth` with `this.weight(o.strokeWidth)`, and the hardcoded `strokeWidth: style.strokeWidth` in `text()` with `this.weight("outline")`.

- [ ] **Step 3: Sweep `src/comic.ts`**

Replace the literals:

- `inkBox`'s and `inkCircle`'s shadow shapes: `strokeWidth: 1` → `strokeWidth: stroke.shadow`
- `fillBand`: `strokeWidth: 1` → `strokeWidth: stroke.shadow`
- `rule`: `o.strokeWidth ?? 2` → `o.strokeWidth ?? stroke.hairline`
- `bubble`'s tail, `swash`, `dots`: `strokeWidth: 2` → `strokeWidth: stroke.hairline`
- `arc`: `o.strokeWidth ?? style.strokeWidth` → `o.strokeWidth ?? stroke.outline`

Widen each helper's `strokeWidth?: number` option to `strokeWidth?: StrokeRung`.

- [ ] **Step 4: Sweep the 19 component files**

Find them:

```bash
grep -ln "strokeWidth: [0-9]" src/components/*.ts
```

In each, `strokeWidth: 4` → `stroke.outline`, `strokeWidth: 2` → `stroke.hairline`, `strokeWidth: 1` → `stroke.shadow`. Import `stroke` from `../comic.js` (re-export it there alongside `color`, `font`, `size`, `style`).

Confirm none remain:

```bash
grep -rn "strokeWidth: [0-9]" src/
```

Expected: no output.

- [ ] **Step 5: Verify — acceptance criterion**

```bash
npm run build && npm run validate && npx vitest run && npx tsc --noEmit
git diff --stat dist/
```

Expected: all clean, `dist/` diff empty. A non-empty diff means a literal was mapped to the wrong rung.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "refactor: express stroke widths as ladder rungs"
```

---

### Task 5: Font roles

**Files:**
- Modify: `src/tokens.ts` (`font` becomes role names)
- Modify: `src/element.ts` (resolve font role → id)
- Modify: 42 `src/components/*.ts` files using `font.comic` or `font.hand`

**Interfaces:**
- Consumes: `Factory.theme`.
- Produces: `font = { body: "body", heading: "heading" }`; `TextOptions.fontFamily` accepts a `FontRole` name.

- [ ] **Step 1: Rename the roles**

In `src/tokens.ts`:

```ts
/**
 * Font roles. Names, not ids — `Factory` resolves them per theme. The body face is a
 * preset choice; headings, emphasis and button labels are always Comic Shanns.
 */
export const font = { body: "body", heading: "heading" } as const;
```

- [ ] **Step 2: Resolve font roles in `Factory`**

In `src/element.ts`, change `TextOptions.fontFamily?: number` to `fontFamily?: FontRole`, and in `text()`:

```ts
    el.fontFamily = this.theme.fonts[(o.fontFamily ?? "body") as FontRole];
```

- [ ] **Step 3: Sweep the components**

`font.hand` → `font.body`, `font.comic` → `font.heading`:

```bash
grep -rl "font\.\(hand\|comic\)" src/ | xargs sed -i '' -e 's/font\.hand/font.body/g' -e 's/font\.comic/font.heading/g'
grep -rn "font\.\(hand\|comic\)" src/
```

Expected: the second command prints nothing.

- [ ] **Step 4: Update tests that assert font ids**

Several tests assert `fontFamily === 7`. Those stay correct for the default theme, but should now read through the theme so their intent is clear:

```bash
grep -rn "fontFamily" tests/
```

Change literal `7` comparisons to `theme.fonts.heading` and literal `1` to `theme.fonts.body`.

- [ ] **Step 5: Verify — acceptance criterion**

```bash
npm run build && npm run validate && npx vitest run && npx tsc --noEmit
git diff --stat dist/
```

Expected: all clean, `dist/` diff empty.

- [ ] **Step 6: Commit**

```bash
git add src tests
git commit -m "refactor: express fonts as body and heading roles"
```

---

### Task 6: Per-font text advance

**Files:**
- Modify: `src/element.ts` (`estimateTextWidth` gains an `advance` parameter)
- Modify: the components that call `estimateTextWidth`
- Test: `tests/element.test.ts`

**Interfaces:**
- Consumes: `Factory.theme.advance`.
- Produces: `estimateTextWidth(text: string, fontSize: number, advance?: number): number`, defaulting `advance` to `0.55`.

- [ ] **Step 1: Write the failing test**

Append to `tests/element.test.ts`:

```ts
describe("estimateTextWidth advance", () => {
  it("defaults to 0.55 so existing callers are unaffected", () => {
    expect(estimateTextWidth("abcd", 20)).toBeCloseTo(4 * 20 * 0.55);
  });

  it("scales with an explicit advance", () => {
    expect(estimateTextWidth("abcd", 20, 0.5)).toBeCloseTo(4 * 20 * 0.5);
  });

  it("a narrower advance yields a narrower estimate", () => {
    expect(estimateTextWidth("hello", 20, 0.5))
      .toBeLessThan(estimateTextWidth("hello", 20, 0.55));
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/element.test.ts -t advance`
Expected: FAIL — the third argument is ignored.

- [ ] **Step 3: Add the parameter**

In `src/element.ts`:

```ts
/**
 * Rough advance-width estimate. Good enough to size a box around a label.
 * `advance` is chars-per-em for the face in use; see tokens.fontAdvance.
 */
export function estimateTextWidth(text: string, fontSize: number, advance = 0.55): number {
  return text.length * fontSize * advance;
}
```

Also have `Factory.text()` use the theme's advance when it computes the element's own width:

```ts
    const width = estimateTextWidth(o.text, fontSize, this.theme.advance);
```

- [ ] **Step 4: Pass the theme's advance at component call sites**

Find them:

```bash
grep -rn "estimateTextWidth" src/components/
```

Each becomes `estimateTextWidth(text, size, f.theme.advance)` — `f` is the local factory, which carries the theme.

- [ ] **Step 5: Verify — acceptance criterion**

```bash
npm run build && npm run validate && npx vitest run && npx tsc --noEmit
git diff --stat dist/
```

Expected: all clean, `dist/` diff empty — the default theme's advance is `0.55`, the previous hardcoded value.

- [ ] **Step 6: Commit**

```bash
git add src tests
git commit -m "feat: make text advance width a per-font theme value"
```

---

### Task 7: Validate against the active theme

**Files:**
- Modify: `src/validate.ts`
- Test: `tests/validate.test.ts`

**Interfaces:**
- Consumes: `Theme`, `paletteValues` from `src/theme.js`.
- Produces: `validateAll(theme: Theme, outDir?: string): string[]`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/validate.test.ts`, following that file's existing pattern of building a scene then perturbing one element:

```ts
describe("theme-aware validation", () => {
  it("rejects a colour from a different palette", () => {
    const out = buildFixture();
    perturb(out, "button", (el) => { el.strokeColor = "#1d161e"; }); // mauve-900
    const errors = validateAll(resolveTheme({ name: "z", palette: "zinc" }), out);
    expect(errors.join("\n")).toMatch(/is not in the palette/);
  });

  it("accepts that same colour under the palette it belongs to", () => {
    const theme = resolveTheme({ name: "m", palette: "mauve" });
    const out = buildFixture(theme);
    expect(validateAll(theme, out)).toEqual([]);
  });

  it("rejects a strokeWidth that is not a rung of the active ladder", () => {
    const out = buildFixture();
    perturb(out, "button", (el) => { el.strokeWidth = 3; });
    const errors = validateAll(resolveTheme({ name: "d" }), out);
    expect(errors.join("\n")).toMatch(/strokeWidth "3" is not a rung/);
  });

  it("rejects a fontFamily the theme does not use", () => {
    const out = buildFixture();
    perturb(out, "button", (el) => { if (el.type === "text") el.fontFamily = 8; });
    const errors = validateAll(resolveTheme({ name: "d" }), out);
    expect(errors.join("\n")).toMatch(/fontFamily "8" is not/);
  });

  it("rejects a roughness that is not the theme's", () => {
    const out = buildFixture();
    perturb(out, "button", (el) => { el.roughness = 1; });
    const errors = validateAll(resolveTheme({ name: "d" }), out);
    expect(errors.join("\n")).toMatch(/roughness "1" is not the theme's "2"/);
  });
});
```

Add these two helpers at module scope in `tests/validate.test.ts` (the file already builds fixtures this way; reuse its existing helpers if the names collide):

```ts
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { buildAll } from "../src/build.js";
import { DEFAULT_PRESET, resolveTheme, type Theme } from "../src/theme.js";

function buildFixture(theme: Theme = resolveTheme(DEFAULT_PRESET)): string {
  const dir = mkdtempSync(join(tmpdir(), "validate-"));
  buildAll(theme, dir);
  return dir;
}

/** Corrupt one element of one component, so a check can be shown to fire. */
function perturb(dir: string, name: string, fn: (el: Record<string, unknown>) => void): void {
  const path = join(dir, "components", `${name}.excalidraw`);
  const scene = JSON.parse(readFileSync(path, "utf8")) as { elements: Record<string, unknown>[] };
  for (const el of scene.elements) fn(el);
  writeFileSync(path, `${JSON.stringify(scene, null, 2)}\n`);
}
```

`perturb` applies `fn` to every element; the `fn`s above guard their own applicability (the font case checks `el.type === "text"`), so a single corrupted field is enough to make the check fire.

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run tests/validate.test.ts -t "theme-aware"`
Expected: FAIL — `validateAll` does not take a theme.

- [ ] **Step 3: Rewrite the checks against the theme**

In `src/validate.ts`, replace the `PALETTE_VALUES` import with `paletteValues` and thread a theme through `validateAll` into `checkElements`:

```ts
export function validateAll(theme: Theme, outDir: string = DEFAULT_OUT): string[] {
  const allowed = paletteValues(theme);
  const rungs = new Set(Object.values(theme.strokes));
  const fontIds = new Set(Object.values(theme.fonts));
  ...
```

Inside the per-element loop, the palette check now reads `allowed.has(value)`, and three checks join it:

```ts
    const width = Number(el.strokeWidth);
    if (!rungs.has(width)) {
      errors.push(`${where}/${id}: strokeWidth "${el.strokeWidth}" is not a rung of the active ladder (${[...rungs].join(", ")})`);
    }

    if (el.type === "text") {
      const family = Number(el.fontFamily);
      if (!fontIds.has(family)) {
        errors.push(`${where}/${id}: fontFamily "${el.fontFamily}" is not one of the theme's (${[...fontIds].join(", ")})`);
      }
    }

    if (Number(el.roughness) !== theme.roughness) {
      errors.push(`${where}/${id}: roughness "${el.roughness}" is not the theme's "${theme.roughness}"`);
    }
```

Update the self-run block at the bottom to resolve the default theme.

- [ ] **Step 4: Run tests and verify**

```bash
npx vitest run tests/validate.test.ts
npm run build && npm run validate && npx vitest run && npx tsc --noEmit
git diff --stat dist/
```

Expected: all clean, `dist/` diff empty.

- [ ] **Step 5: Commit**

```bash
git add src/validate.ts tests/validate.test.ts
git commit -m "feat: validate output against the theme it was built with"
```

---

### Task 8: Build a named preset

**Files:**
- Modify: `src/build.ts`
- Create: `presets/default.json`
- Modify: `.gitignore`
- Test: `tests/build.test.ts`

**Interfaces:**
- Consumes: `Theme`, `Preset`, `resolveTheme`, `DEFAULT_PRESET`.
- Produces:
  - `loadPreset(name: string): Preset` — reads `presets/<name>.json`, throws naming the path if missing
  - `listPresets(): string[]` — basenames in `presets/`, sorted
  - `outDirFor(theme: Theme): string` — `dist/` for `default`, `dist/<name>/` otherwise
  - `buildAll(theme: Theme, outDir?: string): void`

- [ ] **Step 1: Write `presets/default.json`**

```json
{
  "name": "default",
  "strokeWidth": "bold",
  "sloppiness": "cartoonist",
  "edges": "round",
  "font": "comic-shanns",
  "palette": "zinc"
}
```

- [ ] **Step 2: Write the failing tests**

Append to `tests/build.test.ts`:

```ts
describe("preset builds", () => {
  it("writes the default preset to dist root", () => {
    expect(outDirFor(resolveTheme(DEFAULT_PRESET))).toBe(DEFAULT_OUT);
  });

  it("writes a named preset to a subdirectory", () => {
    expect(outDirFor(resolveTheme({ name: "soft" }))).toBe(join(DEFAULT_OUT, "soft"));
  });

  it("loads a preset file from presets/", () => {
    expect(loadPreset("default")).toMatchObject({ name: "default", palette: "zinc" });
  });

  it("throws with the path when a preset is missing", () => {
    expect(() => loadPreset("nope")).toThrow(/presets\/nope\.json/);
  });

  it("lists committed presets", () => {
    expect(listPresets()).toContain("default");
  });

  it("builds every component under a non-default theme", () => {
    const tmp = mkdtempSync(join(tmpdir(), "preset-"));
    buildAll(resolveTheme({ name: "t", palette: "mist", edges: "sharp" }), tmp);
    expect(readdirSync(join(tmp, "components"))).toHaveLength(58);
    rmSync(tmp, { recursive: true, force: true });
  });
});
```

- [ ] **Step 3: Run and watch them fail**

Run: `npx vitest run tests/build.test.ts -t "preset builds"`
Expected: FAIL — `outDirFor`, `loadPreset`, `listPresets` are not exported.

- [ ] **Step 4: Implement**

In `src/build.ts`:

```ts
import { readFileSync, readdirSync } from "node:fs";
import { DEFAULT_PRESET, resolveTheme, type Preset, type Theme } from "./theme.js";

export const PRESETS_DIR = join(ROOT, "presets");

export function loadPreset(name: string): Preset {
  const path = join(PRESETS_DIR, `${name}.json`);
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Preset;
  } catch {
    throw new Error(`No preset at presets/${name}.json. Available: ${listPresets().join(", ")}`);
  }
}

export function listPresets(): string[] {
  return readdirSync(PRESETS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}

export function outDirFor(theme: Theme): string {
  return theme.name === DEFAULT_PRESET.name ? DEFAULT_OUT : join(DEFAULT_OUT, theme.name);
}

export function buildAll(theme: Theme, outDir: string = outDirFor(theme)): void {
  // ...unchanged body, but entry.build(theme)
}
```

Replace the self-run block with argument parsing:

```ts
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const all = args.includes("--all");
  const presetFlag = args.indexOf("--preset");
  const names = all
    ? listPresets()
    : [presetFlag === -1 ? DEFAULT_PRESET.name : args[presetFlag + 1]!];

  for (const name of names) {
    buildAll(resolveTheme(loadPreset(name)));
  }
}
```

- [ ] **Step 5: Ignore non-default output**

Append to `.gitignore`:

```gitignore
# Only the default preset's output is committed; other presets are build artifacts.
dist/*/
!dist/components/
```

- [ ] **Step 6: Verify**

```bash
npm run build && npm run validate && npx vitest run && npx tsc --noEmit
npm run build -- --preset default
git diff --stat dist/
npx tsx src/build.ts --all && git status --short dist/
```

Expected: `dist/` diff empty; `--all` builds only `default` for now and leaves the tree clean.

- [ ] **Step 7: Commit**

```bash
git add src/build.ts presets .gitignore tests/build.test.ts
git commit -m "feat: build a named preset into its own output directory"
```

---

### Task 9: The preset CLI

**Files:**
- Create: `src/preset.ts`
- Modify: `package.json` (add the `preset` script)
- Test: `tests/preset.test.ts`

**Interfaces:**
- Consumes: `Preset`, `resolveTheme`, `DEFAULT_PRESET`; `PRESETS_DIR`, `listPresets` from `src/build.js`.
- Produces:
  - `parseArgs(argv: string[]): Partial<Preset> & { force: boolean }`
  - `writePreset(preset: Preset, force: boolean, dir?: string): string` — returns the path written; `dir` defaults to `PRESETS_DIR` and exists so tests can write to a temp directory

- [ ] **Step 1: Write the failing tests**

Create `tests/preset.test.ts`:

```ts
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseArgs, writePreset } from "../src/preset.js";

describe("parseArgs", () => {
  it("reads every field from flags", () => {
    expect(parseArgs([
      "--name", "soft", "--stroke", "medium", "--sloppiness", "artist",
      "--edges", "sharp", "--font", "nunito", "--palette", "stone",
    ])).toEqual({
      name: "soft", strokeWidth: "medium", sloppiness: "artist",
      edges: "sharp", font: "nunito", palette: "stone", force: false,
    });
  });

  it("defaults force to false and omits unsupplied fields", () => {
    expect(parseArgs(["--name", "x"])).toEqual({ name: "x", force: false });
  });

  it("reads --force", () => {
    expect(parseArgs(["--name", "x", "--force"]).force).toBe(true);
  });

  it("throws on a flag with no value", () => {
    expect(() => parseArgs(["--name"])).toThrow(/--name/);
  });

  it("throws on an unknown flag", () => {
    expect(() => parseArgs(["--colour", "red"])).toThrow(/--colour/);
  });
});

describe("writePreset", () => {
  it("writes a preset and returns its path", () => {
    const dir = mkdtempSync(join(tmpdir(), "presets-"));
    const path = writePreset({ name: "soft", palette: "stone" }, false, dir);
    expect(existsSync(path)).toBe(true);
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({ name: "soft", palette: "stone" });
    rmSync(dir, { recursive: true, force: true });
  });

  it("refuses to overwrite without --force", () => {
    const dir = mkdtempSync(join(tmpdir(), "presets-"));
    writeFileSync(join(dir, "soft.json"), "{}");
    expect(() => writePreset({ name: "soft" }, false, dir)).toThrow(/--force/);
    rmSync(dir, { recursive: true, force: true });
  });

  it("overwrites with --force", () => {
    const dir = mkdtempSync(join(tmpdir(), "presets-"));
    writeFileSync(join(dir, "soft.json"), "{}");
    const path = writePreset({ name: "soft", palette: "mist" }, true, dir);
    expect(JSON.parse(readFileSync(path, "utf8")).palette).toBe("mist");
    rmSync(dir, { recursive: true, force: true });
  });

  it("rejects a preset that does not resolve", () => {
    const dir = mkdtempSync(join(tmpdir(), "presets-"));
    expect(() => writePreset({ name: "bad", palette: "burgundy" as never }, false, dir))
      .toThrow(/palette/);
    rmSync(dir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run tests/preset.test.ts`
Expected: FAIL — cannot resolve `../src/preset.js`.

- [ ] **Step 3: Implement `src/preset.ts`**

```ts
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { PRESETS_DIR } from "./build.js";
import { DEFAULT_PRESET, resolveTheme, type Preset } from "./theme.js";
import { fontFaces, palettes, sloppinessValues, strokeLadders } from "./tokens.js";

const FLAGS: Record<string, keyof Preset> = {
  "--name": "name",
  "--stroke": "strokeWidth",
  "--sloppiness": "sloppiness",
  "--edges": "edges",
  "--font": "font",
  "--palette": "palette",
};

export function parseArgs(argv: string[]): Partial<Preset> & { force: boolean } {
  const out: Partial<Preset> & { force: boolean } = { force: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]!;
    if (flag === "--force") { out.force = true; continue; }
    const field = FLAGS[flag];
    if (!field) throw new Error(`Unknown flag ${flag}. Known: ${Object.keys(FLAGS).join(", ")}, --force`);
    const value = argv[++i];
    if (value === undefined) throw new Error(`Flag ${flag} needs a value.`);
    (out as Record<string, string>)[field] = value;
  }
  return out;
}

/** Writes presets/<name>.json. Throws rather than clobbering unless `force`. */
export function writePreset(preset: Preset, force: boolean, dir: string = PRESETS_DIR): string {
  resolveTheme(preset); // fail loudly on an illegal field before writing anything
  const path = join(dir, `${preset.name}.json`);
  if (existsSync(path) && !force) {
    throw new Error(`presets/${preset.name}.json already exists. Pass --force to overwrite.`);
  }
  writeFileSync(path, `${JSON.stringify(preset, null, 2)}\n`);
  return path;
}

const CHOICES: Record<string, readonly string[]> = {
  strokeWidth: Object.keys(strokeLadders),
  sloppiness: Object.keys(sloppinessValues),
  edges: ["sharp", "round"],
  font: Object.keys(fontFaces),
  palette: Object.keys(palettes),
};

async function prompt(): Promise<Preset> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const name = (await rl.question("Preset name: ")).trim();
    const preset: Preset = { name };
    for (const [field, choices] of Object.entries(CHOICES)) {
      const fallback = DEFAULT_PRESET[field as keyof Preset];
      const answer = (await rl.question(
        `${field} [${choices.join(" | ")}] (${fallback}): `,
      )).trim();
      if (answer) (preset as Record<string, string>)[field] = answer;
    }
    return preset;
  } finally {
    rl.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));
  const { force, ...fields } = args;
  const preset = fields.name ? (fields as Preset) : await prompt();
  console.log(`Wrote ${writePreset(preset, force)}`);
}
```

- [ ] **Step 4: Add the npm script**

In `package.json`:

```json
    "preset": "tsx src/preset.ts",
```

- [ ] **Step 5: Exercise it end to end**

```bash
npm run preset -- --name blueprint --stroke thin --sloppiness architect --edges sharp --font nunito --palette mist
cat presets/blueprint.json
npm run build -- --preset blueprint
ls dist/blueprint/components | wc -l
git status --short   # dist/blueprint/ must NOT appear
```

Expected: 58 components written, and `dist/blueprint/` ignored by git.

- [ ] **Step 6: Verify and commit**

```bash
npm run build && npm run validate && npx vitest run && npx tsc --noEmit
git add src/preset.ts tests/preset.test.ts package.json presets/blueprint.json
git commit -m "feat: add the preset CLI"
```

---

### Task 10: Cross-preset invariants

The suite that makes presets trustworthy. Its central assertion is that style changes *how* a thing is drawn, never *what*.

**Files:**
- Create: `tests/presets.test.ts`

**Interfaces:**
- Consumes: `buildAll`, `outDirFor`; `resolveTheme`, `paletteValues`; `registry`; `validateAll`.
- Produces: nothing.

- [ ] **Step 1: Write the suite**

```ts
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildAll } from "../src/build.js";
import { registry } from "../src/registry.js";
import { DEFAULT_PRESET, paletteValues, resolveTheme, type Preset } from "../src/theme.js";
import { validateAll } from "../src/validate.js";

/** The default, one preset per axis at its furthest-from-default value, and one combining all five. */
const PRESETS: Preset[] = [
  { name: "default" },
  { name: "ax-stroke", strokeWidth: "thin" },
  { name: "ax-sloppiness", sloppiness: "architect" },
  { name: "ax-edges", edges: "sharp" },
  { name: "ax-font", font: "nunito" },
  { name: "ax-palette", palette: "mauve" },
  { name: "ax-all", strokeWidth: "thin", sloppiness: "architect", edges: "sharp", font: "nunito", palette: "mauve" },
];

type El = Record<string, unknown>;
const load = (dir: string, name: string): El[] =>
  JSON.parse(readFileSync(join(dir, "components", `${name}.excalidraw`), "utf8")).elements;

function build(preset: Preset): string {
  const dir = mkdtempSync(join(tmpdir(), `preset-${preset.name}-`));
  buildAll(resolveTheme(preset), dir);
  return dir;
}

const baseline = build({ name: "default" });
const counts = Object.fromEntries(
  Object.keys(registry).map((n) => [n, load(baseline, n).length]),
);

describe.each(PRESETS)("preset $name", (preset) => {
  const theme = resolveTheme(preset);
  let dir: string;

  beforeAll(() => { dir = build(preset); });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("writes every component", () => {
    expect(readdirSync(join(dir, "components"))).toHaveLength(Object.keys(registry).length);
  });

  it("draws the same elements as the default — style changes how, never what", () => {
    for (const name of Object.keys(registry)) {
      expect(load(dir, name).length, `${name} element count`).toBe(counts[name]);
    }
  });

  it("passes validation under its own theme", () => {
    expect(validateAll(theme, dir)).toEqual([]);
  });

  it("uses only the active palette", () => {
    const allowed = paletteValues(theme);
    for (const name of Object.keys(registry)) {
      for (const el of load(dir, name)) {
        expect(allowed.has(String(el.strokeColor)), `${name} strokeColor`).toBe(true);
        expect(allowed.has(String(el.backgroundColor)), `${name} backgroundColor`).toBe(true);
      }
    }
  });

  it("uses only this ladder's rungs, this theme's fonts, and this roughness", () => {
    const rungs = new Set(Object.values(theme.strokes));
    const fonts = new Set(Object.values(theme.fonts));
    for (const name of Object.keys(registry)) {
      for (const el of load(dir, name)) {
        expect(rungs.has(Number(el.strokeWidth)), `${name} strokeWidth`).toBe(true);
        expect(Number(el.roughness), `${name} roughness`).toBe(theme.roughness);
        if (el.type === "text") {
          expect(fonts.has(Number(el.fontFamily)), `${name} fontFamily`).toBe(true);
        }
      }
    }
  });

  it("keeps every element inside its component's bounding box", () => {
    for (const name of Object.keys(registry)) {
      const els = load(dir, name);
      const xs = els.flatMap((e) => [Number(e.x), Number(e.x) + Number(e.width)]);
      const ys = els.flatMap((e) => [Number(e.y), Number(e.y) + Number(e.height)]);
      const box = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
      // A text element whose estimate is badly wrong escapes this box relative to the
      // default's, which is the failure mode a wrong `advance` factor produces.
      const baseEls = load(baseline, name);
      const bxs = baseEls.flatMap((e) => [Number(e.x), Number(e.x) + Number(e.width)]);
      const grow = (box.x1 - box.x0) / (Math.max(...bxs) - Math.min(...bxs));
      expect(grow, `${name} width vs default`).toBeLessThan(1.35);
    }
  });

  it("is deterministic", () => {
    const second = build(preset);
    for (const name of Object.keys(registry)) {
      expect(readFileSync(join(second, "components", `${name}.excalidraw`), "utf8"))
        .toBe(readFileSync(join(dir, "components", `${name}.excalidraw`), "utf8"));
    }
    rmSync(second, { recursive: true, force: true });
  });
});

it("sharp edges leave no rounded rectangle anywhere", () => {
  const dir = build({ name: "sharp-check", edges: "sharp" });
  for (const name of Object.keys(registry)) {
    for (const el of load(dir, name)) {
      if (el.type === "rectangle") expect(el.roundness, `${name}`).toBeNull();
    }
  }
  rmSync(dir, { recursive: true, force: true });
});
```

Task 8's new tests also need imports `tests/build.test.ts` may not have yet — add whichever are missing: `readdirSync` from `node:fs`, `join` from `node:path`, and `outDirFor`, `loadPreset`, `listPresets`, `DEFAULT_OUT` from `../src/build.js`, plus `DEFAULT_PRESET`, `resolveTheme` from `../src/theme.js`.

- [ ] **Step 2: Run it**

Run: `npx vitest run tests/presets.test.ts`
Expected: PASS. If the width-growth assertion trips for a component under `ax-font`, the `nunito` advance factor in `tokens.fontAdvance` is wrong — tune it and say so in your report. That is the guard doing its job, not a test to relax.

- [ ] **Step 3: Full verification and commit**

```bash
npm run build && npm run validate && npx vitest run && npx tsc --noEmit
git add tests/presets.test.ts
git commit -m "test: pin cross-preset invariants"
```

---

### Task 11: Documentation and close-out

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-07-29-preset-cli-design.md` if any decision drifted during implementation

- [ ] **Step 1: Document the CLI in `README.md`**

Add a section after "Develop":

```markdown
## Styles

The library ships in one style by default, but the generator is preset-driven. A preset
picks five things:

| field | values |
|---|---|
| `strokeWidth` | `bold` (4/2/1) · `medium` (2/1/1) · `thin` (1/1/1) |
| `sloppiness` | `architect` (0) · `artist` (1) · `cartoonist` (2) |
| `edges` | `sharp` · `round` |
| `font` | `comic-shanns` · `excalifont` · `nunito` — body text only; headings stay Comic Shanns |
| `palette` | `neutral` · `stone` · `zinc` · `mauve` · `olive` · `mist` · `taupe` |

```bash
npm run preset                    # prompts, writes presets/<name>.json
npm run preset -- --name soft --palette stone --edges sharp
npm run build                     # default preset → dist/
npm run build -- --preset soft    # → dist/soft/
npm run build -- --all            # every preset in presets/
```

`presets/` is committed so a style is reproducible. Only the default preset's `dist/` is
committed; other presets are build artifacts you regenerate.

`edges: sharp` squares every corner. `edges: round` means "round where the component asks
for it" — 26 components are square for structural reasons (joined cells, inner bands) and
stay square in every preset, because Excalidraw's corner radius scales with shape size and
rounding them produces overhang and seam notches.
```

- [ ] **Step 2: Final verification**

```bash
npm run check
npx tsc --noEmit
npm run build -- --all
git status --short
```

Expected: 58 components, all tests passing, no type errors, and a clean tree — `dist/blueprint/` must be ignored.

- [ ] **Step 3: Commit**

```bash
git add README.md docs
git commit -m "docs: document style presets and the build CLI"
```

---

## Done when

- `npm run check` passes and `npx tsc --noEmit` is clean.
- `npm run build -- --all` builds every committed preset.
- `dist/` holds only the default preset's output, and it is byte-identical to the pre-refactor output apart from Task 1's three zinc values.
- `tests/presets.test.ts` passes for all seven test themes.
- A preset written by `npm run preset` builds without further editing.
