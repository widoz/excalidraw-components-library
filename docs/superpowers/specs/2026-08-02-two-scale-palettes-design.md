# Two-Scale Palettes

Date: 2026-08-02

## Problem

A preset names one palette, and that palette drives every colour role: `ink` (every
stroke), `surface`, `muted`, `border`, `subtle`, `mutedText`, `accent`, `accentText`.
Choosing a colour therefore tints the whole interface. There is no way to say "neutral
chrome, coloured buttons", which is what most real design systems look like.

The `wp-admin` preset is the case that exposed this. It asks for `palette: "neutral"`
and renders entirely gray, because the only alternative — a colour palette — would have
turned every outline blue as well.

The palette set is also incomplete and mislabelled. Seven scales ship: `zinc`, `neutral`
and `stone` are genuine shadcn base colours; `mauve`, `olive`, `mist` and `taupe` are
custom. The comment above them in `src/tokens.ts` attributes all seven to
`shadcn-ui/ui → packages/shadcn/src/colors.ts`, which is wrong for the last four. None
of the seven is a colour, and shadcn's other two base neutrals — `gray` and `slate` —
are missing.

## Decisions

1. **A preset names two scales**: a base palette for the chrome and an accent palette
   for the accent roles.
2. **Three roles come from the accent scale**: `accent`, `accentText` and `subtle`. The
   other five — `ink`, `surface`, `muted`, `border`, `mutedText` — stay on the base.
   `mutedText` was originally planned for the accent scale alongside the other three,
   but a contrast review measured it below WCAG AA (4.5:1) against `surface` for several
   accent choices (e.g. wp-admin's blue accent: 3.60) — it is the only one of the four
   candidates rendered as plain secondary body text (placeholders, card descriptions,
   breadcrumbs, pagination, help text) rather than on a controlled background. The repo
   owner ruled it moves to the base scale; `subtle`, `accent` and `accentText` stay on
   the accent scale.
3. **All 22 Tailwind v4 scales ship**, plus the 4 existing custom scales: 26 in total.
4. **Colour values are fetched from source, never recalled.**
5. **The prompt groups the palette names**; the skill stops hardcoding them.

## Design

### Palette data moves to its own file

26 scales of 11 steps is roughly 290 lines of data. `src/tokens.ts` also holds sizes,
fonts, stroke ladders, sloppiness values and the semantic role names; adding the full
palette table there would leave colour data as most of the file.

A new `src/palettes.ts` owns colour scale data and the grouping used to present it.
`src/tokens.ts` keeps everything else and no longer exports `palettes` or `zinc`.

Three modules import the palette data today — `src/theme.ts`, `src/preset.ts` and
`tests/tokens.test.ts` — so the move is a three-line change at the call sites.

The new file separates the two provenances explicitly, replacing the current inaccurate
comment:

- **Tailwind v4 / shadcn scales** (22): `slate`, `gray`, `zinc`, `neutral`, `stone`,
  `red`, `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`,
  `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose`. Sourced from
  `shadcn-ui/ui → packages/shadcn/src/colors.ts`, which defines them in OKLCH, converted
  to sRGB — the method the existing comment already documents.
- **Custom scales** (4): `mauve`, `olive`, `mist`, `taupe`. Not from Tailwind or shadcn.
  Kept because `blueprint` uses `mist` and repointing it would change committed output.

### The `accent` field

```ts
export interface Preset {
  name: string;
  strokeWidth?: StrokeName;
  sloppiness?: SloppinessName;
  edges?: EdgesName;
  font?: FontName;
  palette?: PaletteName;
  accent?: PaletteName;
}
```

`accent` defaults to whatever `palette` resolves to. That single fallback is what makes
the change backward compatible: a preset without an `accent` field resolves to a theme
identical to today's, so `presets/default.json` and `presets/blueprint.json` need no
edit and their committed output stays byte-identical.

`DEFAULT_PRESET` is typed `Required<Preset>`, so it gains `accent: "zinc"` — the same
value its `palette` already has, which is what the fallback would produce anyway.
`presets/default.json` is deliberately left alone: adding a redundant field there would
be noise.

In `resolveTheme`:

```ts
const base = palettes[paletteName];
const acc = palettes[accentName];   // === base when `accent` is omitted

return {
  name: preset.name,
  palette: {
    ink:        base[900],
    surface:    base[50],
    muted:      base[200],
    border:     base[300],
    // On the base scale, not the accent: the only one of the four accent-eligible
    // roles used as plain secondary text on `surface`. On a light or high-chroma
    // accent it drops below 4.5:1 (WCAG AA) contrast.
    mutedText:  base[500],
    subtle:     acc[400],
    accent:     acc[700],
    accentText: acc[50],
    transparent: TRANSPARENT,
    canvas: CANVAS,
  },
  // fonts, strokes, roughness, edges, advance unchanged
};
```

`accent` is validated by the same `pick()` helper as every other field, so an illegal
value throws naming all 26 legal ones.

`paletteValues(theme)` still returns the set of the theme's ten resolved role values, so
`validate.ts`'s palette-membership check needs no change — it validates against the
resolved theme, not against a scale.

### Grouped presentation

`src/palettes.ts` exports the grouping alongside the data:

```ts
export const paletteGroups = {
  neutral: ["slate", "gray", "zinc", "neutral", "stone"],
  warm:    ["red", "orange", "amber", "yellow"],
  green:   ["lime", "green", "emerald", "teal"],
  cool:    ["cyan", "sky", "blue", "indigo"],
  purple:  ["violet", "purple", "fuchsia", "pink", "rose"],
  custom:  ["mauve", "olive", "mist", "taupe"],
} as const;
```

The grouping is presentation data about the palettes, so it lives with them rather than
in the CLI. A test asserts the two stay in step: every palette appears in exactly one
group, and every name in a group is a real palette. Without that check the grouping
silently omits the next scale someone adds.

### The preset CLI

`src/preset.ts` gains `--accent` in its `FLAGS` map and `accent` in its `CHOICES` map,
which is all the flag path needs.

The interactive prompt currently renders every field the same way:

```
${field} [${choices.join(" | ")}] (${fallback}):
```

With 26 names that line is unreadable. Palette fields render grouped instead:

```
base palette
  neutral  slate gray zinc neutral stone
  warm     red orange amber yellow
  green    lime green emerald teal
  cool     cyan sky blue indigo
  purple   violet purple fuchsia pink rose
  custom   mauve olive mist taupe
(zinc):
```

`accent` renders the same list under the heading `accent palette`, and its default line
reads `(blank = same as base)` rather than naming a value, because its default is
whatever `palette` was answered with rather than a fixed constant.

Every other field keeps the existing one-line rendering. The synchronous
`question()` chaining in `prompt()` — and the comment explaining why it must stay
synchronous — is untouched; only the string each field displays changes.

### The skill

`skills/building-presets/SKILL.md` hardcodes the seven palette names in its Fields
table, which is how it goes stale. The palette row instead says that base and accent are
chosen from the grouped set, and the skill instructs the agent to ask the user for both
rather than assuming. The CLI stays the authority: `resolveTheme` throws listing every
legal value, and the skill already tells the agent to report CLI errors verbatim rather
than paraphrasing them.

`README.md`'s preset table gains an `accent` row and its palette row stops enumerating
seven names.

### wp-admin

`presets/wp-admin.json` becomes:

```json
{
  "name": "wp-admin",
  "strokeWidth": "thin",
  "sloppiness": "architect",
  "edges": "round",
  "font": "nunito",
  "palette": "neutral",
  "accent": "blue"
}
```

It builds to `dist/wp-admin/`, which is committed like every other preset's output.

## Testing

- **New `tests/palettes.test.ts`**
  - every scale has exactly the keys `50, 100, 200, …, 900, 950` (11 of them)
  - every value matches `/^#[0-9a-f]{6}$/`
  - `paletteGroups` partitions `palettes`: the union of the groups equals the set of
    palette names, and no name appears twice
  - the pinned `zinc` values from `tests/tokens.test.ts` still hold after the move
- **`tests/theme.test.ts`**
  - a preset with no `accent` resolves to exactly the theme it resolves to today — the
    guard behind the byte-identity claim
  - a preset with `accent` takes `subtle`, `accent` and `accentText` from the accent
    scale and `ink`, `surface`, `muted`, `border`, `mutedText` from the base
  - an illegal `accent` throws, and the message names legal values
- **`tests/presets.test.ts`** — add a two-scale preset (e.g.
  `{ name: "ax-accent", palette: "neutral", accent: "blue" }`) to the existing `PRESETS`
  array, so the whole per-preset suite runs against it: writes every component, same
  element counts as the default, passes validation under its own theme, uses only the
  active palette, and is deterministic.
- **`tests/preset.test.ts`** — `--accent` is parsed into the preset; a blank answer at
  the accent prompt leaves the field unset.
- **`tests/tokens.test.ts`** — updated for the moved imports; the zinc assertions
  relocate to `tests/palettes.test.ts`.
- **Byte-identity** — after a full rebuild, `git status --short dist` shows only the new
  `dist/wp-admin/`. `dist/default/` and `dist/blueprint/` must be untouched.

## Sourcing the colour values

The 22 Tailwind scales are fetched from `shadcn-ui/ui →
packages/shadcn/src/colors.ts` at implementation time and converted from OKLCH to sRGB.

If the fetch fails, the task stops and reports rather than proceeding. Writing 242
plausible-looking hex values from memory would produce colours that are subtly wrong and
that no test in this repo could catch — the structural tests check shape and format, not
accuracy. A stopped task is recoverable; a table of invented colours is not.

## Out of scope

No component changes. `src/style.ts`, `src/element.ts`, `src/scene.ts` and every file in
`src/components/` are untouched — components reference role names, and only `theme.ts`
resolves those to hex, which is exactly why this change reaches every component without
editing any of them.

Contrast is not validated in general. Nothing checks that `accentText` is legible on
`accent`, and this design does not add such a check; a preset pairing two dark scales
will produce a low-contrast button and the build will accept it.

The one contrast case that *was* checked is `mutedText`, and only because it is body
text rather than a role confined to a controlled background — see Decision 2. That
review reasoned solely about `accentText` on `accent` and, at the time, missed that
`mutedText` faces the same exposure: it renders on the light `surface` regardless of
which accent is chosen, so a light or high-chroma accent could put it below 4.5:1. Once
found, `mutedText` moved to the base scale, which clears 4.5:1 for every accent choice.
`subtle`, `accent` and `accentText` remain unvalidated for the reason above — they sit on
controlled backgrounds the author picks alongside the colour, not on the light surface
every preset shares.
