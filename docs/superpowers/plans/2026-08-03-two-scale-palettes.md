# Two-Scale Palettes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a preset name a base palette for the chrome and a separate accent palette for four colour roles, and ship all 22 Tailwind scales so the accent can actually be a colour.

**Architecture:** Palette data moves out of `src/tokens.ts` into a new `src/palettes.ts` that owns colour scales and their presentation grouping. `Preset` gains an optional `accent` field that defaults to `palette`, so every existing preset resolves exactly as it does today. `resolveTheme` reads `subtle`, `mutedText`, `accent` and `accentText` from the accent scale and the remaining four roles from the base scale. Components are untouched — they name roles, and only `theme.ts` resolves roles to hex.

**Tech Stack:** TypeScript (`src/`, run with `tsx`), vitest, Node 20 core modules only. Zero runtime dependencies.

## Global Constraints

- **Zero runtime dependencies.** Node core modules only. Do not add a package to `dependencies`. A temporary devDependency is allowed only if a task explicitly says so; no task in this plan does.
- **No component changes.** `src/comic.ts`, `src/element.ts`, `src/scene.ts` and every file in `src/components/` are out of scope. Components reference role names; only `theme.ts` resolves them to hex.
- **`dist/default/` and `dist/blueprint/` must not change.** After any task, `git status --short dist` must show nothing except (in Task 5) the new `dist/wp-admin/`. This is the hard check that the refactor is behaviour-preserving.
- **Colour values are fetched from source, never recalled.** If the fetch fails, stop and report BLOCKED. Writing plausible-looking hex from memory produces colours that are subtly wrong and that no test here can catch — the structural tests check shape and format, not accuracy.
- **The four accent roles are exactly**: `accent` (700), `accentText` (50), `subtle` (400), `mutedText` (500). The four base roles are exactly: `ink` (900), `surface` (50), `muted` (200), `border` (300).
- **Comment style.** This codebase writes comments that explain *why*, naming the bug the code prevents. When you add one, say what breaks without it.
- **Test commands.** `npx vitest run tests/<file>` for one file, `npx vitest run -t "<name>"` for one test, `npx tsc --noEmit` to typecheck. Run from `/Volumes/Dev/mine/excalidraw-components-library`.
- Commit messages end with:
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  ```

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/palettes.ts` | **New.** Colour scale data and the grouping used to present it. Nothing else. | Created in Task 1, filled in Task 2 |
| `src/tokens.ts` | Sizes, fonts, stroke ladders, sloppiness, semantic role names | Loses `zinc` and `palettes` |
| `src/theme.ts` | Preset → Theme resolution and validation | Gains the `accent` field and the two-scale role mapping |
| `src/preset.ts` | The preset-authoring CLI | Gains `--accent` and grouped palette rendering |
| `tests/palettes.test.ts` | **New.** Scale shape, value format, group partition, pinned values | Created in Task 1, extended in Task 2 |
| `tests/tokens.test.ts` | Non-palette token assertions | Loses the zinc assertions |
| `tests/theme.test.ts` | Theme resolution | Gains two-scale cases |
| `tests/preset.test.ts` | CLI flags and the interactive prompt | Gains `--accent`; piped-stdin fixtures gain a line |
| `tests/presets.test.ts` | Per-preset end-to-end suite | Gains a two-scale preset |
| `presets/wp-admin.json` | The motivating preset | Becomes neutral base + blue accent |
| `README.md`, `skills/building-presets/SKILL.md` | Docs | Document `accent`; stop enumerating palette names |

Task order is forced by dependency: the file must exist (1) before the data lands (2), the data must exist before a test can name `blue` (3), the field must exist before the CLI can set it (4), and everything must exist before the docs describe it (5).

---

### Task 1: Extract palette data into its own module

A pure move. No value changes, no behaviour changes, no `dist/` changes.

**Files:**
- Create: `src/palettes.ts`
- Modify: `src/tokens.ts` (remove `zinc` and `palettes`), `src/theme.ts` (import site), `src/preset.ts` (import site)
- Create: `tests/palettes.test.ts`
- Modify: `tests/tokens.test.ts` (drop the zinc assertions and the `zinc` import)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `src/palettes.ts` exports `zinc` and `palettes` with exactly the values they have in `src/tokens.ts` today.
  - `src/tokens.ts` no longer exports either. Importers use `./palettes.js`.

- [ ] **Step 1: Create `src/palettes.ts` with the data moved verbatim**

Cut the `zinc` constant (currently `src/tokens.ts` lines 1-14) and the `palettes` constant (the `export const palettes = { zinc, neutral: {...}, ... } as const;` block) out of `src/tokens.ts` and paste them into a new `src/palettes.ts`, with this file header replacing the two comments that came with them:

```ts
/**
 * Colour scale data, and the grouping used to present it.
 *
 * Two provenances, deliberately labelled separately — the comment this replaces
 * claimed all seven scales came from shadcn, which was true of three of them.
 */

/** shadcn/ui "zinc" base colour scale. */
export const zinc = {
  // ...the eleven steps, unchanged
} as const;
```

and above the `palettes` object:

```ts
/**
 * Colour scales, keyed by name.
 *
 * `zinc`, `neutral` and `stone` are shadcn/ui base colour scales. Source:
 * shadcn-ui/ui → packages/shadcn/src/colors.ts, which defines them in OKLCH; the
 * values here are the sRGB conversion.
 *
 * `mauve`, `olive`, `mist` and `taupe` are custom to this repository — they are not
 * shadcn or Tailwind scales. `blueprint` uses `mist`.
 */
export const palettes = {
  // ...unchanged
} as const;
```

Do not change a single hex value. Every scale keeps exactly the steps it has now.

- [ ] **Step 2: Repoint the three importers**

In `src/theme.ts`, the first line currently imports several things from `./tokens.js` including `palettes`. Split it:

```ts
import { CANVAS, fontAdvance, fontFaces, sloppinessValues, strokeLadders, TRANSPARENT } from "./tokens.js";
import { palettes } from "./palettes.js";
```

In `src/preset.ts`, the import currently reads `import { fontFaces, palettes, sloppinessValues, strokeLadders } from "./tokens.js";`. Split it the same way:

```ts
import { fontFaces, sloppinessValues, strokeLadders } from "./tokens.js";
import { palettes } from "./palettes.js";
```

In `tests/tokens.test.ts`, the import on line 2 reads `import { color, font, size, style, zinc } from "../src/tokens.js";`. Drop `zinc`:

```ts
import { color, font, size, style } from "../src/tokens.js";
```

- [ ] **Step 3: Move the zinc assertions into a new test file**

Delete these two tests from `tests/tokens.test.ts` — the ones titled `"exposes the shadcn zinc scale"` and `"uses shadcn's current (Tailwind v4) zinc values"` — and create `tests/palettes.test.ts` carrying them plus structural checks that apply to every scale:

```ts
import { describe, expect, it } from "vitest";
import { palettes, zinc } from "../src/palettes.js";

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const HEX = /^#[0-9a-f]{6}$/;

describe("palettes", () => {
  it("exposes the shadcn zinc scale", () => {
    expect(zinc[50]).toBe("#fafafa");
    expect(zinc[200]).toBe("#e4e4e7");
    expect(zinc[700]).toBe("#3f3f46");
    expect(zinc[900]).toBe("#18181b");
    expect(Object.keys(zinc)).toHaveLength(11);
  });

  it("uses shadcn's current (Tailwind v4) zinc values", () => {
    expect(zinc[400]).toBe("#9f9fa9");
    expect(zinc[500]).toBe("#71717b");
    expect(zinc[600]).toBe("#52525c");
  });

  // A scale missing a step resolves a role to `undefined`, which reaches Excalidraw as
  // the string "undefined" and renders as black — no existing check catches that.
  it.each(Object.keys(palettes))("scale %s has exactly the eleven steps", (name) => {
    const scale = palettes[name as keyof typeof palettes] as Record<number, string>;
    expect(Object.keys(scale).map(Number).sort((a, b) => a - b)).toEqual(STEPS);
  });

  it.each(Object.keys(palettes))("every value in scale %s is a six-digit lowercase hex", (name) => {
    const scale = palettes[name as keyof typeof palettes] as Record<number, string>;
    for (const step of STEPS) {
      expect(scale[step], `${name}.${step}`).toMatch(HEX);
    }
  });
});
```

- [ ] **Step 4: Run the tests and the typechecker**

Run: `npx vitest run tests/palettes.test.ts tests/tokens.test.ts tests/theme.test.ts`
Expected: PASS. The new structural tests pass against the seven existing scales.

Run: `npx tsc --noEmit`
Expected: PASS. No unused imports.

- [ ] **Step 5: Prove nothing moved but the code**

```bash
npm run build
git status --short dist
```

Expected: `git status --short dist` prints nothing. A pure code move cannot change rendered output; if `dist/` is dirty here, a value was altered in the move — stop and report BLOCKED with the diff.

- [ ] **Step 6: Run the full suite and commit**

Run: `npx vitest run`
Expected: PASS, whole suite.

```bash
git add src/palettes.ts src/tokens.ts src/theme.ts src/preset.ts tests/palettes.test.ts tests/tokens.test.ts
git commit -m "$(cat <<'EOF'
refactor: move colour scales into src/palettes.ts

tokens.ts also holds sizes, fonts, stroke ladders and role names; the palette
table is about to grow from 7 scales to 26, which would leave colour data as
most of the file. The move also splits the provenance comment, which claimed
all seven scales came from shadcn when four are custom to this repo.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Add the 22 Tailwind scales and the presentation grouping

**Files:**
- Modify: `src/palettes.ts` (19 new scales, `paletteGroups`)
- Modify: `tests/palettes.test.ts` (partition test, spot checks)

**Interfaces:**
- Consumes: `src/palettes.ts` and its `palettes` export from Task 1.
- Produces:
  - `palettes` contains exactly 26 keys: `slate`, `gray`, `zinc`, `neutral`, `stone`, `red`, `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose`, `mauve`, `olive`, `mist`, `taupe`.
  - `paletteGroups: Record<string, readonly string[]>` — the grouping below, exported from `src/palettes.ts`.
  - `PaletteName` in `src/theme.ts` is `keyof typeof palettes`, so it widens to all 26 automatically. No edit needed there.

- [ ] **Step 1: Fetch the colour values from source**

You need 19 new scales: `slate`, `gray`, and the 17 colours (`red`, `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose`). `zinc`, `neutral` and `stone` are already present.

Fetch them. The provenance comment names `shadcn-ui/ui → packages/shadcn/src/colors.ts` as the source; the Tailwind v4 palette is the same data and any faithful copy of it will do. Prefer a source that publishes hex directly over one that publishes OKLCH, to avoid a conversion step you would then have to verify.

**You have a built-in correctness check — use it.** Three Tailwind v4 scales are already in this file and are pinned by tests: `zinc`, `neutral` and `stone`. Whatever source you fetch, compare its values for those three against the ones already in `src/palettes.ts`:

- **All three match exactly** → the source and any conversion are correct. Take the other 19 from it.
- **Any of them differs** → stop. Report BLOCKED with the differing values. Either the source is a different Tailwind version or the conversion is wrong, and in both cases the other 19 scales would be wrong in a way no test here can detect. Do not "fix" the mismatch by editing `zinc`, `neutral` or `stone` — those three are pinned to the committed output and changing them would change `dist/`.

If you cannot fetch at all, report BLOCKED. Do not write the values from memory.

- [ ] **Step 2: Write the failing partition test**

Add to `tests/palettes.test.ts`, importing `paletteGroups` alongside the existing imports:

```ts
describe("paletteGroups", () => {
  // The groups are what the prompt prints. If a new scale is added to `palettes` and
  // not to a group, it silently becomes unofferable: legal to type, never listed.
  it("names every palette exactly once", () => {
    const grouped = Object.values(paletteGroups).flat();
    expect([...grouped].sort()).toEqual(Object.keys(palettes).sort());
    expect(new Set(grouped).size).toBe(grouped.length);
  });
});

describe("the palette set", () => {
  it("carries all 22 Tailwind scales plus the 4 custom ones", () => {
    expect(Object.keys(palettes)).toHaveLength(26);
    for (const name of ["slate", "gray", "blue", "red", "green", "rose"]) {
      expect(Object.keys(palettes), name).toContain(name);
    }
    for (const name of ["mauve", "olive", "mist", "taupe"]) {
      expect(Object.keys(palettes), name).toContain(name);
    }
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run tests/palettes.test.ts`
Expected: FAIL — `paletteGroups` is not exported, and `palettes` has 7 keys not 26.

- [ ] **Step 4: Add the scales and the grouping**

Add the 19 fetched scales to the `palettes` object in `src/palettes.ts`. Order the keys as the groups below order them — neutrals first, then colours, then custom — so the source file reads in the same order the prompt prints.

Then add, below `palettes`:

```ts
/**
 * How the CLI prints the palette names. 26 names on one line is unreadable, and the
 * grouping is data about the palettes rather than about the prompt, so it lives here
 * with them. `tests/palettes.test.ts` asserts the two stay in step.
 */
export const paletteGroups = {
  neutral: ["slate", "gray", "zinc", "neutral", "stone"],
  warm:    ["red", "orange", "amber", "yellow"],
  green:   ["lime", "green", "emerald", "teal"],
  cool:    ["cyan", "sky", "blue", "indigo"],
  purple:  ["violet", "purple", "fuchsia", "pink", "rose"],
  custom:  ["mauve", "olive", "mist", "taupe"],
} as const;
```

- [ ] **Step 5: Add spot checks for the fetched values**

Pin a few of the new scales the way `zinc` is pinned, so a later careless edit is caught. Use the values you actually fetched — read them from `src/palettes.ts` as you write the test rather than recalling them:

```ts
it("pins a sample of the fetched Tailwind scales", () => {
  // Spot checks against the fetched source. These exist so a hand-edit to the table
  // is caught; they are not a substitute for the fetch being right in the first place.
  expect(palettes.blue[700]).toBe(/* the fetched blue-700 */);
  expect(palettes.red[500]).toBe(/* the fetched red-500 */);
  expect(palettes.slate[900]).toBe(/* the fetched slate-900 */);
});
```

Replace each comment with the literal hex string from the table you just wrote.

- [ ] **Step 6: Run the tests and the typechecker**

Run: `npx vitest run tests/palettes.test.ts`
Expected: PASS, including the structural checks from Task 1 now running over all 26 scales.

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Confirm the existing output is untouched**

```bash
npm run build
git status --short dist
```

Expected: nothing. No preset references a new scale yet, so adding them cannot change rendered output. If `dist/` is dirty, one of `zinc`, `neutral` or `stone` was altered — stop and report BLOCKED.

- [ ] **Step 8: Run the full suite and commit**

Run: `npx vitest run`
Expected: PASS.

Note: `tests/theme.test.ts` has a test asserting an illegal palette throws `/palette.*burgundy.*neutral/s`. It still passes — `neutral` remains in the legal list the error prints. Do not edit it.

```bash
git add src/palettes.ts tests/palettes.test.ts
git commit -m "$(cat <<'EOF'
feat: ship all 22 Tailwind colour scales

Seven neutral scales meant a preset could not have a coloured accent at all.
Adds shadcn's missing base neutrals (gray, slate) and the 17 colours, fetched
from source and cross-checked against the three scales already pinned here.
paletteGroups keeps 26 names printable.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: The `accent` field

**Files:**
- Modify: `src/theme.ts` (the `Preset` interface, `DEFAULT_PRESET`, `resolveTheme`)
- Modify: `tests/theme.test.ts`
- Modify: `tests/presets.test.ts` (add a two-scale preset to the suite)

**Interfaces:**
- Consumes: `palettes` and the 26 scales from Task 2.
- Produces:
  - `Preset` gains `accent?: PaletteName`.
  - `DEFAULT_PRESET` gains `accent: "zinc"`.
  - `resolveTheme(preset)` reads `subtle`, `mutedText`, `accent`, `accentText` from `palettes[preset.accent ?? preset.palette ?? "zinc"]` and `ink`, `surface`, `muted`, `border` from `palettes[preset.palette ?? "zinc"]`.

- [ ] **Step 1: Write the failing tests**

Add to the `resolveTheme` describe block in `tests/theme.test.ts`:

```ts
  // The whole backward-compatibility story rests on this: every committed preset omits
  // `accent`, so if the fallback ever stops meaning "same as base", dist/ changes.
  it("resolves a preset with no accent exactly as it did before the field existed", () => {
    const t = resolveTheme({ name: "m", palette: "mauve" });
    expect(t.palette).toEqual({
      ink: "#1d161e",
      surface: "#fafafa",
      muted: "#e7e4e7",
      border: "#d7d0d7",
      subtle: "#a89ea9",
      mutedText: "#79697b",
      accent: "#463947",
      accentText: "#fafafa",
      transparent: "transparent",
      canvas: "#ffffff",
    });
  });

  it("takes four roles from the accent scale and four from the base", () => {
    const t = resolveTheme({ name: "wp", palette: "neutral", accent: "blue" });

    // From the base scale.
    expect(t.palette.ink).toBe(palettes.neutral[900]);
    expect(t.palette.surface).toBe(palettes.neutral[50]);
    expect(t.palette.muted).toBe(palettes.neutral[200]);
    expect(t.palette.border).toBe(palettes.neutral[300]);

    // From the accent scale.
    expect(t.palette.subtle).toBe(palettes.blue[400]);
    expect(t.palette.mutedText).toBe(palettes.blue[500]);
    expect(t.palette.accent).toBe(palettes.blue[700]);
    expect(t.palette.accentText).toBe(palettes.blue[50]);
  });

  it("rejects an illegal accent, naming the field and the legal set", () => {
    expect(() => resolveTheme({ name: "x", palette: "neutral", accent: "burgundy" as never }))
      .toThrow(/accent.*burgundy.*neutral/s);
  });
```

Add `import { palettes } from "../src/palettes.js";` to that file's imports.

Add to the `PRESETS` array in `tests/presets.test.ts`, after the `ax-palette` entry:

```ts
  { name: "ax-accent", palette: "neutral", accent: "blue" },
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/theme.test.ts -t "accent"`
Expected: FAIL — TypeScript rejects the unknown `accent` property, or the assertions fail because `subtle` still comes from the base scale.

- [ ] **Step 3: Add the field**

In `src/theme.ts`, add to the `Preset` interface after `palette`:

```ts
  accent?: PaletteName;
```

and to `DEFAULT_PRESET`, after `palette: "zinc"`:

```ts
  accent: "zinc",
```

`DEFAULT_PRESET` is typed `Required<Preset>`, so it must carry the field. `"zinc"` is what the fallback would produce anyway, since `DEFAULT_PRESET.palette` is `"zinc"`.

Do **not** add an `accent` field to `presets/default.json`. It would be redundant with the fallback and would show up as a diff in a file whose output must not change.

- [ ] **Step 4: Resolve the two scales**

In `resolveTheme`, alongside the existing `paletteName` line, add the accent's own `pick()` call so an illegal value throws with the same shape of message as every other field:

```ts
  const paletteName = pick("palette", preset.palette ?? DEFAULT_PRESET.palette,
    Object.keys(palettes) as PaletteName[]);
  // Defaulting to the base palette rather than to DEFAULT_PRESET.accent is what makes
  // every preset written before this field existed resolve unchanged.
  const accentName = pick("accent", preset.accent ?? paletteName,
    Object.keys(palettes) as PaletteName[]);
```

Replace `const p = palettes[paletteName];` with:

```ts
  const base = palettes[paletteName];
  const accent = palettes[accentName];
```

and the returned `palette` object with:

```ts
    palette: {
      ink: base[900],
      surface: base[50],
      muted: base[200],
      border: base[300],
      subtle: accent[400],
      mutedText: accent[500],
      accent: accent[700],
      accentText: accent[50],
      transparent: TRANSPARENT,
      canvas: CANVAS,
    },
```

- [ ] **Step 5: Run the tests and the typechecker**

Run: `npx vitest run tests/theme.test.ts tests/presets.test.ts`
Expected: PASS. `tests/presets.test.ts` now runs its whole per-preset suite — every component written, same element counts as the default, validation under its own theme, palette membership, determinism, width growth — against the two-scale `ax-accent` preset.

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Confirm the committed output is untouched**

```bash
npm run build
git status --short dist
```

Expected: nothing. `presets/default.json` and `presets/blueprint.json` omit `accent`, so their themes are unchanged. If `dist/` is dirty, the fallback is wrong — stop and report BLOCKED with the diff.

- [ ] **Step 7: Run the full suite and commit**

Run: `npx vitest run`
Expected: PASS.

```bash
git add src/theme.ts tests/theme.test.ts tests/presets.test.ts
git commit -m "$(cat <<'EOF'
feat: let a preset name a separate accent palette

One palette drove every role, so choosing a colour tinted every stroke and
there was no way to say "neutral chrome, coloured buttons". accent defaults to
the base palette, so every preset written before this field resolves unchanged.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `--accent` and the grouped prompt

**Files:**
- Modify: `src/preset.ts` (`FLAGS`, `CHOICES`, the prompt's per-field rendering)
- Modify: `tests/preset.test.ts`

**Interfaces:**
- Consumes: `Preset.accent` from Task 3; `paletteGroups` from Task 2.
- Produces: `npm run preset -- --accent <name>` writes the field; the interactive prompt asks for `accent` after `palette`, and a blank answer leaves the field unset.

- [ ] **Step 1: Write the failing tests**

In `tests/preset.test.ts`, extend the first `parseArgs` test to cover the new flag:

```ts
  it("reads every field from flags", () => {
    expect(parseArgs([
      "--name", "soft", "--stroke", "medium", "--sloppiness", "artist",
      "--edges", "sharp", "--font", "nunito", "--palette", "stone",
      "--accent", "blue",
    ])).toEqual({
      name: "soft", strokeWidth: "medium", sloppiness: "artist",
      edges: "sharp", font: "nunito", palette: "stone", accent: "blue", force: false,
    });
  });
```

**The three piped-stdin tests each need one more line.** The prompt asks one question per entry in `CHOICES`, and `accent` makes six instead of five. A fixture that stops short now hits EOF and aborts. Update all three:

```ts
  it("writes every prompted field from piped answers and exits 0", () => {
    const stdout = execFileSync("npx", ["tsx", "src/preset.ts"], {
      cwd: REPO_ROOT,
      input: `${name}\nthin\narchitect\nsharp\nnunito\nmist\nblue\n`,
      encoding: "utf8",
    });
    expect(stdout).toContain("Wrote");
    expect(existsSync(path)).toBe(true);
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({
      name,
      strokeWidth: "thin",
      sloppiness: "architect",
      edges: "sharp",
      font: "nunito",
      palette: "mist",
      accent: "blue",
    });
  });
```

The `"prints the readable validation error"` test needs a seventh line too, or it aborts at the accent prompt before reaching validation:

```ts
      input: `${name}\nthin\narchitect\nsharp\nnunito\nburgundy\n\n`,
```

(the trailing `\n\n` is a blank answer for `accent`). Its expectation is unchanged — it still throws on the palette.

The `"fails loudly on stdin that ends mid-questionnaire"` test pipes only the name and is unchanged; it still aborts.

Add one new test, next to the others in that describe block:

```ts
  it("leaves accent unset when the answer is blank, so it falls back to the base palette", () => {
    execFileSync("npx", ["tsx", "src/preset.ts"], {
      cwd: REPO_ROOT,
      input: `${name}\nthin\narchitect\nsharp\nnunito\nmist\n\n`,
      encoding: "utf8",
    });
    const written = JSON.parse(readFileSync(path, "utf8"));
    expect(written.palette).toBe("mist");
    expect("accent" in written).toBe(false);
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/preset.test.ts`
Expected: FAIL — `parseArgs` throws `Unknown flag --accent`, and the piped tests abort or write a preset without the field.

- [ ] **Step 3: Register the flag and the prompt field**

In `src/preset.ts`, add to `FLAGS`:

```ts
  "--accent": "accent",
```

and to `CHOICES`, immediately after `palette`:

```ts
  accent: Object.keys(palettes),
```

`PROMPT_FIELDS` is `Object.entries(CHOICES)`, so the prompt asks for `accent` last, after `palette`. That order is what the "blank = same as base" wording depends on.

- [ ] **Step 4: Render palette choices grouped**

Still in `src/preset.ts`, add above `prompt()`:

```ts
/**
 * 26 palette names on one bracketed line is unreadable, so the two palette fields print
 * their choices grouped over several lines. Every other field keeps the one-line form.
 */
function renderChoices(field: string, choices: readonly string[]): string {
  if (field !== "palette" && field !== "accent") {
    return `[${choices.join(" | ")}]`;
  }
  const rows = Object.entries(paletteGroups)
    .map(([group, names]) => `  ${group.padEnd(8)} ${names.join(" ")}`)
    .join("\n");
  return `\n${rows}\n`;
}
```

Import `paletteGroups` alongside `palettes`:

```ts
import { palettes, paletteGroups } from "./palettes.js";
```

Then change the one line inside `askField` that builds the question. It currently reads:

```ts
        rl.question(`${field} [${choices.join(" | ")}] (${fallback}): `, (raw) => {
```

Replace it with:

```ts
        const shown = field === "accent" ? "blank = same as base" : String(fallback);
        rl.question(`${field} ${renderChoices(field, choices)}(${shown}): `, (raw) => {
```

Nothing else in `prompt()` changes. In particular, leave the synchronous `question()` chaining and the long comment above it exactly as they are — that structure is load-bearing for piped stdin, which is how these tests drive the CLI.

- [ ] **Step 5: Run the tests and the typechecker**

Run: `npx vitest run tests/preset.test.ts`
Expected: PASS, all of them including the three updated fixtures.

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Look at the prompt yourself**

```bash
printf 'throwaway-check\n\n\n\n\n\n\n' | npx tsx src/preset.ts
rm -f presets/throwaway-check.json
```

Read the output. The palette and accent questions should print their groups over six indented lines each and remain readable; every other question should still be a single bracketed line. If the layout is mangled, fix it before committing. Confirm the preset file is gone afterwards.

- [ ] **Step 7: Run the full suite and commit**

Run: `npx vitest run`
Expected: PASS.

```bash
git add src/preset.ts tests/preset.test.ts
git commit -m "$(cat <<'EOF'
feat: choose an accent palette from the preset CLI

Adds --accent, and asks for it after the base palette. Both palette questions
print their 26 choices grouped over several lines; one bracketed line was
unreadable. A blank accent answer leaves the field unset, which resolves to
the base palette.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: wp-admin, and documentation

**Files:**
- Modify: `presets/wp-admin.json` (currently untracked — this task commits it)
- Modify: `README.md`, `skills/building-presets/SKILL.md`
- Commit: `dist/wp-admin/` (generated)

**Interfaces:**
- Consumes: everything from Tasks 1-4.

- [ ] **Step 1: Point wp-admin at a blue accent**

`presets/wp-admin.json` exists in the working tree but is untracked. Replace its contents with:

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

- [ ] **Step 2: Build it and look at the result**

```bash
npm run build
ls dist
```

Expected: `blueprint`, `default`, `wp-admin`.

Then confirm the two scales actually landed, by reading the colours off a built component. Use shell rather than `node -e` — this package is `"type": "module"` and `-e` snippets are evaluated under a different module system than the repo's own code:

```bash
grep -o '"\(strokeColor\|backgroundColor\)": "[^"]*"' dist/wp-admin/components/button.excalidraw | sort -u
```

Expected: a mix — neutral grays for the outlines, and at least one blue among the fills. Compare the blue you see against `palettes.blue[700]` and `palettes.blue[50]` in `src/palettes.ts`. If every colour is gray, the accent is not reaching the components: stop and report BLOCKED.

- [ ] **Step 3: Confirm the other presets are untouched**

```bash
git status --short dist
```

Expected: only `dist/wp-admin/` appears (as untracked). `dist/default/` and `dist/blueprint/` must not show as modified.

- [ ] **Step 4: Update the README**

In the preset table in the "Styles" section, replace the `palette` row and add an `accent` row:

```markdown
| `palette` | any of 26 scales — Tailwind's 22 (`slate` `gray` `zinc` `neutral` `stone` `red` `orange` `amber` `yellow` `lime` `green` `emerald` `teal` `cyan` `sky` `blue` `indigo` `violet` `purple` `fuchsia` `pink` `rose`) plus `mauve` `olive` `mist` `taupe`. Default `zinc` |
| `accent` | any palette — drives `accent`, `accentText`, `subtle` and `mutedText`. Defaults to `palette`, so omitting it keeps the single-scale look |
```

Then add this paragraph directly below that table:

```markdown
A preset names up to two scales. The base `palette` colours the chrome — every stroke,
panel, muted fill and border. The `accent` scale colours buttons, badges, focus rings
and secondary text. Leaving `accent` out points both at the same scale, which is how
every preset behaved before the field existed. `presets/wp-admin.json` is the two-scale
example: neutral chrome, blue accents.
```

The same `--palette` / `--accent` flags work on `npm run preset`; the existing command block needs no change.

- [ ] **Step 5: Update the skill**

In `skills/building-presets/SKILL.md`, replace the `palette` row of the Fields table and add an `accent` row:

```markdown
| `palette` | any of 26 scales, grouped: neutral · warm · green · cool · purple · custom |
| `accent` | any of the same 26 — colours buttons, badges, focus rings and secondary text. Defaults to `palette` |
```

Then add this section immediately after the Fields table:

```markdown
## Choosing palettes

Ask the user for both, rather than assuming. Offer the groups:

- **neutral** — slate, gray, zinc, neutral, stone
- **warm** — red, orange, amber, yellow
- **green** — lime, green, emerald, teal
- **cool** — cyan, sky, blue, indigo
- **purple** — violet, purple, fuchsia, pink, rose
- **custom** — mauve, olive, mist, taupe

A neutral base with a coloured accent is the usual choice: gray chrome, coloured
buttons. A coloured base tints every stroke and panel, which is a much stronger look.

Do not maintain a copy of the legal values here beyond this list — the CLI is the
authority, and it names every legal value when a field is wrong.
```

Update the example command in the Commands block to show the flag:

```bash
npm run preset -- --name soft --palette stone --accent blue --edges sharp
```

- [ ] **Step 6: Verify and commit**

Run: `npm run check`
Expected: build, validate, typecheck and test all pass.

```bash
git status --short
```

Expected: the two documentation files modified, plus `presets/wp-admin.json` and `dist/wp-admin/` untracked.

```bash
git add presets/wp-admin.json dist/wp-admin README.md skills/building-presets/SKILL.md
git commit -m "$(cat <<'EOF'
feat: add the wp-admin preset and document two-scale palettes

wp-admin is the case the two-scale split exists for: neutral chrome with blue
accents, which single-scale presets could not express. The skill stops carrying
a copy of the palette names and asks the user instead.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Verification

After Task 5, from the repository root:

```bash
npm run check                      # build + validate + typecheck + test
ls dist                            # blueprint  default  wp-admin
git status --short                 # clean
grep -c '"' src/palettes.ts        # the 26-scale table is present
```
