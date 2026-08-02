# Preset Output Consistency

Date: 2026-08-02

## Problem

The default preset is not built like the other presets. It writes to `dist/` itself
(`dist/components/`, `dist/comic-ui.excalidrawlib`) while every named preset writes to
`dist/<name>/`. That one exception is load-bearing in six places:

- `src/build.ts` — `outDirFor` branches on `theme.name === DEFAULT_PRESET.name`.
- `src/build.ts` — `buildAll` cannot `rmSync` its own output directory, because for the
  default preset that directory is `dist/`, which holds every other preset's output. The
  removal is narrowed to the two paths the function writes.
- `src/theme.ts` — `RESERVED_NAMES = ["components", "comic-ui"]` exists only to stop a
  preset from naming its way onto the default preset's flat paths.
- `scripts/library.mjs` — `componentsDir()` and `buildCommand()` each branch on
  `preset === "default"`; `MARKER` points at the flat `dist/comic-ui.excalidrawlib`.
- `.gitignore` — `dist/*/` plus `!dist/components/` to commit the default output only.
- `README.md`, `skills/building-presets/SKILL.md` and the tests all document or assert
  the exception.

Every one of these disappears when the default preset writes to `dist/default/`.

## Decisions

1. **Clean break.** The old flat paths stop existing. No compatibility copy or symlink.
2. **Every preset's output is committed.** `dist/` is fully tracked.
3. **A bare `npm run build` builds every preset.** No preset is privileged.
4. **A full build prunes orphaned output.** `dist/<name>/` with no `presets/<name>.json`
   is removed.

## Design

### Path rule

`outDirFor` loses its branch:

```ts
export function outDirFor(theme: Theme): string {
  return assertInsideDist(join(DEFAULT_OUT, theme.name));
}
```

`assertInsideDist` is unchanged and still guards the derived path.

### Selection

`selectPresets` returns every preset when no `--preset` is given:

```ts
export function selectPresets(args: string[]): string[] {
  const i = args.indexOf("--preset");
  if (i === -1) return listPresets();
  const name = args[i + 1];
  if (name === undefined || name.startsWith("--")) {
    throw new Error("--preset requires a preset name.");
  }
  return [name];
}
```

`--all` is still accepted, as an alias for the bare form, so existing commands and
documented invocations keep working. It is no longer the only way to build everything.

`validate.ts` shares `selectPresets`, so `npm run validate` with no flags now checks
every preset. `validateAll`'s default `outDir` parameter changes from `DEFAULT_OUT` to
`outDirFor(theme)`.

### Removal inside `buildAll`

Because every output directory is now a `dist/<name>/` that contains nothing but that
preset's own output, `buildAll` removes its whole output directory again:

```ts
rmSync(outDir, { recursive: true, force: true });
mkdirSync(componentsDir, { recursive: true });
```

The narrowed removal and its explanatory comment are deleted. The comment's hazard —
a wide `rmSync` in `dist/` destroying sibling presets — cannot recur, because no build
ever targets `dist/` itself.

### Pruning

A full build (bare invocation or `--all`) removes any directory under `dist/` that is
not backed by a preset file, after the presets are built:

```ts
function prune(): void {
  const keep = new Set(listPresets());
  for (const entry of readdirSync(DEFAULT_OUT, { withFileTypes: true })) {
    if (entry.isDirectory() && !keep.has(entry.name)) {
      rmSync(join(DEFAULT_OUT, entry.name), { recursive: true, force: true });
    }
  }
}
```

Pruning runs only for a full build. A `--preset X` build never touches a sibling
directory. `dist/soft/`, which is stale output from a preset that no longer exists, is
removed by the first full build.

Loose files directly under `dist/` are not pruned; only directories are considered, and
after the migration there are none.

### Where "default" survives

One reference to the name remains, and it is not a path rule: `componentsDir(root,
preset)` in `scripts/library.mjs` uses `"default"` as the fallback preset name when the
caller names none.

```js
export function componentsDir(root, preset) {
  return join(root, "dist", preset ?? "default", "components");
}
```

`buildCommand(preset)` likewise becomes unconditional:

```js
function buildCommand(preset) {
  return `npm run build -- --preset ${preset ?? "default"}`;
}
```

### Library detection

`MARKER` in `scripts/library.mjs` becomes `join("dist", "default", "comic-ui.excalidrawlib")`.
`resolveRoot` and `ensureLibrary` are otherwise unchanged; their error messages quote
`MARKER`, so they update themselves.

### Naming rules

`RESERVED_NAMES` and its check in `resolveTheme` are deleted, along with the comment
explaining them. `NAME_PATTERN` stays: a preset name is still a path segment, and it
still must be unable to express a traversal.

A preset named `components` or `comic-ui` is now legal and writes to `dist/components/`
or `dist/comic-ui/`, which collide with nothing.

### Git

`.gitignore` drops both `dist/*/` and `!dist/components/`. `dist/` is tracked in full,
so the plugin composes from any preset with no build, and `presets/` and `dist/` stay in
step.

## Testing

- `tests/build.test.ts`
  - `outDirFor(resolveTheme(DEFAULT_PRESET))` is `join(DEFAULT_OUT, "default")`, not
    `DEFAULT_OUT`. The existing escape-the-dist-directory cases are unchanged.
  - `selectPresets([])` equals `listPresets()`; `selectPresets(["--all"])` equals the
    same; `--preset` and its error cases are unchanged.
  - A full build into a temp dist prunes a directory with no backing preset file and
    leaves every backed one in place.
  - A `--preset X` build leaves sibling directories untouched.
  - The existing "builds every preset without destroying the others" test still passes,
    now without relying on the narrowed removal.
- `tests/theme.test.ts` — the reserved-name cases are removed; `components` and
  `comic-ui` resolve like any other name. The `NAME_PATTERN` cases stay.
- `tests/library.test.ts` — the fixture writes `dist/default/…`; `componentsDir(fake)`
  is `dist/default/components`; the marker and its error messages follow.
- `tests/frame.test.ts`, `tests/text.test.ts` — read from `dist/default/components/`.
- `tests/validate.test.ts` — unchanged in substance; fixtures already pass an explicit
  output directory.

## Documentation

- `README.md` — "Use it" points at `dist/default/comic-ui.excalidrawlib` and
  `dist/default/components/<name>.excalidraw`. "Styles" drops the "only the default
  preset's `dist/` is committed" sentence and the reserved-names paragraph, and states
  that a bare `npm run build` builds every preset and prunes orphaned output.
- `skills/building-presets/SKILL.md` — the reserved-names bullet is removed; the command
  block shows `npm run build` as the full build and `--preset` as the narrowing flag.
`skills/composing-scenes/SKILL.md` and `.claude-plugin/` mention no `dist` path and need
no change.

## Migration

One commit carries the code change and the rebuilt output:

1. `git rm -r --cached` the old `dist/components/` and `dist/comic-ui.excalidrawlib`, and
   delete them from the working tree.
2. Apply the code, documentation and test changes.
3. `npm run build` — writes `dist/default/` and `dist/blueprint/`, prunes `dist/soft/`.
4. `npm run check` — build, validate, typecheck and test, all now covering every preset.

## Out of scope

Nothing about how a preset resolves into elements changes: `tokens.ts`, `comic.ts`,
`element.ts`, `scene.ts` and every component are untouched. The rendered output of the
default preset is byte-identical to what is committed today; only its location changes.
