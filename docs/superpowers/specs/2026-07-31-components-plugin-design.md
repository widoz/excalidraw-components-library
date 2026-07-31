# Components Plugin — Design

Date: 2026-07-31

## Goal

Let a Claude session build Excalidraw mockups out of this library. The repo becomes a
Claude Code plugin with two skills: one composes scenes from components, one wraps the
preset and build CLIs. Composing needs a way to place a *single* widget, which the
current output does not offer — so the build also learns to emit one file per variant.

## Deliverables

- `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` — the repo installs
  as its own single-plugin marketplace.
- `skills/composing-scenes/SKILL.md` — pick components, write a layout, run the composer.
- `skills/building-presets/SKILL.md` — thin wrapper over `npm run preset|build|validate`.
- `scripts/compose.mjs` — CLI: layout file → `.excalidraw` scene; also `list`.
- `scripts/library.mjs` — resolve the library root, load and measure variant files.
- `scripts/ensure-library.mjs` — verify the root, install the toolchain when needed.
- `src/comic.ts` — a `sheet()` helper and the `ComponentOutput` type.
- The 58 components in `src/components/` — each declares its variants.
- `src/build.ts` — writes `dist/components/<name>/<variant>.excalidraw`.
- `src/validate.ts` — checks variant files and the union-equals-sheet invariant.

## Non-goals

- **No text overrides.** Composed scenes use stock labels; the user retypes in Excalidraw.
  Re-measuring text means reproducing the generator's font metrics, which belongs in `src/`
  and not in a composer that only reads JSON.
- **No freeform placement.** Layout is rows and columns. No overlap, no absolute
  coordinates, no z-order control.
- **No new components** and no restyling.
- **No clipboard payloads.** The output is a file the user opens.
- **No automatic `git clone`.** Choosing where to put a clone is the user's call.

## Plugin shape

The repo *is* the plugin; skills and scripts sit at the root beside `src/`.

```
excalidraw-components-library/
  .claude-plugin/plugin.json          # name, version, description, skills path
  .claude-plugin/marketplace.json     # one entry, source "."
  skills/composing-scenes/SKILL.md
  skills/building-presets/SKILL.md
  scripts/compose.mjs                 # CLI
  scripts/library.mjs                 # root resolution, loading, measuring
  scripts/ensure-library.mjs          # preflight
  src/ tests/ presets/ dist/          # unchanged in structure
```

Scripts are plain ESM Node with no dependencies and no build step. They read `dist/`
only — never the TypeScript — so composing works in a checkout that was never installed.

Install: `/plugin marketplace add /Volumes/Dev/mine/excalidraw-components-library`.

### Resolving the library root

`library.mjs` answers "where is the library" once, for both skills:

1. `~/.claude/excalidraw-lib.json` → `{ "path": "…" }`, if it exists and has `dist/`.
2. Otherwise the plugin's own root — `dist/` is committed, so composing works with no
   configuration in any project.
3. Otherwise fail, naming the fix: give a path and write the file. The message suggests a
   candidate found by checking cwd, `~`, and `~/Dev` for a directory containing
   `dist/comic-ui.excalidrawlib`.

The override in step 1 matters when a clone is newer than the installed plugin, and for
locally built presets — those land in the clone's `dist/<name>/` and never in the
installed copy.

### Preflight

Both skills call `ensureLibrary` first:

```js
export async function ensureLibrary({ needsToolchain }) {
  const root = resolveRoot();
  if (!existsSync(join(root, "dist"))) throw new Error(/* run npm run build */);
  if (needsToolchain && !existsSync(join(root, "node_modules")))
    await run("npm", ["install"], { cwd: root });
  return root;
}
```

`composing-scenes` passes `needsToolchain: false` and installs nothing — it only reads
JSON. `building-presets` passes `true`, because it shells out to `npm run …` → `tsx` →
TypeScript; the first invocation installs, later ones are an `existsSync` check.

Two guards on the install. The candidate's `package.json` `name` must equal the `name` in
the `package.json` beside the scripts — derived, not hardcoded, so a rename cannot break
it — and `src/build.ts` and `dist/comic-ui.excalidrawlib` must both exist. The installed
plugin copy is never used as a build target: preset output belongs in a clone the user can
commit, not in a cache directory that a plugin update wipes.

## Variants

### The problem

Each `dist/components/<name>.excalidraw` is a variant sheet, not one widget. `button` is
206×224 and holds three buttons stacked vertically; `input` is 330×158 and holds two
states. Nothing marks where one variant ends — the group id is shared and the elements are
a flat run. A login screen composed from sheets would show three buttons and two inputs.

### Declaring variants

Components return named parts instead of a flat array:

```ts
export default function button(theme: Theme): ComponentOutput {
  const f = new Factory("button", theme);
  return sheet([
    { name: "default",   elements: [...inkBox(f, {...}), ...label(f, {...})] },
    { name: "secondary", elements: [...] },
    { name: "disabled",  elements: [...] },
  ]);
}
```

`sheet()` lives in `comic.ts` and returns `{ elements, variants }`, where `elements` is the
concatenation in declaration order. The sheet file and the library item stay byte-identical
to today's output — the refactor is a reorganisation, not a restyle.

Variant names are slugs matching `[a-z0-9][a-z0-9-]*`, unique within a component. A
component with nothing to split declares a single variant named `default`. All 58
components are converted in this slice; there is no mixed mode.

### Output

`build.ts` writes, per component, the existing sheet plus a directory of variants:

```
dist/components/button.excalidraw          # sheet, unchanged
dist/components/button/default.excalidraw
dist/components/button/secondary.excalidraw
dist/components/button/disabled.excalidraw
```

Each variant file is a normal scene, normalised so its bounding box starts at `(0,0)`.
Normalisation is required, not cosmetic: `input` starts at `x=-4` because of a focus ring,
and a composer that ignores that misaligns every row. The variant directory is removed and
rewritten with its sheet, so a renamed variant leaves nothing stale.

Sizes come from the files themselves. There is no manifest to keep in sync.

`validate.ts` extends to variants: every file parses, is non-empty, sits at origin, uses
only the theme's colours, and the union of a component's variants equals its sheet. The
union check is what makes a dropped shape loud instead of subtle.

## Composing

### Layout schema

```json
{ "type": "column", "gap": 24, "align": "center", "children": [
    { "component": "label" },
    { "component": "input" },
    { "type": "row", "gap": 16, "children": [
        { "component": "button", "variant": "secondary" },
        { "component": "button" } ] } ] }
```

A **leaf** is `{ component, variant? }`. `variant` defaults to `default` — in a layout,
`{"component": "button"}` means the default variant, never the sheet. Sheets are for
browsing and the library panel; scenes are built from single widgets.

A **container** is `{ type: "row" | "column", gap?, align?, children }`. `gap` defaults to
24, `align` (cross-axis: `start` | `center` | `end`) to `start`. Containers nest freely and
the root may be either kind. Unknown keys are an error — `"componnet"` must fail loudly
rather than compose an empty scene.

### CLI

```bash
node scripts/compose.mjs layout.json -o mockups/login.excalidraw [--preset soft]
node scripts/compose.mjs list [--preset soft]
```

`list` prints every component, its variants, and their sizes, read from `dist/`. With
`--preset <name>` both commands read `dist/<name>/components/` instead of
`dist/components/`.

### Algorithm

1. **Parse and validate** the layout: known keys, known node kinds, non-empty `children`.
2. **Measure** bottom-up. A leaf's size is its file's bounding box. A column is as wide as
   its widest child and as tall as its children's heights plus gaps; a row is the
   transpose.
3. **Place** top-down, giving each leaf an absolute origin, offset on the cross axis by
   `align`.
4. **Instantiate**: deep-copy each leaf's elements, translate by its origin, and rewrite
   `id` and every `groupIds` entry through a per-instance map, so two buttons stay two
   separate groups rather than merging into one. No element references another —
   `boundElements` and `containerId` are `null` throughout `dist/` — so no fixups follow.
5. **Emit** with a fresh globally ascending `index` in `a{counter base36 padded 5}V` form,
   matching `Factory.nextIndex`, and `appState` copied from the first loaded file so a
   `--preset soft` scene keeps that preset's canvas colour.

`seed` and `versionNonce` are copied unchanged, so the same layout always produces a
byte-identical scene. That determinism is what makes the composer testable.

### Errors

Every message names the fix: an unknown component lists the closest matches, an unknown
variant lists that component's variants, and a missing `dist/<preset>/` says to run
`npm run build -- --preset <name>` first.

## Skills

**`composing-scenes`** triggers on requests to mock up a screen with these components.
Workflow: run `compose.mjs list` for real names, variants and sizes; write
`<name>.layout.json` beside the target; run the composer; tell the user to open the file
via Excalidraw's **Menu → Open**. It states the two limits plainly — stock labels only, and
rows and columns only. Output defaults to `mockups/<name>.excalidraw` in the user's cwd,
with the layout file kept beside it so a revision is a one-line edit and a re-run.

**`building-presets`** is a thin wrapper. It documents the five preset fields and their
values, the naming rules (`[a-z0-9][a-z0-9-]*`, filename must equal the `name` field,
`components` and `comic-ui` reserved), and the commands `npm run preset`,
`npm run build -- --preset <n>`, `npm run validate -- --preset <n>`, and `--all`. It calls
`ensureLibrary({ needsToolchain: true })` first and reports what the CLIs print rather than
paraphrasing. It offers no style guidance.

## Testing

Library side, in the existing vitest suite:

- `sheet()` concatenates in declaration order and rejects duplicate or malformed names.
- Variant files are written, normalised to origin, and removed on rename.
- For all 58 components, the union of variants equals the sheet.

Plugin side, same runner and same `npm test`:

- Measurement matches real `dist/` files, including `input`'s negative origin.
- Row and column placement with each `align` value.
- Two instances of one component yield two distinct groups and no duplicate ids.
- `index` values ascend across the whole scene.
- Re-running a layout produces byte-identical output.
- Each named error case: unknown component, unknown variant, unbuilt preset, unknown key.

Fixtures are small layouts checked against expected coordinates, not golden scenes.

## Risks

- **The 58-component refactor is the bulk of the work.** It is mechanical, and the
  union-equals-sheet check catches mistakes, but it touches every component file.
- **Variant granularity is a judgement call.** Some components (calendar, table) have no
  meaningful split and become a single `default` variant; the sheet-versus-widget line will
  need a second look on components with nested structure.
- **`dist/` grows** by roughly 150–200 small files, and each variant's shapes exist twice
  on disk. Accepted: the repo already commits `dist/`, and the alternative is a manifest
  that must stay in sync.
