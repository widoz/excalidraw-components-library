# Style Presets and Build CLI — Design

Date: 2026-07-29

## Goal

Let the library be generated in more than one visual style. A preset names five choices —
stroke weight, sloppiness, edge treatment, body font, palette — and the build resolves them
into every emitted element. Presets are files, so a style is reproducible and reviewable.

## Deliverables

- `src/theme.ts` — the preset schema, the lookup tables, and resolution into a `Theme`.
- `src/preset.ts` — a CLI that writes `presets/<name>.json`, interactively or from flags.
- `presets/` — committed preset files, including `default.json` (today's look).
- `src/build.ts` — extended to accept `--preset <name>` and `--all`.
- The existing 58 components, unchanged.

## Non-goals

- No chromatic accent themes. Every palette is a single-hue neutral ramp; the components
  that signal with weight rather than colour depend on that.
- No per-component overrides. A preset applies to the whole library or not at all.
- No runtime theme switching. This is a build-time concern only.
- No new components.

## The central change: tokens become symbolic

Today `color.accent` **is** the string `"#3f3f46"`, and 58 component files embed that hex at
call time. Threading a theme through them would mean editing every file.

Instead the roles become names, and `Factory` — already the only module that writes element
JSON — resolves them at emission:

```ts
// tokens.ts (after)
export const color = {
  ink: "ink", surface: "surface", muted: "muted", border: "border",
  subtle: "subtle", mutedText: "mutedText", accent: "accent",
  accentText: "accentText", transparent: "transparent", canvas: "canvas",
} as const;

export const font = { body: "body", heading: "heading" } as const;

export const stroke = { outline: "outline", hairline: "hairline", shadow: "shadow" } as const;
```

```ts
// element.ts — Factory resolves against its Theme
strokeColor: theme.palette[role],   // "accent" → "#3f3f46" (zinc) | "#463947" (mauve)
fontFamily:  theme.fonts[role],     // "body" → 1 | 6 | 7
strokeWidth: theme.strokes[rung],   // "hairline" → 2 | 1
roughness:   theme.roughness,       // 0 | 1 | 2
roundness:   theme.edges === "sharp" ? null : (o.rounded ?? true ? { type: 3 } : null),
```

Component files keep speaking in roles, so **no component's layout, geometry or logic changes**.
Three mechanical edits do reach into them, and none alters what is drawn:

- every builder takes the theme and hands it to its factory — `default (theme: Theme)` and
  `new Factory("name", theme)` (58 files, two lines each). This is unavoidable: the per-font
  advance factor below changes text-derived geometry, so the theme has to be known while a
  component is being built, not applied afterwards.

- `font.hand` → `font.body` and `font.comic` → `font.heading` (42 files). The old names describe
  a face; the new ones describe a role, which is what they have to mean once the face is a
  preset choice.
- literal `strokeWidth: 2` and `strokeWidth: 1` → `stroke.hairline` and `stroke.shadow`
  (19 files, ~40 call sites).

Both are find-and-replace with review, not redesign.

### What this costs

`color.accent` no longer reads as a colour when you hover it. That is the trade. The
compensation is that `element.ts` becomes the single place where a role turns into a value,
which is where the palette check already wants to live.

## The Theme

```ts
export interface Theme {
  name: string;
  palette: Record<ColorRole, string>;   // role → hex
  fonts: Record<FontRole, number>;      // role → Excalidraw font id
  strokes: Record<StrokeRung, number>;  // rung → px
  roughness: 0 | 1 | 2;
  edges: "sharp" | "round";
  /** Chars-per-em advance approximation for the body face. */
  advance: number;
}
```

`resolveTheme(preset: Preset): Theme` is pure and total: every preset field has a default, so
a partial preset file resolves to a complete theme.

## Preset schema

```jsonc
// presets/blueprint.json
{
  "name": "blueprint",
  "strokeWidth": "thin",       // bold | medium | thin
  "sloppiness": "architect",   // architect | artist | cartoonist
  "edges": "sharp",            // sharp | round
  "font": "nunito",            // comic-shanns | excalifont | nunito
  "palette": "mist"            // neutral | stone | zinc | mauve | olive | mist | taupe
}
```

`presets/default.json` is today's look: `bold` / `cartoonist` / `round` / `excalifont` /
`zinc`. Any field may be omitted and falls back to the default's value.

An unknown value for any field is a hard error naming the field and listing the legal values.
Presets are hand-edited; a typo must not silently resolve to a default.

### Stroke ladders

The library uses three weights at once. A preset scales all three, clamped at 1, using only
Excalidraw's native widths.

| | outline | hairline | shadow |
|---|---|---|---|
| `bold` (default) | 4 | 2 | 1 |
| `medium` | 2 | 1 | 1 |
| `thin` | 1 | 1 | 1 |

At `thin` a table's outer border and its row rules become the same weight and the component
flattens. That is accepted, not a defect to fix.

### Sloppiness

`architect` → `roughness: 0`, `artist` → `1`, `cartoonist` → `2` (default). These are
Excalidraw's own names and values.

### Edges

A **one-way override**:

- `sharp` — every `roundness` is forced to `null`. Global and always safe.
- `round` (default) — each component's own `rounded` choice stands.

26 of the 58 components pass `rounded: false` for structural reasons: joined cells in `tabs`,
`button-group`, `toggle-group`, `input-group`, `input-otp`, `kbd`; inner bands in `table` and
`scroll-area`; comic panels in `dialog`, `alert-dialog`, `sheet`, `drawer`. Excalidraw's
corner radius scales with shape size, so rounding those produces overhang at the corners and
notches at the seams — the defect class that shipped twice in the first batch and cost two fix
rounds. `round` therefore means "allow rounding where the component asks for it", not "round
everything". This is a deliberate limitation; the setting is not symmetric.

### Fonts

The `font` field sets the **body** face. Headings, emphasis and button labels stay Comic
Shanns in every preset.

| value | body id | heading id |
|---|---|---|
| `excalifont` (default) | 1 | 7 |
| `comic-shanns` | 7 | 7 |
| `nunito` | 6 | 7 |

The default is `excalifont`, because that is what the library already emits: today's `dist/` carries
150 text elements at `fontFamily: 1` (Excalifont body) and 95 at `7` (Comic Shanns headings). An
earlier draft of this spec named `comic-shanns` as the default, which would have silently restyled
every body label the moment fonts were wired up.

At `comic-shanns` there is no body/heading contrast, since both roles resolve to 7. That is a
legitimate preset, not a bug.

Font id 1 is Excalidraw's legacy Virgil slot, which resolves to Excalifont and is what the
library already emits. It is kept rather than switching to 5 so the default preset's output is
byte-identical to what ships today.

### Text advance

`estimateTextWidth` hardcodes `0.55` chars-per-em, tuned for Comic Shanns. Narrower faces make
every width derived from it too generous — `badge` pill widths, `marker`'s highlight swashes,
`breadcrumb` and `hover-card` spacing. The factor therefore moves into the theme:

| font | advance |
|---|---|
| `comic-shanns` | 0.55 |
| `excalifont` | 0.50 |
| `nunito` | 0.50 |

These are approximations, not measured metrics, and the spec does not pretend otherwise. They
are safe because the guard is behavioural rather than numeric: the containment suite runs per
preset and fails if any text element escapes its component's box. If a preset trips it, the
factor for that face is wrong and gets tuned. `estimateTextWidth` gains an `advance` parameter
defaulting to `0.55`, so existing callers and the default preset are unaffected.

## Palettes

Seven shadcn base colours, vendored as hex. Source: `shadcn-ui/ui`,
`packages/shadcn/src/colors.ts`, which defines them in OKLCH; the values below are the sRGB
conversion. Record that provenance in a comment in `tokens.ts` so the next person can
re-verify without redoing the conversion.

| | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| zinc | `#fafafa` | `#f4f4f5` | `#e4e4e7` | `#d4d4d8` | `#9f9fa9` | `#71717b` | `#52525c` | `#3f3f46` | `#27272a` | `#18181b` | `#09090b` |
| neutral | `#fafafa` | `#f5f5f5` | `#e5e5e5` | `#d4d4d4` | `#a1a1a1` | `#737373` | `#525252` | `#404040` | `#262626` | `#171717` | `#0a0a0a` |
| stone | `#fafaf9` | `#f5f5f4` | `#e7e5e4` | `#d6d3d1` | `#a6a09b` | `#79716b` | `#57534d` | `#44403b` | `#292524` | `#1c1917` | `#0c0a09` |
| mauve | `#fafafa` | `#f3f1f3` | `#e7e4e7` | `#d7d0d7` | `#a89ea9` | `#79697b` | `#594c5b` | `#463947` | `#2a212c` | `#1d161e` | `#0c090c` |
| olive | `#fbfbf9` | `#f4f4f0` | `#e8e8e3` | `#d8d8d0` | `#abab9c` | `#7c7c67` | `#5b5b4b` | `#474739` | `#2b2b22` | `#1d1d16` | `#0c0c09` |
| mist | `#f9fbfb` | `#f1f3f3` | `#e3e7e8` | `#d0d6d8` | `#9ca8ab` | `#67787c` | `#4b585b` | `#394447` | `#22292b` | `#161b1d` | `#090b0c` |
| taupe | `#fbfaf9` | `#f3f1f1` | `#e8e4e3` | `#d8d2d0` | `#aba09c` | `#7c6d67` | `#5b4f4b` | `#473c39` | `#2b2422` | `#1d1816` | `#0c0a09` |

Role mapping is identical across all seven:

`ink`→900, `surface`→50, `muted`→200, `border`→300, `subtle`→400, `mutedText`→500,
`accent`→700, `accentText`→50. `transparent` is always the literal `"transparent"`;
`canvas` is always `#ffffff` regardless of palette.

### Zinc moves to Tailwind v4

The committed `tokens.ts` holds Tailwind v3 zinc. shadcn has since moved to v4, shifting
zinc-400/500/600 by 1–2/255 (`#a1a1aa`→`#9f9fa9`, `#71717a`→`#71717b`, `#52525b`→`#52525c`).
This design adopts v4, so the library tracks shadcn rather than quietly diverging.

The change is imperceptible but rewrites all 58 committed `dist/` files. That diff should land
as its own commit, so it reads as the no-op it is and does not hide behind a feature change.

## Validation

`validate.ts` currently checks every colour against a `PALETTE_VALUES` set built from zinc.
That set must become **per-theme**, derived from the active palette.

A union of all seven palettes would be quietly weaker than it looks: `zinc-50`, `neutral-50`
and `mauve-50` are all `#fafafa`, so overlapping values would let a wrong-palette hex pass
unnoticed. `validateAll` therefore takes the `Theme` the output was built with.

It gains three checks, all cheap and all catching the failure modes a preset introduces:

1. Every `strokeWidth` is one of the active ladder's three rungs.
2. Every `fontFamily` is one of the active theme's two ids.
3. Every `roughness` equals the active theme's.

## CLI

```bash
npm run preset                    # prompts for each field, writes presets/<name>.json
npm run preset -- --name soft --stroke bold --sloppiness cartoonist \
                  --edges round --font excalifont --palette stone
npm run build                     # default preset → dist/
npm run build -- --preset soft    # → dist/soft/
npm run build -- --all            # every file in presets/
```

`src/preset.ts` uses `node:readline/promises` for prompts — no dependency. Each prompt lists
its legal values and defaults to the current default preset's value on empty input. Writing
over an existing preset requires `--force`.

Flags and prompts are the same schema: if every field is supplied as a flag, no prompt appears.
`--name` is required in non-interactive mode.

## Output layout

```
dist/                        default preset (committed, as today)
  components/*.excalidraw
  comic-ui.excalidrawlib
dist/<preset>/               non-default presets (gitignored)
  components/*.excalidraw
  comic-ui.excalidrawlib
```

Existing import paths keep working. `.gitignore` gains `dist/*/` with a `!dist/components/`
negation, so only the default preset's output is tracked.

`buildAll` gains a `theme` parameter. Its signature becomes
`buildAll(theme: Theme, outDir?: string)`, with `outDir` defaulting to `dist/` for the default
theme and `dist/<name>/` otherwise.

## Determinism

Seeds derive from the component name only, not the preset. Two presets therefore produce the
same wobble with different styling, which makes cross-preset diffs readable — a changed element
is a real change, not reseeded noise. Builds stay byte-identical run to run.

## Testing

**Default preset** keeps the entire existing suite unchanged: 272 tests, including per-component
geometry, element counts, containment, band-before-label ordering, and the registry key set. The
default preset's output must remain byte-identical to what ships today, apart from the zinc v4
hex shift. That is the strongest possible regression guard on this refactor and it is worth
stating as an acceptance criterion: **`git diff` on `dist/` after the refactor shows only the
three changed zinc values, nothing else.**

**Every preset** gets a cheaper invariant suite, parameterised over seven test themes: the
default, one isolating each axis's furthest-from-default value (`strokeWidth: thin`;
`sloppiness: architect`; `edges: sharp`; `font: nunito`; `palette: mauve` — five themes, each
differing from the default in exactly one field), and one setting all five at once. Isolating
each axis means a failure names its own cause; the combined one catches interactions.

Each of the seven must satisfy:

1. **Element counts per component are identical to the default.** Style changes how a thing is
   drawn, never what is drawn. This single assertion catches most ways a theme could go wrong.
2. `validateAll` passes against that theme.
3. No element escapes its component's bounding box — the containment guard, which is also what
   catches a wrong `advance` factor.
4. Every colour is in the active palette; every `strokeWidth` is one of its three rungs; every
   `fontFamily` is one of its two ids; every `roughness` matches.
5. Two builds of the same preset are byte-identical.

**Theme resolution** is unit-tested directly: defaults fill in, every legal value resolves,
every illegal value throws naming the field.

## Risks

**The symbolic-token change touches the two most load-bearing files.** `element.ts` writes
every element and `comic.ts` defines the house style. The mitigation is the byte-identical
acceptance criterion above: if the default preset's output changes at all beyond the zinc
shift, the refactor is wrong.

**19 component files hardcode `strokeWidth: 2` or `1`.** These become `stroke.hairline` and
`stroke.shadow`. Roughly 40 call sites, mechanical, but a missed one silently pins that stroke
across every preset. The validator's rung check (validation item 1) catches exactly this.

**`edges: "sharp"` changes geometry, not just appearance.** Squaring a rounded box moves its
painted corners outward slightly. The containment suite covers it.
