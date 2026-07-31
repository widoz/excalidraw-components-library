# Components Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn this repo into a Claude Code plugin whose skills compose Excalidraw mockups from the component library, and teach the build to emit one file per component variant so a scene can place a single widget.

**Architecture:** Components stop returning a flat element array and instead declare named variants; `build.ts` writes each variant as its own origin-normalised scene under `dist/components/<name>/<variant>.excalidraw` beside the unchanged sheet. A dependency-free Node CLI in `scripts/` reads those files and turns a row/column layout document into a composed `.excalidraw` scene. Two skills in `skills/` drive the CLI and the existing preset commands.

**Tech Stack:** TypeScript + tsx (library), plain ESM Node ≥20 (plugin scripts), vitest (all tests).

## Global Constraints

- Plugin scripts are **plain ESM `.mjs`, zero dependencies, no build step**. They read `dist/` only, never `src/`.
- Variant names match `^[a-z0-9][a-z0-9-]*$`, are unique within a component, and a component with nothing to split declares exactly one variant named `default`.
- The sheet file `dist/components/<name>.excalidraw` and `dist/comic-ui.excalidrawlib` must stay **byte-identical** to their pre-change output. This refactor reorganises, it does not restyle.
- Variant files are normalised so their bounding box starts at `(0, 0)`.
- In a layout, `{"component": "x"}` means variant `default`, never the sheet.
- Composer output is deterministic: the same layout produces a byte-identical scene.
- Element `index` values use `Factory`'s format: `` `a${counter.toString(36).padStart(5, "0")}V` ``.
- Never run `npm install` outside a directory verified as a clone of this repo. Never use the installed plugin copy as a build target.
- Run `npm run check` (build + validate + test) before every commit that touches `src/`.

---

### Task 1: The `variants()` helper

Components need a way to say which elements form which variant. This task adds the type and helper with no consumers yet.

**Files:**
- Create: `src/variants.ts`
- Test: `tests/variants.test.ts`

**Interfaces:**
- Consumes: `ExcalidrawElement` from `src/element.ts`.
- Produces: `interface Variant { name: string; elements: ExcalidrawElement[] }`, `interface ComponentOutput { elements: ExcalidrawElement[]; variants: Variant[] }`, `function variants(parts: Variant[]): ComponentOutput`, `function toOutput(result: ExcalidrawElement[] | ComponentOutput): ComponentOutput`, `function normalize(elements: ExcalidrawElement[]): ExcalidrawElement[]`.

> Naming note: the helper is `variants()`, not `sheet()` as the spec sketched, because `sheet` is already a component (`src/components/sheet.ts`). It lives in its own module rather than `comic.ts`, which is house-style drawing helpers.

- [ ] **Step 1: Write the failing test**

```ts
// tests/variants.test.ts
import { describe, expect, it } from "vitest";
import { normalize, toOutput, variants } from "../src/variants.js";
import type { ExcalidrawElement } from "../src/element.js";

const el = (x: number, y: number): ExcalidrawElement =>
  ({ id: `e${x}-${y}`, type: "rectangle", x, y, width: 10, height: 10 } as unknown as ExcalidrawElement);

describe("variants", () => {
  it("concatenates parts in declaration order", () => {
    const out = variants([
      { name: "default", elements: [el(0, 0)] },
      { name: "secondary", elements: [el(0, 20), el(0, 30)] },
    ]);
    expect(out.elements.map((e) => e.y)).toEqual([0, 20, 30]);
    expect(out.variants.map((v) => v.name)).toEqual(["default", "secondary"]);
  });

  it("rejects a malformed name", () => {
    expect(() => variants([{ name: "Default", elements: [el(0, 0)] }])).toThrow(/[a-z0-9]/);
  });

  it("rejects a duplicate name", () => {
    expect(() => variants([
      { name: "a", elements: [el(0, 0)] },
      { name: "a", elements: [el(0, 10)] },
    ])).toThrow(/duplicate/i);
  });

  it("rejects an empty variant", () => {
    expect(() => variants([{ name: "a", elements: [] }])).toThrow(/no elements/i);
  });

  it("rejects a component with no variants", () => {
    expect(() => variants([])).toThrow(/at least one/i);
  });
});

describe("toOutput", () => {
  it("wraps a bare array as a single default variant", () => {
    const out = toOutput([el(0, 0), el(0, 10)]);
    expect(out.variants).toHaveLength(1);
    expect(out.variants[0]!.name).toBe("default");
    expect(out.variants[0]!.elements).toHaveLength(2);
  });

  it("passes a ComponentOutput through unchanged", () => {
    const made = variants([{ name: "only", elements: [el(0, 0)] }]);
    expect(toOutput(made)).toBe(made);
  });
});

describe("normalize", () => {
  it("moves the bounding box to the origin", () => {
    const out = normalize([el(-4, 8), el(6, 20)]);
    expect(out.map((e) => [e.x, e.y])).toEqual([[0, 0], [10, 12]]);
  });

  it("does not mutate its input", () => {
    const input = [el(-4, 8)];
    normalize(input);
    expect(input[0]!.x).toBe(-4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/variants.test.ts`
Expected: FAIL — cannot resolve `../src/variants.js`.

- [ ] **Step 3: Write the implementation**

```ts
// src/variants.ts
import type { ExcalidrawElement } from "./element.js";

export interface Variant {
  /** Slug used as the variant's filename. */
  name: string;
  elements: ExcalidrawElement[];
}

export interface ComponentOutput {
  /** Every element, in declaration order. This is what the sheet file and library item use. */
  elements: ExcalidrawElement[];
  variants: Variant[];
}

const NAME = /^[a-z0-9][a-z0-9-]*$/;

/** Declares a component's variants. The concatenation is the sheet. */
export function variants(parts: Variant[]): ComponentOutput {
  if (parts.length === 0) {
    throw new Error("A component must declare at least one variant.");
  }

  const seen = new Set<string>();
  for (const part of parts) {
    if (!NAME.test(part.name)) {
      throw new Error(`Variant name "${part.name}" must match ${NAME.source}.`);
    }
    if (seen.has(part.name)) {
      throw new Error(`Duplicate variant name "${part.name}".`);
    }
    seen.add(part.name);
    if (part.elements.length === 0) {
      throw new Error(`Variant "${part.name}" has no elements.`);
    }
  }

  return { elements: parts.flatMap((part) => part.elements), variants: parts };
}

/**
 * Bridge for components not yet migrated: a bare element array becomes one
 * variant named "default". Removed in the task that tightens the builder type.
 */
export function toOutput(result: ExcalidrawElement[] | ComponentOutput): ComponentOutput {
  return Array.isArray(result)
    ? { elements: result, variants: [{ name: "default", elements: result }] }
    : result;
}

/**
 * Shifts elements so their bounding box starts at (0, 0). Required, not cosmetic:
 * `input`'s focus ring starts at x=-4, and a composer that trusts raw coordinates
 * misaligns every row. Line `points` are relative to x/y, so translation is safe.
 */
export function normalize(elements: ExcalidrawElement[]): ExcalidrawElement[] {
  const minX = Math.min(...elements.map((e) => e.x));
  const minY = Math.min(...elements.map((e) => e.y));
  return elements.map((e) => ({ ...e, x: e.x - minX, y: e.y - minY }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/variants.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/variants.ts tests/variants.test.ts
git commit -m "feat: add the variants() helper components will declare parts with"
```

---

### Task 2: Build writes variant files

`build.ts` starts emitting `dist/components/<name>/<variant>.excalidraw`. Every component still returns a bare array, so each gets exactly one `default.excalidraw` — which is enough to prove the pipeline before touching 58 files.

**Files:**
- Modify: `src/registry.ts` (the `ComponentBuilder` type)
- Modify: `src/build.ts` (`buildAll`)
- Test: `tests/build.test.ts`

**Interfaces:**
- Consumes: `toOutput`, `normalize` from `src/variants.ts`.
- Produces: `type ComponentBuilder = (theme: Theme) => ExcalidrawElement[] | ComponentOutput`. `buildAll` keeps its signature `(theme: Theme, outDir?: string) => void`.

- [ ] **Step 1: Write the failing test**

Append to `tests/build.test.ts` inside the existing `describe("build", ...)`:

```ts
  it("writes a variant directory per component", () => {
    for (const name of Object.keys(registry)) {
      const dir = join(out, "components", name);
      const files = readdirSync(dir).filter((f) => f.endsWith(".excalidraw"));
      expect(files.length).toBeGreaterThan(0);
    }
  });

  it("normalises every variant file to the origin", () => {
    for (const name of Object.keys(registry)) {
      const dir = join(out, "components", name);
      for (const file of readdirSync(dir)) {
        const scene = JSON.parse(readFileSync(join(dir, file), "utf8"));
        const minX = Math.min(...scene.elements.map((e: { x: number }) => e.x));
        const minY = Math.min(...scene.elements.map((e: { y: number }) => e.y));
        expect([minX, minY], `${name}/${file}`).toEqual([0, 0]);
      }
    }
  });

  it("keeps each component's variants a partition of its sheet", () => {
    for (const name of Object.keys(registry)) {
      const sheet = JSON.parse(readFileSync(join(out, "components", `${name}.excalidraw`), "utf8"));
      const dir = join(out, "components", name);
      const fromVariants = readdirSync(dir)
        .sort()
        .flatMap((file) => JSON.parse(readFileSync(join(dir, file), "utf8")).elements as { id: string }[])
        .map((e) => e.id)
        .sort();
      const fromSheet = (sheet.elements as { id: string }[]).map((e) => e.id).sort();
      expect(fromVariants, name).toEqual(fromSheet);
    }
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/build.test.ts`
Expected: FAIL — `ENOENT` reading `dist/components/accordion` (no such directory).

- [ ] **Step 3: Write the implementation**

In `src/registry.ts`, widen the builder type:

```ts
import type { ComponentOutput } from "./variants.js";

export type ComponentBuilder = (theme: Theme) => ExcalidrawElement[] | ComponentOutput;
```

In `src/build.ts`, import the helpers and replace the body of the registry loop in `buildAll`:

```ts
import { normalize, toOutput } from "./variants.js";

  for (const [name, entry] of Object.entries(registry)) {
    const output = toOutput(entry.build(theme));

    writeFileSync(
      join(componentsDir, `${name}.excalidraw`),
      `${JSON.stringify(toScene(output.elements, theme), null, 2)}\n`,
    );

    // Variants are written under the component's own directory. The whole of
    // componentsDir is removed above, so a renamed variant leaves nothing stale.
    const variantDir = join(componentsDir, name);
    mkdirSync(variantDir, { recursive: true });
    for (const variant of output.variants) {
      writeFileSync(
        join(variantDir, `${variant.name}.excalidraw`),
        `${JSON.stringify(toScene(normalize(variant.elements), theme), null, 2)}\n`,
      );
    }

    items.push({ name: entry.title, elements: output.elements });
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/build.test.ts`
Expected: PASS. The existing "is deterministic" test must still pass — variant files must not change the library output.

- [ ] **Step 5: Verify the committed output is unchanged apart from additions**

```bash
npm run build
git status --short dist | grep -v '^?? ' || echo "no modifications, only additions"
```
Expected: no `M` lines. Sheets and `comic-ui.excalidrawlib` are byte-identical; only new directories appear.

- [ ] **Step 6: Commit**

```bash
npm run check
git add src/build.ts src/registry.ts tests/build.test.ts dist
git commit -m "feat: write one file per component variant"
```

---

### Task 3: Validate the variant files

Variant files must hold to the same rules as sheets, plus the partition invariant. Putting this before the 58-file migration means every later batch is checked by `npm run validate`.

**Files:**
- Modify: `src/validate.ts` (`validateAll`)
- Test: `tests/validate.test.ts`

**Interfaces:**
- Consumes: the existing private `checkElements(where, elements, errors, checks)` and `ThemeChecks` in `src/validate.ts`.
- Produces: `validateAll(theme: Theme, outDir?: string): string[]` — unchanged signature, more errors.

- [ ] **Step 1: Write the failing test**

Append to `tests/validate.test.ts`:

```ts
  it("reports a variant file that is not at the origin", () => {
    const dir = mkdtempSync(join(tmpdir(), "comic-ui-"));
    buildAll(theme, dir);
    const file = join(dir, "components", "button", "default.excalidraw");
    const scene = JSON.parse(readFileSync(file, "utf8"));
    scene.elements[0].x += 12;
    writeFileSync(file, JSON.stringify(scene, null, 2));

    const errors = validateAll(theme, dir);
    expect(errors.join("\n")).toMatch(/button\/default\.excalidraw.*origin/);
    rmSync(dir, { recursive: true, force: true });
  });

  it("reports a variant whose elements are missing from the sheet", () => {
    const dir = mkdtempSync(join(tmpdir(), "comic-ui-"));
    buildAll(theme, dir);
    const file = join(dir, "components", "button", "default.excalidraw");
    const scene = JSON.parse(readFileSync(file, "utf8"));
    scene.elements[0].id = "not-in-the-sheet";
    writeFileSync(file, JSON.stringify(scene, null, 2));

    const errors = validateAll(theme, dir);
    expect(errors.join("\n")).toMatch(/button: variants do not partition the sheet/);
    rmSync(dir, { recursive: true, force: true });
  });

  it("reports a component with no variant directory", () => {
    const dir = mkdtempSync(join(tmpdir(), "comic-ui-"));
    buildAll(theme, dir);
    rmSync(join(dir, "components", "button"), { recursive: true, force: true });

    const errors = validateAll(theme, dir);
    expect(errors.join("\n")).toMatch(/button: no variant directory/);
    rmSync(dir, { recursive: true, force: true });
  });
```

Make sure the file's imports include `mkdtempSync`, `writeFileSync`, `rmSync`, `readFileSync`, `tmpdir`, and `buildAll`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/validate.test.ts`
Expected: FAIL — three assertions find no matching error text.

- [ ] **Step 3: Write the implementation**

In `src/validate.ts`, add this function above `validateAll`:

```ts
function checkVariants(
  componentsDir: string,
  sheetFile: string,
  errors: string[],
  checks: ThemeChecks,
): void {
  const name = sheetFile.replace(/\.excalidraw$/, "");
  const dir = join(componentsDir, name);

  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".excalidraw")).sort();
  } catch {
    errors.push(`${name}: no variant directory`);
    return;
  }
  if (files.length === 0) {
    errors.push(`${name}: variant directory is empty`);
    return;
  }

  const seen: string[] = [];

  for (const file of files) {
    const where = `${name}/${file}`;
    const scene = JSON.parse(readFileSync(join(dir, file), "utf8")) as Record<string, unknown>;
    const elements = (scene.elements ?? []) as El[];

    checkElements(where, elements, errors, checks);

    const xs = elements.map((e) => Number(e.x));
    const ys = elements.map((e) => Number(e.y));
    if (elements.length > 0 && (Math.min(...xs) !== 0 || Math.min(...ys) !== 0)) {
      errors.push(`${where}: bounding box does not start at the origin`);
    }

    for (const el of elements) seen.push(String(el.id));
  }

  // The sheet is the union of the variants. Without this, a component can drop a
  // shape from one variant and nothing else notices.
  const sheet = JSON.parse(readFileSync(join(componentsDir, sheetFile), "utf8")) as Record<string, unknown>;
  const sheetIds = ((sheet.elements ?? []) as El[]).map((e) => String(e.id)).sort();
  if (seen.sort().join(",") !== sheetIds.join(",")) {
    errors.push(`${name}: variants do not partition the sheet`);
  }
}
```

Then call it from `validateAll`, inside the existing `for (const file of files)` loop, after `checkElements(file, ...)`:

```ts
    checkVariants(componentsDir, file, errors, checks);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/validate.test.ts && npm run validate`
Expected: vitest PASS; `npm run validate` reports no errors on the real `dist/`.

- [ ] **Step 5: Commit**

```bash
npm run check
git add src/validate.ts tests/validate.test.ts
git commit -m "feat: validate variant files and the sheet partition"
```

---

### Tasks 4–9: Migrate the 58 components

Six batches, same procedure. Each batch is a commit and a review point.

**Procedure for one component:**

1. Read the component and find its repeated blocks — usually a `forEach` over a local `variants`/`states` array, or hand-written stanzas at increasing `y`.
2. Give each block a slug: the first or most neutral is `default`; the others describe the state (`secondary`, `disabled`, `checked`, `error`, `open`, `with-icon`).
3. Collect each block's elements into its own array and return `variants([...])`.
4. If a component has no meaningful split (a calendar, a table), return `variants([{ name: "default", elements: els }])`.
5. **Never change element construction order.** The sheet is the concatenation, and reordering changes ids, `seed`s, and `index`es, breaking byte-identical output.

**Worked example** — `src/components/button.ts` before:

```ts
export default function button(theme: Theme): ExcalidrawElement[] {
  const f = new Factory("button", theme);
  const els: ExcalidrawElement[] = [];

  const variants = [
    { text: "Click me!", fill: color.accent, ink: color.accentText, shadow: true },
    { text: "Secondary", fill: color.surface, ink: color.ink, shadow: true },
    { text: "Disabled", fill: color.muted, ink: color.mutedText, shadow: false },
  ];

  variants.forEach((v, i) => {
    const y = i * (H + GAP);
    els.push(...inkBox(f, { x: 0, y, w: W, h: H, fill: v.fill, shadow: v.shadow }));
    els.push(...label(f, { x: W / 2, y: y + (H - size.fontMd * 1.25) / 2, text: v.text, fontSize: size.fontMd, fontFamily: font.heading, stroke: v.ink, align: "center" }));
  });

  return els;
}
```

after:

```ts
import { variants, type ComponentOutput } from "../variants.js";

export default function button(theme: Theme): ComponentOutput {
  const f = new Factory("button", theme);

  const specs = [
    { name: "default",   text: "Click me!", fill: color.accent,  ink: color.accentText, shadow: true },
    { name: "secondary", text: "Secondary", fill: color.surface, ink: color.ink,        shadow: true },
    { name: "disabled",  text: "Disabled",  fill: color.muted,   ink: color.mutedText,  shadow: false },
  ];

  return variants(specs.map((v, i) => {
    const y = i * (H + GAP);
    return {
      name: v.name,
      elements: [
        ...inkBox(f, { x: 0, y, w: W, h: H, fill: v.fill, shadow: v.shadow }),
        ...label(f, { x: W / 2, y: y + (H - size.fontMd * 1.25) / 2, text: v.text, fontSize: size.fontMd, fontFamily: font.heading, stroke: v.ink, align: "center" }),
      ],
    };
  }));
}
```

Note the local array is renamed `specs` — `variants` is now the imported helper.

**Verification after each batch (same steps every time):**

- [ ] Run `npm run build`
- [ ] Run `git diff --stat dist/components/*.excalidraw dist/comic-ui.excalidrawlib` — expected: **empty**. Any change means construction order moved; fix it before continuing.
- [ ] Run `npm run validate` — expected: no errors, which proves each new variant sits at origin and partitions its sheet.
- [ ] Run `npm test` — expected: PASS.
- [ ] Commit: `git add src/components dist && git commit -m "refactor: declare variants for <batch> components"`

### Task 4: Batch 1

**Files:** Modify `src/components/{accordion,alert,alert-dialog,aspect-ratio,attachment,avatar,badge,breadcrumb,bubble,button}.ts`

- [ ] Convert each of the ten to return `variants([...])`, following the procedure above
- [ ] Run the batch verification steps
- [ ] Commit

### Task 5: Batch 2

**Files:** Modify `src/components/{button-group,calendar,card,carousel,chart,checkbox-group,collapsible,combobox,command,context-menu}.ts`

- [ ] Convert each of the ten
- [ ] Run the batch verification steps
- [ ] Commit

### Task 6: Batch 3

**Files:** Modify `src/components/{date-picker,dialog,drawer,dropdown-menu,empty,field,hover-card,input,input-group,input-otp}.ts`

- [ ] Convert each of the ten. `input` is the origin-normalisation case: its focus ring starts at `x=-4`, so check `dist/components/input/focused.excalidraw` (or whatever you name that state) begins at `(0, 0)`
- [ ] Run the batch verification steps
- [ ] Commit

### Task 7: Batch 4

**Files:** Modify `src/components/{item,kbd,label,marker,menubar,message,navigation-menu,pagination,popover,progress}.ts`

- [ ] Convert each of the ten
- [ ] Run the batch verification steps
- [ ] Commit

### Task 8: Batch 5

**Files:** Modify `src/components/{radio-group,resizable,scroll-area,select,separator,sheet,sidebar,skeleton,slider}.ts`

- [ ] Convert each of the nine. In `sheet.ts` the imported helper and the component share a concept but not a name — import `variants`, keep the default export named `sheet`
- [ ] Run the batch verification steps
- [ ] Commit

### Task 9: Batch 6

**Files:** Modify `src/components/{spinner,switch,table,tabs,textarea,toast,toggle,toggle-group,tooltip}.ts`

- [ ] Convert each of the nine
- [ ] Run the batch verification steps
- [ ] Commit

---

### Task 10: Require `ComponentOutput`

With all 58 migrated, the bridge comes out so a future component cannot skip declaring variants.

**Files:**
- Modify: `src/registry.ts`, `src/build.ts`, `src/variants.ts`
- Test: `tests/variants.test.ts`, `tests/components.test.ts`

**Interfaces:**
- Produces: `type ComponentBuilder = (theme: Theme) => ComponentOutput`. `toOutput` no longer exists.

- [ ] **Step 1: Write the failing test**

In `tests/components.test.ts`:

```ts
  it("every component declares at least one variant", () => {
    for (const [name, entry] of Object.entries(registry)) {
      const output = entry.build(theme);
      expect(Array.isArray(output), `${name} still returns a bare array`).toBe(false);
      expect(output.variants.length, name).toBeGreaterThan(0);
    }
  });
```

Delete the two `toOutput` tests from `tests/variants.test.ts`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components.test.ts`
Expected: FAIL — TypeScript still permits an array, and the assertion catches any component missed in batches 1–6.

- [ ] **Step 3: Write the implementation**

- In `src/registry.ts`: `export type ComponentBuilder = (theme: Theme) => ComponentOutput;`
- In `src/build.ts`: drop the `toOutput` import and use `const output = entry.build(theme);`
- In `src/variants.ts`: delete `toOutput`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run check`
Expected: build succeeds, validation clean, all tests PASS, and `git diff --stat dist` is empty.

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "refactor: require every component to declare its variants"
```

---

### Task 11: Library resolution for the plugin scripts

The first plugin code: find the library, load a variant, measure it, list what exists.

**Files:**
- Create: `scripts/library.mjs`
- Test: `tests/library.test.ts`

**Interfaces:**
- Produces:
  - `resolveRoot({ configPath?, pluginRoot?, env? }): string`
  - `ensureLibrary({ needsToolchain, ...opts }): Promise<string>`
  - `componentsDir(root, preset?): string`
  - `loadVariant(root, preset, component, variant): { elements: object[], appState: object }`
  - `measure(elements): { width: number, height: number }`
  - `listComponents(root, preset?): Array<{ name: string, variants: Array<{ name: string, width: number, height: number }> }>`

- [ ] **Step 1: Write the failing test**

```ts
// tests/library.test.ts
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { componentsDir, listComponents, loadVariant, measure, resolveRoot } from "../scripts/library.mjs";

const ROOT = join(import.meta.dirname, "..");
let fake: string;

beforeAll(() => {
  fake = mkdtempSync(join(tmpdir(), "lib-"));
  mkdirSync(join(fake, "dist", "components", "widget"), { recursive: true });
  writeFileSync(join(fake, "dist", "comic-ui.excalidrawlib"), "{}");
  writeFileSync(join(fake, "dist", "components", "widget", "default.excalidraw"), JSON.stringify({
    elements: [{ id: "a", x: 0, y: 0, width: 30, height: 10 }, { id: "b", x: 10, y: 5, width: 30, height: 20 }],
    appState: { gridSize: null, viewBackgroundColor: "#ffffff" },
  }));
});

afterAll(() => rmSync(fake, { recursive: true, force: true }));

describe("resolveRoot", () => {
  it("prefers a config file that points at a real library", () => {
    const cfg = join(fake, "cfg.json");
    writeFileSync(cfg, JSON.stringify({ path: fake }));
    expect(resolveRoot({ configPath: cfg, pluginRoot: ROOT })).toBe(fake);
  });

  it("falls back to the plugin root when no config exists", () => {
    expect(resolveRoot({ configPath: join(fake, "missing.json"), pluginRoot: ROOT })).toBe(ROOT);
  });

  it("explains what to do when nothing has a dist directory", () => {
    const empty = mkdtempSync(join(tmpdir(), "empty-"));
    expect(() => resolveRoot({ configPath: join(empty, "none.json"), pluginRoot: empty }))
      .toThrow(/excalidraw-lib\.json/);
    rmSync(empty, { recursive: true, force: true });
  });
});

describe("componentsDir", () => {
  it("uses dist/components for the default preset", () => {
    expect(componentsDir(fake)).toBe(join(fake, "dist", "components"));
  });

  it("uses dist/<preset>/components for a named preset", () => {
    expect(componentsDir(fake, "soft")).toBe(join(fake, "dist", "soft", "components"));
  });

  it("says how to build a preset that is not there", () => {
    expect(() => loadVariant(fake, "soft", "widget", "default"))
      .toThrow(/npm run build -- --preset soft/);
  });
});

describe("loadVariant", () => {
  it("returns elements and appState", () => {
    const { elements, appState } = loadVariant(fake, undefined, "widget", "default");
    expect(elements).toHaveLength(2);
    expect(appState.viewBackgroundColor).toBe("#ffffff");
  });

  it("lists the available variants when one is unknown", () => {
    expect(() => loadVariant(fake, undefined, "widget", "nope")).toThrow(/default/);
  });

  it("suggests near matches when the component is unknown", () => {
    expect(() => loadVariant(fake, undefined, "widgets", "default")).toThrow(/widget/);
  });
});

describe("measure", () => {
  it("returns the bounding box of the elements", () => {
    expect(measure([{ x: 0, y: 0, width: 30, height: 10 }, { x: 10, y: 5, width: 30, height: 20 }]))
      .toEqual({ width: 40, height: 25 });
  });
});

describe("listComponents", () => {
  it("reports each component's variants with sizes", () => {
    expect(listComponents(fake)).toEqual([
      { name: "widget", variants: [{ name: "default", width: 40, height: 25 }] },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/library.test.ts`
Expected: FAIL — cannot resolve `../scripts/library.mjs`.

- [ ] **Step 3: Write the implementation**

```js
// scripts/library.mjs
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
export const PLUGIN_ROOT = join(HERE, "..");
export const CONFIG_PATH = join(homedir(), ".claude", "excalidraw-lib.json");

const MARKER = join("dist", "comic-ui.excalidrawlib");

function isLibrary(dir) {
  return typeof dir === "string" && existsSync(join(dir, MARKER));
}

function candidates() {
  return [process.cwd(), homedir(), join(homedir(), "Dev")]
    .flatMap((base) => {
      if (isLibrary(base)) return [base];
      try {
        return readdirSync(base, { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => join(base, e.name))
          .filter(isLibrary);
      } catch {
        return [];
      }
    });
}

/**
 * 1. the config file, 2. the plugin's own root (dist/ is committed, so composing
 * needs no setup), 3. fail with the exact fix.
 */
export function resolveRoot({ configPath = CONFIG_PATH, pluginRoot = PLUGIN_ROOT } = {}) {
  if (existsSync(configPath)) {
    const configured = JSON.parse(readFileSync(configPath, "utf8")).path;
    if (isLibrary(configured)) return configured;
  }
  if (isLibrary(pluginRoot)) return pluginRoot;

  const found = candidates();
  const hint = found.length > 0 ? ` Found a candidate at ${found[0]}.` : "";
  throw new Error(
    `No component library found. Write {"path": "/path/to/excalidraw-components-library"} ` +
    `to ${configPath}, or run npm run build in a clone.${hint}`,
  );
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`))));
  });
}

/**
 * Preflight for both skills. Installing is only ever done in a directory whose
 * package name matches the plugin's own — derived, never hardcoded — and which
 * carries the library's source and output.
 */
export async function ensureLibrary({ needsToolchain = false, configPath, pluginRoot = PLUGIN_ROOT } = {}) {
  const root = resolveRoot({ configPath, pluginRoot });
  if (!needsToolchain) return root;

  const expected = JSON.parse(readFileSync(join(pluginRoot, "package.json"), "utf8")).name;
  const pkgPath = join(root, "package.json");
  const found = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, "utf8")).name : undefined;
  if (found !== expected || !existsSync(join(root, "src", "build.ts"))) {
    throw new Error(`${root} is not an ${expected} clone, so it cannot build presets.`);
  }
  if (root === pluginRoot && !existsSync(join(root, ".git"))) {
    throw new Error(
      `${root} is the installed plugin copy. Preset output belongs in a clone you can commit; ` +
      `point ${CONFIG_PATH} at one.`,
    );
  }
  if (!existsSync(join(root, "node_modules"))) {
    await run("npm", ["install"], { cwd: root });
  }
  return root;
}

export function componentsDir(root, preset) {
  return preset === undefined || preset === "default"
    ? join(root, "dist", "components")
    : join(root, "dist", preset, "components");
}

export function measure(elements) {
  const xs = elements.map((e) => e.x);
  const ys = elements.map((e) => e.y);
  const right = elements.map((e) => e.x + (e.width ?? 0));
  const bottom = elements.map((e) => e.y + (e.height ?? 0));
  return { width: Math.max(...right) - Math.min(...xs), height: Math.max(...bottom) - Math.min(...ys) };
}

function near(name, available) {
  const close = available.filter((a) => a.startsWith(name.slice(0, 3)) || name.startsWith(a.slice(0, 3)));
  return (close.length > 0 ? close : available).slice(0, 5).join(", ");
}

export function loadVariant(root, preset, component, variant = "default") {
  const dir = componentsDir(root, preset);
  if (!existsSync(dir)) {
    throw new Error(`No build at ${dir}. Run: npm run build -- --preset ${preset}`);
  }

  const componentDir = join(dir, component);
  if (!existsSync(componentDir)) {
    const available = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
    throw new Error(`Unknown component "${component}". Closest: ${near(component, available)}`);
  }

  const file = join(componentDir, `${variant}.excalidraw`);
  if (!existsSync(file)) {
    const available = readdirSync(componentDir).map((f) => f.replace(/\.excalidraw$/, ""));
    throw new Error(`Unknown variant "${variant}" for "${component}". Available: ${available.join(", ")}`);
  }

  const scene = JSON.parse(readFileSync(file, "utf8"));
  return { elements: scene.elements, appState: scene.appState };
}

export function listComponents(root, preset) {
  const dir = componentsDir(root, preset);
  if (!existsSync(dir)) {
    throw new Error(`No build at ${dir}. Run: npm run build -- --preset ${preset}`);
  }
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .map((name) => ({
      name,
      variants: readdirSync(join(dir, name))
        .filter((f) => f.endsWith(".excalidraw"))
        .map((f) => f.replace(/\.excalidraw$/, ""))
        .sort()
        .map((variant) => ({ name: variant, ...measure(loadVariant(root, preset, name, variant).elements) })),
    }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/library.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/library.mjs tests/library.test.ts
git commit -m "feat: resolve and read the component library from plain node"
```

---

### Task 12: The composer

Layout document in, scene file out.

**Files:**
- Create: `scripts/compose.mjs`
- Test: `tests/compose.test.ts`

**Interfaces:**
- Consumes: `loadVariant`, `measure`, `listComponents`, `resolveRoot` from `scripts/library.mjs`.
- Produces: `compose(layout, { root, preset }): object` (a full Excalidraw scene), `parseArgs(argv): { command, layoutPath, outPath, preset }`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/compose.test.ts
import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { compose, parseArgs } from "../scripts/compose.mjs";

const root = join(import.meta.dirname, "..");
const leaf = (component: string, variant?: string) => ({ component, ...(variant ? { variant } : {}) });

describe("compose", () => {
  it("stacks a column with gaps", () => {
    const scene = compose({ type: "column", gap: 10, children: [leaf("button"), leaf("button")] }, { root });
    const ys = scene.elements.map((e: { y: number }) => e.y);
    const first = scene.elements.filter((e: { groupIds: string[] }) => e.groupIds[0] === scene.elements[0].groupIds[0]);
    const firstHeight = Math.max(...first.map((e: { y: number; height: number }) => e.y + e.height));
    expect(Math.min(...ys)).toBe(0);
    expect(ys.some((y) => y >= firstHeight + 10)).toBe(true);
  });

  it("centres children on the cross axis", () => {
    const scene = compose(
      { type: "column", gap: 0, align: "center", children: [leaf("button"), leaf("dialog")] },
      { root },
    );
    const groups = [...new Set(scene.elements.map((e: { groupIds: string[] }) => e.groupIds[0]))];
    const centreOf = (g: string) => {
      const els = scene.elements.filter((e: { groupIds: string[] }) => e.groupIds[0] === g);
      const left = Math.min(...els.map((e: { x: number }) => e.x));
      const right = Math.max(...els.map((e: { x: number; width: number }) => e.x + e.width));
      return (left + right) / 2;
    };
    expect(centreOf(groups[0]!)).toBeCloseTo(centreOf(groups[1]!), 5);
  });

  it("gives repeated components separate groups and unique ids", () => {
    const scene = compose({ type: "row", children: [leaf("button"), leaf("button")] }, { root });
    const ids = scene.elements.map((e: { id: string }) => e.id);
    const groups = new Set(scene.elements.map((e: { groupIds: string[] }) => e.groupIds[0]));
    expect(new Set(ids).size).toBe(ids.length);
    expect(groups.size).toBe(2);
  });

  it("emits strictly ascending index values", () => {
    const scene = compose({ type: "row", children: [leaf("button"), leaf("input")] }, { root });
    const indexes = scene.elements.map((e: { index: string }) => e.index);
    expect([...indexes].sort()).toEqual(indexes);
    expect(new Set(indexes).size).toBe(indexes.length);
  });

  it("is deterministic", () => {
    const layout = { type: "column", children: [leaf("button"), leaf("input")] };
    expect(JSON.stringify(compose(layout, { root }))).toBe(JSON.stringify(compose(layout, { root })));
  });

  it("carries appState from the library", () => {
    const scene = compose(leaf("button"), { root });
    expect(scene.appState.viewBackgroundColor).toMatch(/^#/);
    expect(scene.type).toBe("excalidraw");
  });

  it("rejects an unknown key", () => {
    expect(() => compose({ componnet: "button" } as never, { root })).toThrow(/componnet/);
  });

  it("rejects an empty container", () => {
    expect(() => compose({ type: "column", children: [] }, { root })).toThrow(/at least one child/);
  });

  it("rejects an unknown align value", () => {
    expect(() => compose({ type: "row", align: "middle", children: [leaf("button")] } as never, { root }))
      .toThrow(/align/);
  });
});

describe("parseArgs", () => {
  it("parses a compose invocation", () => {
    expect(parseArgs(["layout.json", "-o", "out.excalidraw", "--preset", "soft"]))
      .toEqual({ command: "compose", layoutPath: "layout.json", outPath: "out.excalidraw", preset: "soft" });
  });

  it("parses list", () => {
    expect(parseArgs(["list"])).toEqual({ command: "list", preset: undefined });
  });

  it("requires an output path", () => {
    expect(() => parseArgs(["layout.json"])).toThrow(/-o/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/compose.test.ts`
Expected: FAIL — cannot resolve `../scripts/compose.mjs`.

- [ ] **Step 3: Write the implementation**

```js
// scripts/compose.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { listComponents, loadVariant, measure, resolveRoot } from "./library.mjs";

const LEAF_KEYS = new Set(["component", "variant"]);
const CONTAINER_KEYS = new Set(["type", "gap", "align", "children"]);
const ALIGNS = new Set(["start", "center", "end"]);

function check(node) {
  if (node === null || typeof node !== "object" || Array.isArray(node)) {
    throw new Error(`Layout node must be an object, got ${JSON.stringify(node)}`);
  }

  if ("component" in node) {
    for (const key of Object.keys(node)) {
      if (!LEAF_KEYS.has(key)) throw new Error(`Unknown key "${key}" on a component node.`);
    }
    return;
  }

  if (node.type !== "row" && node.type !== "column") {
    throw new Error(`Node must have "component", or "type" of "row" or "column". Got ${JSON.stringify(node)}`);
  }
  for (const key of Object.keys(node)) {
    if (!CONTAINER_KEYS.has(key)) throw new Error(`Unknown key "${key}" on a ${node.type} node.`);
  }
  if (node.align !== undefined && !ALIGNS.has(node.align)) {
    throw new Error(`Unknown align "${node.align}". Use start, center or end.`);
  }
  if (!Array.isArray(node.children) || node.children.length === 0) {
    throw new Error(`A ${node.type} needs at least one child.`);
  }
  node.children.forEach(check);
}

/** Bottom-up sizing. Returns a tree mirroring the layout with sizes attached. */
function size(node, load) {
  if ("component" in node) {
    const { elements } = load(node.component, node.variant ?? "default");
    return { node, elements, ...measure(elements) };
  }

  const gap = node.gap ?? 24;
  const children = node.children.map((child) => size(child, load));
  const along = children.reduce((sum, c) => sum + (node.type === "row" ? c.width : c.height), 0)
    + gap * (children.length - 1);
  const across = Math.max(...children.map((c) => (node.type === "row" ? c.height : c.width)));

  return node.type === "row"
    ? { node, children, gap, width: along, height: across }
    : { node, children, gap, width: across, height: along };
}

/** Top-down placement. Returns [{ elements, x, y }] for every leaf. */
function place(sized, x, y, out) {
  if (sized.elements) {
    out.push({ elements: sized.elements, x, y });
    return out;
  }

  const align = sized.node.align ?? "start";
  const offset = (childExtent, containerExtent) =>
    align === "center" ? (containerExtent - childExtent) / 2
    : align === "end" ? containerExtent - childExtent
    : 0;

  let cursor = 0;
  for (const child of sized.children) {
    if (sized.node.type === "row") {
      place(child, x + cursor, y + offset(child.height, sized.height), out);
      cursor += child.width + sized.gap;
    } else {
      place(child, x + offset(child.width, sized.width), y + cursor, out);
      cursor += child.height + sized.gap;
    }
  }
  return out;
}

const suffix = (n) => n.toString(36).padStart(4, "0");
const indexAt = (n) => `a${n.toString(36).padStart(5, "0")}V`;

export function compose(layout, { root = resolveRoot(), preset } = {}) {
  check(layout);

  let appState;
  const load = (component, variant) => {
    const loaded = loadVariant(root, preset, component, variant);
    appState ??= loaded.appState;
    return loaded;
  };

  const placements = place(size(layout, load), 0, 0, []);
  const elements = [];

  placements.forEach((placement, instance) => {
    const tag = suffix(instance);
    for (const element of placement.elements) {
      elements.push({
        ...element,
        // Per-instance suffix on both id and group: two buttons must stay two groups,
        // not merge into one selection.
        id: `${element.id}-${tag}`,
        groupIds: element.groupIds.map((group) => `${group}-${tag}`),
        x: element.x + placement.x,
        y: element.y + placement.y,
        index: indexAt(elements.length),
      });
    }
  });

  return {
    type: "excalidraw",
    version: 2,
    source: "excalidraw-comic-components",
    elements,
    appState,
    files: {},
  };
}

export function parseArgs(argv) {
  const preset = argv.includes("--preset") ? argv[argv.indexOf("--preset") + 1] : undefined;
  if (argv.includes("--preset") && (preset === undefined || preset.startsWith("--"))) {
    throw new Error("--preset requires a preset name.");
  }

  if (argv[0] === "list") return { command: "list", preset };

  const layoutPath = argv[0];
  if (layoutPath === undefined || layoutPath.startsWith("-")) {
    throw new Error("Usage: compose.mjs <layout.json> -o <out.excalidraw> [--preset <name>]");
  }

  const flag = argv.indexOf("-o");
  const outPath = flag === -1 ? undefined : argv[flag + 1];
  if (outPath === undefined) throw new Error("An output path is required: -o <out.excalidraw>");

  return { command: "compose", layoutPath, outPath, preset };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const root = resolveRoot();

    if (args.command === "list") {
      for (const component of listComponents(root, args.preset)) {
        const variants = component.variants.map((v) => `${v.name} (${v.width}x${v.height})`).join(", ");
        console.log(`${component.name}: ${variants}`);
      }
    } else {
      const layout = JSON.parse(readFileSync(args.layoutPath, "utf8"));
      const scene = compose(layout, { root, preset: args.preset });
      mkdirSync(dirname(args.outPath), { recursive: true });
      writeFileSync(args.outPath, `${JSON.stringify(scene, null, 2)}\n`);
      console.log(`Wrote ${scene.elements.length} elements to ${args.outPath}`);
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/compose.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Compose a real scene by hand**

```bash
cat > /tmp/login.layout.json <<'JSON'
{ "type": "column", "gap": 24, "align": "center", "children": [
    { "component": "label" },
    { "component": "input" },
    { "component": "button" } ] }
JSON
node scripts/compose.mjs /tmp/login.layout.json -o /tmp/login.excalidraw
node scripts/compose.mjs list | head -5
```
Expected: an element count printed, then a component listing with sizes. Open `/tmp/login.excalidraw` in Excalidraw and confirm three stacked widgets, centred, no overlap.

- [ ] **Step 6: Commit**

```bash
git add scripts/compose.mjs tests/compose.test.ts
git commit -m "feat: compose scenes from row and column layouts"
```

---

### Task 13: Plugin metadata and skills

**Files:**
- Create: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`
- Create: `scripts/ensure-library.mjs`
- Create: `skills/composing-scenes/SKILL.md`, `skills/building-presets/SKILL.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: `ensureLibrary` from `scripts/library.mjs`; the `compose.mjs` CLI.
- Produces: a plugin installable with `/plugin marketplace add <repo path>`.

- [ ] **Step 1: Write the metadata**

```json
// .claude-plugin/plugin.json
{
  "name": "excalidraw-comic",
  "version": "0.1.0",
  "description": "Compose Excalidraw mockups from the comic component library, and build style presets",
  "author": { "name": "guido" }
}
```

```json
// .claude-plugin/marketplace.json
{
  "name": "excalidraw-comic-marketplace",
  "owner": { "name": "guido" },
  "plugins": [
    {
      "name": "excalidraw-comic",
      "source": "./",
      "description": "Compose Excalidraw mockups from the comic component library, and build style presets"
    }
  ]
}
```

- [ ] **Step 2: Write the preflight CLI**

```js
// scripts/ensure-library.mjs
import { ensureLibrary } from "./library.mjs";

const needsToolchain = process.argv.includes("--toolchain");

try {
  console.log(await ensureLibrary({ needsToolchain }));
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
```

- [ ] **Step 3: Write the composing skill**

````markdown
---
name: composing-scenes
description: Use when mocking up a screen, wireframe, or UI sketch with the hand-drawn Excalidraw comic components — composes a .excalidraw scene from row and column layouts.
---

# Composing Excalidraw Scenes

Build a `.excalidraw` mockup out of the comic component library. The user opens the
result in Excalidraw with **Menu → Open**.

## Workflow

1. Find the library and see what exists:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/compose.mjs" list
   ```

   Prints every component, its variants, and their pixel sizes. Use real names from
   this output — never guess one.

2. Write a layout file next to where the scene will go, e.g. `mockups/login.layout.json`:

   ```json
   { "type": "column", "gap": 24, "align": "center", "children": [
       { "component": "label" },
       { "component": "input" },
       { "type": "row", "gap": 16, "children": [
           { "component": "button", "variant": "secondary" },
           { "component": "button" } ] } ] }
   ```

   - A leaf is `{ "component": "<name>", "variant": "<name>" }`. Omitting `variant`
     means `default`.
   - A container is `{ "type": "row" | "column", "gap": 24, "align": "start",
     "children": [...] }`. `align` is the cross axis: `start`, `center`, or `end`.
   - Containers nest. The root may be either kind.

3. Compose:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/compose.mjs" mockups/login.layout.json -o mockups/login.excalidraw
   ```

4. Tell the user the path and that it opens via **Menu → Open**. Keep the layout file —
   revising the mockup is a one-line edit and a re-run.

## Limits, state them rather than working around them

- **Text is fixed.** Components carry stock labels ("Click me!", "your@email.com").
  Changing them means editing in Excalidraw after opening. Do not hand-edit the scene
  JSON to fake it.
- **Rows and columns only.** No overlap, no absolute coordinates, no z-order.
- **One widget per leaf.** `{"component": "button"}` is the default variant, not the
  three-button sheet.

## Presets

Add `--preset <name>` to both commands to compose from a built style preset. If the
preset has not been built the error says which command to run — pass that to the
building-presets skill.

## Errors

Every message names the fix. Unknown component → closest matches. Unknown variant →
that component's variants. No library found → write `{"path": "..."}` to
`~/.claude/excalidraw-lib.json`; ask the user where their clone is rather than guessing.
````

- [ ] **Step 4: Write the preset skill**

````markdown
---
name: building-presets
description: Use when creating or building a style preset for the Excalidraw comic components — wraps npm run preset, build, and validate.
---

# Building Style Presets

A preset picks five things and the build resolves them into every element. This skill
runs the library's own CLIs; it does not offer style advice.

## Preflight

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/ensure-library.mjs" --toolchain
```

Prints the library root and installs `node_modules` on first use. If it fails, the
message says what is missing — a path in `~/.claude/excalidraw-lib.json`, or a clone
to point it at. Run every later command from the printed root.

## Fields

| field | values |
|---|---|
| `strokeWidth` | `bold` (4/2/1) · `medium` (2/1/1) · `thin` (1/1/1) |
| `sloppiness` | `architect` (0) · `artist` (1) · `cartoonist` (2, default) |
| `edges` | `sharp` · `round` (default) |
| `font` | `excalifont` (default) · `comic-shanns` · `nunito` — body text only |
| `palette` | `neutral` · `stone` · `zinc` (default) · `mauve` · `olive` · `mist` · `taupe` |

## Commands

```bash
npm run preset -- --name soft --palette stone --edges sharp   # writes presets/soft.json
npm run build -- --preset soft                                 # writes dist/soft/
npm run validate -- --preset soft                              # checks dist/soft/
npm run build -- --all                                         # every preset
```

`npm run preset` with no flags prompts interactively — only use that form when the
user is at the terminal.

## Naming rules

- The filename and the `name` field must match; the filename is what `--preset`
  selects, the field picks the output directory.
- A name must be a plain path segment: `[a-z0-9][a-z0-9-]*`.
- `components` and `comic-ui` are reserved — they collide with the default preset's
  own output paths.

Report what the CLIs print. Do not paraphrase their errors.
````

- [ ] **Step 5: Update the README**

Add a section after **Styles**:

```markdown
## Use it from Claude Code

The repo is also a Claude Code plugin:

```bash
/plugin marketplace add /path/to/excalidraw-components-library
```

Two skills come with it. **composing-scenes** builds a `.excalidraw` mockup from a
row/column layout — ask for "a login screen with the comic components". **building-presets**
wraps the preset and build CLIs.

The composer works with no configuration, using the `dist/` committed here. To compose
from a clone you build yourself, point it at that clone:

```json
// ~/.claude/excalidraw-lib.json
{ "path": "/path/to/your/clone" }
```

Compose by hand without Claude:

```bash
node scripts/compose.mjs list
node scripts/compose.mjs mockups/login.layout.json -o mockups/login.excalidraw
```
```

- [ ] **Step 6: Verify the plugin loads**

```bash
node scripts/ensure-library.mjs
node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json')); JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json')); console.log('metadata parses')"
```
Then in a Claude Code session: `/plugin marketplace add .` and confirm both skills appear in `/help`.

- [ ] **Step 7: Commit**

```bash
npm run check
git add .claude-plugin skills scripts/ensure-library.mjs README.md
git commit -m "feat: ship the library as a Claude Code plugin with two skills"
```

---

## Self-Review

**Spec coverage.** Plugin shape → Task 13. Path resolution and preflight → Tasks 11, 13. Variant declaration → Tasks 1, 4–10. Variant output and normalisation → Task 2. Validation and the partition invariant → Task 3. Layout schema, CLI, algorithm, errors → Task 12. Skills → Task 13. Testing → spread across each task's tests.

**Deviations from the spec, deliberate:** the helper is `variants()` in `src/variants.ts`, not `sheet()` in `comic.ts`, because `sheet` is already a component name. `toOutput` is a temporary bridge so the 58-file migration can land in reviewable batches; Task 10 removes it, and the end state matches the spec exactly.

**Type consistency.** `ComponentOutput`, `Variant`, `variants()`, `normalize()`, `toOutput()` defined in Task 1 and used under those names in Tasks 2, 4–10. `resolveRoot`, `ensureLibrary`, `componentsDir`, `loadVariant`, `measure`, `listComponents` defined in Task 11 and consumed under those names in Tasks 12 and 13. `compose(layout, { root, preset })` and `parseArgs(argv)` defined in Task 12 and used by the skill in Task 13.
