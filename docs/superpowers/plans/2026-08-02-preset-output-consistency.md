# Preset Output Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the default preset build exactly like every other preset — into `dist/default/` — so no code branches on a preset's name.

**Architecture:** `outDirFor` loses its `theme.name === "default"` branch and always returns `join(DEFAULT_OUT, theme.name)`. Three things fall out: `buildAll` can remove its whole output directory again, `RESERVED_NAMES` in `theme.ts` becomes dead, and `scripts/library.mjs` loses two `preset === "default"` branches. A bare `npm run build` becomes a full build that also prunes `dist/` subdirectories with no backing preset file, and `dist/` becomes fully tracked in git.

**Tech Stack:** TypeScript (`src/`, run with `tsx`), plain ESM JavaScript (`scripts/`), vitest, Node 20 core modules only. Zero runtime dependencies.

## Global Constraints

- **Zero runtime dependencies.** Node core modules only. Do not add a package.
- **No component output changes.** `src/tokens.ts`, `src/comic.ts`, `src/element.ts`, `src/scene.ts` and every file in `src/components/` are out of scope. The default preset's rendered JSON must stay byte-identical; only its location moves.
- **Clean break on paths.** No compatibility copy, symlink or alias for the old `dist/components/` and `dist/comic-ui.excalidrawlib`. They cease to exist.
- **Preset names are still path segments.** `NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/i` in `src/theme.ts` and `assertInsideDist` in `src/build.ts` both stay exactly as they are. Only `RESERVED_NAMES` goes.
- **`--all` keeps working.** After this change it is an accepted alias for the bare form, not the only way to build everything.
- **Comment style.** This codebase writes comments that explain *why*, often referencing the bug the code prevents. When you delete a guard, delete its comment. When you add one, say what breaks without it.
- **Test commands.** `npx vitest run tests/<file>` for one file, `npx vitest run -t "<name>"` for one test. Run from the repository root, `/Volumes/Dev/mine/excalidraw-components-library`.
- **Every task ends with a commit.** Commit messages end with:
  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  ```

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/build.ts` | Path derivation, preset loading/selection, writing output | `outDirFor` unbranched; `selectPresets` bare = all; `buildAll` removal widened; new `pruneOrphans` |
| `src/theme.ts` | Preset → Theme resolution and name validation | Delete `RESERVED_NAMES` and its check |
| `src/validate.ts` | Structural checks on built output | `validateAll` default `outDir` becomes `outDirFor(theme)` |
| `scripts/library.mjs` | Locating a library root and reading built components | `MARKER` moves; `componentsDir` and `buildCommand` unbranched |
| `tests/build.test.ts` | Build behaviour and path rules | Invert the default-path assertion; add prune tests |
| `tests/theme.test.ts` | Theme resolution | Add a test that `components`/`comic-ui` are legal names |
| `tests/library.test.ts` | Library resolution and component reading | Fixtures move to `dist/default/`; assertions follow |
| `tests/frame.test.ts`, `tests/text.test.ts` | Read committed output | Read from `dist/default/components/` |
| `.gitignore` | What git tracks | Drop `dist/*/` and `!dist/components/` |
| `README.md`, `skills/building-presets/SKILL.md` | Docs | New paths, no reserved names, bare build = all |

Task order matters: Task 1 changes the path rule and breaks every test that reads committed output, so Task 2 (which repoints those tests and rebuilds `dist/`) must follow immediately. The suite is green at the end of every task.

---

### Task 1: The path rule loses its branch

**Files:**
- Modify: `src/build.ts:67-71` (`outDirFor`), `src/build.ts:73-83` (`buildAll` removal)
- Modify: `src/theme.ts:46-53` (`RESERVED_NAMES` and its comment), `src/theme.ts:83-88` (the check)
- Modify: `src/validate.ts:218` (`validateAll` signature)
- Test: `tests/build.test.ts`, `tests/theme.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `outDirFor(theme: Theme): string` — now always `join(DEFAULT_OUT, theme.name)`.
  - `validateAll(theme: Theme, outDir?: string): string[]` — `outDir` now defaults to `outDirFor(theme)`.
  - `RESERVED_NAMES` no longer exists in `src/theme.ts`. Nothing imported it.

- [ ] **Step 1: Write the failing tests**

In `tests/build.test.ts`, replace the test at lines 128-130 (`"writes the default preset to dist root"`) with:

```ts
  it("writes the default preset to its own subdirectory, like any other preset", () => {
    expect(outDirFor(resolveTheme(DEFAULT_PRESET))).toBe(join(DEFAULT_OUT, "default"));
  });
```

Add to `tests/theme.test.ts` (import `resolveTheme` from `../src/theme.js` if the file does not already):

```ts
describe("preset names that used to be reserved", () => {
  // "components" and "comic-ui" were rejected only because the default preset wrote
  // flat into dist/. Now that every preset writes to dist/<name>/, they collide with
  // nothing and must resolve like any other name.
  it.each(["components", "comic-ui"])("accepts the name %j", (name) => {
    expect(resolveTheme({ name }).name).toBe(name);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/build.test.ts tests/theme.test.ts`
Expected: FAIL. The build test reports the received value is `.../dist` where `.../dist/default` was expected. Both theme cases throw `Preset name "components" is reserved`.

- [ ] **Step 3: Unbranch `outDirFor`**

In `src/build.ts`, replace lines 67-71 with:

```ts
export function outDirFor(theme: Theme): string {
  return assertInsideDist(join(DEFAULT_OUT, theme.name));
}
```

Remove the now-unused `DEFAULT_PRESET` from the `./theme.js` import on line 6 **only if** nothing else in the file uses it — `selectPresets` still does at this point, so keep it. Leave `assertInsideDist` and its comment untouched.

- [ ] **Step 4: Widen `buildAll`'s removal**

In `src/build.ts`, replace lines 74-83 with:

```ts
  const componentsDir = join(outDir, "components");
  // Every output directory is now a dist/<name>/ holding nothing but this preset's
  // output, so removing it wholesale leaves no stale file behind and cannot reach a
  // sibling preset. (It could when the default preset's output dir *was* dist/.)
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(componentsDir, { recursive: true });
```

- [ ] **Step 5: Delete `RESERVED_NAMES`**

In `src/theme.ts`, delete lines 46-53 (the doc comment and the `RESERVED_NAMES` constant) and lines 83-88 (the `if (RESERVED_NAMES.includes(...))` block). Leave `NAME_PATTERN`, its comment, and its check exactly as they are.

- [ ] **Step 6: Default `validateAll` to the theme's own directory**

In `src/validate.ts`, change line 218 from:

```ts
export function validateAll(theme: Theme, outDir: string = DEFAULT_OUT): string[] {
```

to:

```ts
export function validateAll(theme: Theme, outDir: string = outDirFor(theme)): string[] {
```

`DEFAULT_OUT` is then unused in that file — remove it from the import on line 3, leaving `import { loadPreset, outDirFor, selectPresets } from "./build.js";`.

Line 230 in the same file hardcodes the old flat path in an error message:

```ts
  if (files.length === 0) errors.push("dist/components: no .excalidraw files");
```

It is checking `componentsDir`, which is now a different path per preset, so name the real one:

```ts
  if (files.length === 0) errors.push(`${componentsDir}: no .excalidraw files`);
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run tests/build.test.ts tests/theme.test.ts`
Expected: the two new tests PASS. Other tests in `build.test.ts` still FAIL — the `preset CLI` suite shells out to a real build, which now writes `dist/default/` while `outDirFor` is consulted for paths that no longer hold committed output. `tests/frame.test.ts` and `tests/text.test.ts` also FAIL, reading from the old `dist/components/`. Task 2 fixes all of these. Do not fix them here.

Run: `npx tsc --noEmit`
Expected: PASS. No unused imports, no type errors.

- [ ] **Step 8: Commit**

```bash
git add src/build.ts src/theme.ts src/validate.ts tests/build.test.ts tests/theme.test.ts
git commit -m "$(cat <<'EOF'
refactor: derive every preset's output directory the same way

outDirFor no longer branches on the default preset's name, so the default
builds to dist/default/ like any other preset. buildAll can remove its whole
output directory again, and RESERVED_NAMES — which existed only to protect the
default's flat paths — is gone.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Move the committed output and repoint its readers

**Files:**
- Modify: `scripts/library.mjs:12` (`MARKER`), `scripts/library.mjs:120-124` (`componentsDir`), `scripts/library.mjs:139-141` (`buildCommand`)
- Modify: `.gitignore`
- Test: `tests/library.test.ts`, `tests/frame.test.ts:8`, `tests/text.test.ts:8`
- Delete: `dist/components/`, `dist/comic-ui.excalidrawlib`, `dist/soft/`
- Create (by building): `dist/default/`, `dist/blueprint/`

**Interfaces:**
- Consumes: `outDirFor` from Task 1 — the build now writes `dist/default/` and `dist/blueprint/`.
- Produces:
  - `componentsDir(root: string, preset?: string): string` — `join(root, "dist", preset ?? "default", "components")`.
  - `MARKER` (module-private) — `join("dist", "default", "comic-ui.excalidrawlib")`. Quoted in `resolveRoot`'s error messages, so they update themselves.

- [ ] **Step 1: Write the failing tests**

In `tests/library.test.ts`, change the fixture in `beforeAll` (lines 13-18) to build under `dist/default/`:

```ts
  fake = mkdtempSync(join(tmpdir(), "lib-"));
  mkdirSync(join(fake, "dist", "default", "components", "widget"), { recursive: true });
  writeFileSync(join(fake, "dist", "default", "comic-ui.excalidrawlib"), "{}");
  writeFileSync(join(fake, "dist", "default", "components", "widget", "default.excalidraw"), JSON.stringify({
    elements: [{ id: "a", x: 0, y: 0, width: 30, height: 10 }, { id: "b", x: 10, y: 5, width: 30, height: 20 }],
    appState: { gridSize: null, viewBackgroundColor: "#ffffff" },
  }));
```

Replace the two `componentsDir` tests (lines 43-49) with:

```ts
  it("uses dist/default/components when no preset is named", () => {
    expect(componentsDir(fake)).toBe(join(fake, "dist", "default", "components"));
  });

  it("uses dist/<preset>/components for a named preset", () => {
    expect(componentsDir(fake, "soft")).toBe(join(fake, "dist", "soft", "components"));
  });

  it("derives both the same way: 'default' is a fallback name, not a special path", () => {
    expect(componentsDir(fake, "default")).toBe(componentsDir(fake));
  });
```

Replace the test at lines 56-65 — the build command is no longer special-cased, so a missing default build now says `--preset default`:

```ts
  it("names the preset in the build command for a missing default build", () => {
    const noDist = mkdtempSync(join(tmpdir(), "nodist-"));
    mkdirSync(join(noDist, "dist", "default"), { recursive: true });
    writeFileSync(join(noDist, "dist", "default", "comic-ui.excalidrawlib"), "{}");

    expect(() => loadVariant(noDist, undefined, "widget", "default"))
      .toThrow(/Run: npm run build -- --preset default$/);
    expect(() => listComponents(noDist, undefined))
      .toThrow(/Run: npm run build -- --preset default$/);

    rmSync(noDist, { recursive: true, force: true });
  });
```

In `makeCloneLike` (lines 149-158), move the marker file:

```ts
    const clone = mkdtempSync(join(tmpdir(), "clone-"));
    mkdirSync(join(clone, "dist", "default"), { recursive: true });
    writeFileSync(join(clone, "dist", "default", "comic-ui.excalidrawlib"), "{}");
```

In `tests/frame.test.ts` and `tests/text.test.ts`, change the `load` helper on line 8 in each file from `join(root, "dist", "components", ...)` to:

```ts
  JSON.parse(readFileSync(join(root, "dist", "default", "components", component, `${variant}.excalidraw`), "utf8"))
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/library.test.ts tests/frame.test.ts tests/text.test.ts`
Expected: FAIL. `componentsDir` returns `dist/components`; `resolveRoot` no longer finds the fixture root because `MARKER` still points at the flat path; the frame and text helpers cannot read `dist/default/components/...` because it has not been built yet.

- [ ] **Step 3: Unbranch `scripts/library.mjs`**

Line 12:

```js
const MARKER = join("dist", "default", "comic-ui.excalidrawlib");
```

Lines 120-124:

```js
export function componentsDir(root, preset) {
  return join(root, "dist", preset ?? "default", "components");
}
```

Lines 139-141:

```js
function buildCommand(preset) {
  return `npm run build -- --preset ${preset ?? "default"}`;
}
```

Update the comment on line 34 — it says "the plugin's own root (dist/ is committed, so composing needs no setup)". Every preset's output is committed now, so make it read:

```js
 * 1. the config file, 2. the plugin's own root (dist/ is committed for every preset,
 * so composing needs no setup), 3. fail with the exact fix.
```

- [ ] **Step 4: Move the committed output**

```bash
cd /Volumes/Dev/mine/excalidraw-components-library
git rm -r --quiet dist/components dist/comic-ui.excalidrawlib
rm -rf dist/soft
npm run build -- --preset default
npm run build -- --preset blueprint
```

`npm run build` with no flag still builds only the default at this point — Task 3 changes that. Building the two presets explicitly here keeps this task's deliverable self-contained.

Confirm the layout:

```bash
ls dist
```

Expected: exactly `blueprint` and `default`, nothing else.

- [ ] **Step 5: Track every preset's output**

Replace the last two lines of `.gitignore`:

```
node_modules/
*.log
.DS_Store
/mockups
```

The `dist/*/` and `!dist/components/` lines and the comment above them are deleted — `dist/` is tracked in full.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run`
Expected: PASS, whole suite. This includes the `preset CLI` suite in `tests/build.test.ts`, which shells out to real builds and now finds `dist/default/` and `dist/blueprint/` where `outDirFor` says they are.

Run: `npm run validate -- --all`
Expected: `All generated files are valid.`

- [ ] **Step 7: Verify the default output only moved**

The rendered JSON must be byte-identical to what was committed before the move:

```bash
git show HEAD~1:dist/components/button.excalidraw | diff - dist/default/components/button.excalidraw && echo IDENTICAL
```

Expected: `IDENTICAL`. (`HEAD~1` is the commit before Task 1's, i.e. the last one that still had the flat paths. If Task 1's commit is `HEAD`, `HEAD~1` is right; adjust if you committed anything else in between.)

- [ ] **Step 8: Commit**

```bash
git add -A dist .gitignore scripts/library.mjs tests/library.test.ts tests/frame.test.ts tests/text.test.ts
git commit -m "$(cat <<'EOF'
refactor: move the default preset's output to dist/default/

The committed output moves from dist/components/ and dist/comic-ui.excalidrawlib
to dist/default/. library.mjs stops branching on the preset name — "default" is
now a fallback name, not a special path. dist/ is tracked in full, so every
preset composes with no build. Stale dist/soft/ output is removed.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: A bare build builds every preset

**Files:**
- Modify: `src/build.ts:122-133` (`selectPresets`), `src/build.ts:136-140` (the CLI entry point)
- Test: `tests/build.test.ts`

**Interfaces:**
- Consumes: `listPresets(): string[]` and `outDirFor` from `src/build.ts`.
- Produces: `selectPresets(args: string[]): string[]` — returns `listPresets()` for `[]` and for `["--all"]`; `["X"]` for `["--preset", "X"]`; throws for a missing or flag-shaped value.

- [ ] **Step 1: Write the failing test**

In `tests/build.test.ts`, replace the test at lines 213-217 with:

```ts
  it("selects every preset by default, every preset for --all, or one named preset", () => {
    expect(selectPresets([])).toEqual(listPresets());
    expect(selectPresets(["--all"])).toEqual(listPresets());
    expect(selectPresets(["--preset", "blueprint"])).toEqual(["blueprint"]);
  });

  it("selects more than one preset for a bare build, so no preset is privileged", () => {
    // Guards the regression this change exists to prevent: a bare build that quietly
    // means "default only" leaves every other preset's committed output stale.
    expect(selectPresets([]).length).toBeGreaterThan(1);
    expect(selectPresets([])).toContain("default");
  });
```

Also update the stale comment at lines 219-221 above the `beforeAll`, which explains a hazard that no longer exists:

```ts
  // A full build iterates listPresets() in sorted order. Each preset owns its own
  // dist/<name>/, so building one never reaches a sibling.
```

And the test at lines 237-241 — the bare build now builds blueprint rather than merely sparing it. Replace it with a check that a *narrowed* build spares siblings, which is the property still worth asserting:

```ts
  it("building one named preset leaves other presets' output alone", () => {
    const blueprint = outDirFor(resolveTheme(loadPreset("blueprint")));
    execFileSync("npx", ["tsx", "src/build.ts", "--preset", "default"], { cwd: REPO_ROOT, encoding: "utf8" });
    expect(existsSync(join(blueprint, "comic-ui.excalidrawlib"))).toBe(true);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/build.test.ts -t "selects"`
Expected: FAIL. `selectPresets([])` returns `["default"]`, not `["blueprint", "default"]`.

- [ ] **Step 3: Make a bare invocation select every preset**

In `src/build.ts`, replace `selectPresets` (lines 122-133) with:

```ts
/**
 * Which presets a `--preset <name>` / `--all` / bare invocation selects. Shared so
 * `validate.ts` answers the same question the same way: before this existed, only
 * `build.ts` understood the flags and `npm run validate` always checked the default.
 *
 * A bare invocation means every preset. No preset is privileged, and since every
 * preset's output is committed, a bare build that meant "default only" left the
 * others stale in git. `--all` stays accepted as an alias for that same full build.
 */
export function selectPresets(args: string[]): string[] {
  const presetFlag = args.indexOf("--preset");
  if (presetFlag === -1) return listPresets();

  const presetName = args[presetFlag + 1];
  if (presetName === undefined || presetName.startsWith("--")) {
    throw new Error("--preset requires a preset name.");
  }
  return [presetName];
}
```

`--all` needs no case of its own: it contains no `--preset`, so it falls through to `listPresets()`.

`DEFAULT_PRESET` is now unused in `src/build.ts` — remove it from the `./theme.js` import on line 6, leaving `import { resolveTheme, type Preset, type Theme } from "./theme.js";`.

- [ ] **Step 4: Run the tests and the typechecker**

Run: `npx vitest run tests/build.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/build.ts tests/build.test.ts
git commit -m "$(cat <<'EOF'
feat: build and validate every preset by default

A bare npm run build meant "default only", which left every other preset's
committed output stale. It now selects every preset, and --all is an alias for
the same thing. validate.ts shares selectPresets, so it follows.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: A full build prunes orphaned output

**Files:**
- Modify: `src/build.ts` (add `pruneOrphans`, call it from the CLI entry point)
- Test: `tests/build.test.ts`

**Interfaces:**
- Consumes: `listPresets()`, `DEFAULT_OUT` from `src/build.ts`.
- Produces: `pruneOrphans(distDir?: string): string[]` — removes every immediate *directory* under `distDir` whose name is not a preset, and returns the removed names sorted. `distDir` defaults to `DEFAULT_OUT`; the parameter exists so tests point it at a temp directory. Loose files are left alone.

- [ ] **Step 1: Write the failing test**

Add to the `preset builds` describe block in `tests/build.test.ts`, and add `pruneOrphans` to the import from `../src/build.js` on line 6:

```ts
  it("prunes a dist subdirectory with no backing preset file, and keeps the backed ones", () => {
    const dist = mkdtempSync(join(tmpdir(), "prune-"));
    for (const name of [...listPresets(), "gone"]) {
      mkdirSync(join(dist, name, "components"), { recursive: true });
    }
    // A loose file is not a preset's output directory and must survive.
    writeFileSync(join(dist, "notes.txt"), "keep me");

    expect(pruneOrphans(dist)).toEqual(["gone"]);
    expect(existsSync(join(dist, "gone"))).toBe(false);
    for (const name of listPresets()) {
      expect(existsSync(join(dist, name)), name).toBe(true);
    }
    expect(existsSync(join(dist, "notes.txt"))).toBe(true);

    rmSync(dist, { recursive: true, force: true });
  });

  it("reports nothing to prune when dist mirrors presets", () => {
    const dist = mkdtempSync(join(tmpdir(), "prune-clean-"));
    for (const name of listPresets()) mkdirSync(join(dist, name), { recursive: true });
    expect(pruneOrphans(dist)).toEqual([]);
    rmSync(dist, { recursive: true, force: true });
  });
```

`mkdirSync` and `existsSync` are already imported in this file; confirm `writeFileSync` is too (it is, line 2).

Add to the `preset CLI` describe block a test that the CLI actually prunes:

```ts
  it("a bare build prunes an orphaned output directory", () => {
    const orphan = join(PRESETS_DIR, "..", "dist", "_orphan-test");
    mkdirSync(join(orphan, "components"), { recursive: true });
    try {
      execFileSync("npx", ["tsx", "src/build.ts"], { cwd: REPO_ROOT, encoding: "utf8" });
      expect(existsSync(orphan)).toBe(false);
    } finally {
      // The build should have removed it; clean up anyway so a failure here does not
      // leave an untracked directory behind in the real dist/.
      rmSync(orphan, { recursive: true, force: true });
    }
  });

  it("a narrowed build leaves an orphaned output directory alone", () => {
    const orphan = join(PRESETS_DIR, "..", "dist", "_orphan-test");
    mkdirSync(join(orphan, "components"), { recursive: true });
    try {
      execFileSync("npx", ["tsx", "src/build.ts", "--preset", "default"], { cwd: REPO_ROOT, encoding: "utf8" });
      expect(existsSync(orphan)).toBe(true);
    } finally {
      rmSync(orphan, { recursive: true, force: true });
    }
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/build.test.ts -t "prune"`
Expected: FAIL with `pruneOrphans is not a function` (or a TypeScript import error naming `pruneOrphans`).

- [ ] **Step 3: Implement `pruneOrphans`**

Add to `src/build.ts`, after `outDirFor`:

```ts
/**
 * Removes output directories with no backing preset file. Every preset's dist/ is
 * committed, so deleting presets/<name>.json without this would leave dist/<name>/
 * tracked in git forever, describing a style that no longer exists.
 *
 * Only immediate directories are considered, and only a full build calls this — a
 * `--preset X` build must never reach a sibling. Loose files are left alone.
 */
export function pruneOrphans(distDir: string = DEFAULT_OUT): string[] {
  const keep = new Set(listPresets());

  let entries: Dirent[];
  try {
    entries = readdirSync(distDir, { withFileTypes: true });
  } catch {
    return []; // nothing built yet
  }

  const removed: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || keep.has(entry.name)) continue;
    rmSync(join(distDir, entry.name), { recursive: true, force: true });
    removed.push(entry.name);
  }
  return removed.sort();
}
```

Add the `Dirent` type import at the top of the file:

```ts
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, type Dirent } from "node:fs";
```

- [ ] **Step 4: Call it from a full build**

Replace the CLI entry point at the bottom of `src/build.ts` with:

```ts
// Only run when executed directly, not when imported by validate.ts or a test.
if (import.meta.url === `file://${process.argv[1]}`) {
  const selected = selectPresets(process.argv.slice(2));
  for (const name of selected) {
    buildAll(resolveTheme(loadPreset(name)));
  }

  // Only a full build prunes: a narrowed one was not asked about its siblings.
  if (!process.argv.includes("--preset")) {
    const removed = pruneOrphans();
    if (removed.length > 0) console.log(`Pruned orphaned output: ${removed.join(", ")}`);
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/build.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Confirm dist still mirrors presets**

```bash
cd /Volumes/Dev/mine/excalidraw-components-library
npm run build
ls dist
git status --short dist
```

Expected: `ls dist` prints exactly `blueprint` and `default`. `git status --short dist` prints nothing — the rebuild is byte-identical to what Task 2 committed.

- [ ] **Step 7: Commit**

```bash
git add src/build.ts tests/build.test.ts
git commit -m "$(cat <<'EOF'
feat: prune dist directories with no backing preset

dist/ is committed in full, so deleting presets/<name>.json used to leave
dist/<name>/ tracked forever. A full build now removes any output directory
that no preset backs; a --preset build never touches a sibling.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Documentation

**Files:**
- Modify: `README.md` (the "Use it" section, the "Develop" section's `dist/` note, the "Styles" section)
- Modify: `skills/building-presets/SKILL.md:31-51` (Commands and Naming rules)

**Interfaces:**
- Consumes: the final behaviour from Tasks 1-4. Nothing produces anything for a later task.

- [ ] **Step 1: Update the "Use it" section of `README.md`**

Replace the two path references:

```markdown
**Whole library:** in Excalidraw open **Library → Load from file** and pick
`dist/default/comic-ui.excalidrawlib`. All 58 components land in your library panel.

**One component:** open `dist/default/components/<name>.excalidraw` via **Menu → Open**,
then copy what you need.
```

- [ ] **Step 2: Update the "Develop" section of `README.md`**

The last line of that section currently reads:

```markdown
`dist/` is generated but committed, so the library works without a build. Only the
default preset's output is committed — see [Styles](#styles).
```

Replace it with:

```markdown
`dist/` is generated but committed, so the library works without a build. Every preset's
output is committed, one directory per preset — see [Styles](#styles).
```

- [ ] **Step 3: Update the "Styles" section of `README.md`**

Replace the command block with:

```bash
npm run preset                    # prompts, writes presets/<name>.json
npm run preset -- --name soft --palette stone --edges sharp
npm run build                     # every preset → dist/<name>/
npm run build -- --preset soft    # just soft → dist/soft/
npm run validate                  # checks every preset
npm run validate -- --preset soft # checks dist/soft/
```

Replace the paragraph beginning "`presets/` is committed so a style is reproducible" with:

```markdown
`presets/` and `dist/` are both committed, so every style is reproducible and usable
without a build. `dist/` mirrors `presets/` exactly: a full build writes one directory
per preset and removes any directory no preset backs, so deleting a preset and
rebuilding cleans up after itself. A `--preset` build only ever touches its own
directory.
```

Replace the paragraph beginning "A preset's filename and its `name` field must match" with:

```markdown
A preset's filename and its `name` field must match — the filename is what `--preset`
selects, the field is what picks the output directory. A name must also be a plain path
segment (`[a-z0-9][a-z0-9-]*`): it becomes a directory under `dist/`, and building a
preset removes and rewrites that directory.
```

The sentence about `components` and `comic-ui` being reserved is deleted — they are not.

- [ ] **Step 4: Update `skills/building-presets/SKILL.md`**

Replace the Commands block (lines 33-38):

```bash
npm run preset -- --name soft --palette stone --edges sharp   # writes presets/soft.json
npm run build -- --preset soft                                 # writes dist/soft/
npm run validate -- --preset soft                              # checks dist/soft/
npm run build                                                  # every preset, prunes orphans
npm run validate                                               # checks every preset
```

Replace the Naming rules list (lines 45-49) with:

```markdown
- The filename and the `name` field must match; the filename is what `--preset`
  selects, the field picks the output directory.
- A name must be a plain path segment: `[a-z0-9][a-z0-9-]*`.
- Every preset builds to `dist/<name>/`, including `default`. Deleting a preset file
  and running a full build removes its output directory.
```

- [ ] **Step 5: Verify no stale path or claim survives**

```bash
cd /Volumes/Dev/mine/excalidraw-components-library
grep -rn "dist/components\|dist/comic-ui\|reserved" README.md skills/ src/ scripts/ tests/
```

Expected: no output. Any hit is a leftover to fix before committing.

- [ ] **Step 6: Run the full check**

Run: `npm run check`
Expected: build, validate, typecheck and test all pass. `git status --short dist` prints nothing afterwards.

- [ ] **Step 7: Commit**

```bash
git add README.md skills/building-presets/SKILL.md
git commit -m "$(cat <<'EOF'
docs: document the per-preset dist layout

Every preset, default included, builds to dist/<name>/. A bare build covers all
of them and prunes orphans. No name is reserved any more.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## Verification

After Task 5, from the repository root:

```bash
npm run check
ls dist                                  # blueprint  default
git status --short                       # clean
grep -rn "=== DEFAULT_PRESET.name" src/  # no hit: no path branches on a preset name
```
