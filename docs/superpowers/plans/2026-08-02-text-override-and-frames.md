# Text Override and Frames Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a layout file replace a component's baked-in strings and wrap groups of children in bordered, padded panels, so composed scenes can look like a specific screen instead of a pile of generic widgets.

**Architecture:** Two new plain-Node modules under `scripts/` — `text.mjs` (validate a `text` spec, recover the font metric, rewrite geometry) and `frame.mjs` (validate a `frame` spec, sample panel styling from loaded components, emit the panel elements). `scripts/compose.mjs` wires both into its existing `check` → `size` → `place` pipeline. Nothing in `src/` changes and `dist/` is not rebuilt.

**Tech Stack:** Node ESM (`.mjs`, no build step, no dependencies), Vitest with TypeScript test files that import the `.mjs` modules directly.

## Global Constraints

- **Do not modify anything under `src/`, `presets/`, or `dist/`.** Both features are compose-time only. If a task seems to need a rebuild, the design is being misread.
- **No new runtime dependencies.** `scripts/*.mjs` import only `node:` builtins and each other.
- Every error message names the fix, matching the existing style in `compose.mjs` and `library.mjs`.
- Font metric fallback when it cannot be recovered: `advance = 0.55`.
- Frame default padding: `16`. Label height: `fontSize * 1.25` (matches `Factory.text`, `src/element.ts:242`).
- Style fallbacks when no component supplies a sample: `strokeColor "#18181b"`, `strokeWidth 1`, `roughness 2`, `roundness {"type":3}`, `fillStyle "solid"`, `fontFamily 7`, `fontSize 20`.
- Run the full suite with `npm test`. A single file: `npx vitest run tests/text.test.ts`.
- Spec: `docs/superpowers/specs/2026-08-01-text-override-and-frames-design.md`.

## File Structure

| File | Responsibility |
|---|---|
| `scripts/text.mjs` | **Create.** Pure geometry and validation for text replacement. No filesystem access. |
| `scripts/frame.mjs` | **Create.** Frame spec validation, style sampling, inset arithmetic, panel element emission. No filesystem access. |
| `scripts/compose.mjs` | **Modify.** Accept `text` on leaves and `frame` on containers; thread both through `check`/`size`/`place`. |
| `scripts/library.mjs` | **Modify.** `listComponents` reports each variant's current strings. |
| `tests/text.test.ts` | **Create.** Unit tests for `scripts/text.mjs`. |
| `tests/frame.test.ts` | **Create.** Unit tests for `scripts/frame.mjs`. |
| `tests/compose.test.ts` | **Modify.** Integration tests for both features through `compose()`. |
| `tests/library.test.ts` | **Modify.** Text slots appear in the listing. |
| `skills/composing-scenes/SKILL.md` | **Modify.** Document both features. |
| `mockups/gutenberg-post-edit.layout.json` | **Modify.** Regenerated with real labels and framed regions as the end-to-end proof. |

**Reference values from the current build** (verified, use these in tests):

```
dist/components/button/default.excalidraw   3 elements
  rectangle  x6 y6    w200 h56    (shadow)
  rectangle  x0 y0    w200 h56    (body)   strokeWidth 1  roughness 2  roundness {"type":3}  fillStyle "solid"
  text       x50.5 y15.5 w99 h25  "Click me!"  textAlign "center"  fontSize 20  fontFamily 7

dist/components/tabs/default.excalidraw     texts: "Preview", "Code", "Notes", "Panel content lives here."
dist/components/separator/horizontal.excalidraw   types text,line — has NO rectangle
```

---

### Task 1: Text module — validation and geometry

**Files:**
- Create: `scripts/text.mjs`
- Test: `tests/text.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `FALLBACK_ADVANCE: number`
  - `advanceOf(element: object): number`
  - `textSlots(elements: object[]): object[]` — text elements in array order
  - `normalizeText(spec: string | (string|null)[], texts: object[], label: string): (string|null)[]`
  - `applyText(elements: object[], spec: string | (string|null)[], label: string): object[]` — returns a new array; the single entry point `compose.mjs` uses

- [ ] **Step 1: Write the failing tests**

Create `tests/text.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { advanceOf, applyText, normalizeText, textSlots } from "../scripts/text.mjs";

const root = join(import.meta.dirname, "..");
const load = (component: string, variant: string) =>
  JSON.parse(readFileSync(join(root, "dist", "components", component, `${variant}.excalidraw`), "utf8"))
    .elements as Array<Record<string, any>>;

const button = () => load("button", "default");
const tabs = () => load("tabs", "default");

describe("advanceOf", () => {
  it("recovers the metric the build used", () => {
    const text = button().find((e) => e.type === "text")!;
    // width = len * fontSize * advance  ->  99 = 9 * 20 * 0.55
    expect(advanceOf(text)).toBeCloseTo(0.55, 6);
  });

  it("falls back when there is no text to measure", () => {
    expect(advanceOf({ type: "text", text: "", width: 0, fontSize: 20 })).toBe(0.55);
  });
});

describe("textSlots", () => {
  it("returns text elements in array order", () => {
    expect(textSlots(tabs()).map((e) => e.text)).toEqual([
      "Preview", "Code", "Notes", "Panel content lives here.",
    ]);
  });

  it("returns an empty list for a component with no text", () => {
    expect(textSlots([{ type: "rectangle" }])).toEqual([]);
  });
});

describe("applyText growing", () => {
  it("inserts the extra width at the old right edge", () => {
    // "Click me!" is 9 chars (99px), "Featured image" is 14 (154px), so delta = 55.
    const out = applyText(button(), "Featured image", "button/default");
    const body = out.find((e) => e.type === "rectangle" && e.x === 0)!;
    const shadow = out.find((e) => e.type === "rectangle" && e.x === 6)!;
    const text = out.find((e) => e.type === "text")!;
    expect(body.width).toBeCloseTo(255, 6);
    expect(shadow.width).toBeCloseTo(255, 6);
    expect(text.width).toBeCloseTo(154, 6);
    expect(text.text).toBe("Featured image");
    expect(text.originalText).toBe("Featured image");
  });

  it("keeps padding symmetric on centred text", () => {
    const out = applyText(button(), "Featured image", "button/default");
    const body = out.find((e) => e.type === "rectangle" && e.x === 0)!;
    const text = out.find((e) => e.type === "text")!;
    const left = text.x - body.x;
    const right = (body.x + body.width) - (text.x + text.width);
    expect(left).toBeCloseTo(right, 6);
  });

  it("leaves elements entirely left of the cut alone", () => {
    const elements = [
      { type: "rectangle", x: 0, y: 0, width: 10, height: 10 },
      { type: "text", x: 20, y: 0, width: 40, height: 25, fontSize: 20, text: "aaaa", textAlign: "left" },
    ];
    const out = applyText(elements, "aaaaaa", "x/y");
    expect(out[0]).toEqual(elements[0]);
  });

  it("shifts elements that start at or past the cut", () => {
    const elements = [
      { type: "text", x: 0, y: 0, width: 40, height: 25, fontSize: 20, text: "aaaa", textAlign: "left" },
      { type: "rectangle", x: 40, y: 0, width: 10, height: 10 },
    ];
    const out = applyText(elements, "aaaaaa", "x/y");
    expect(out[1].x).toBeCloseTo(60, 6); // delta = 20
  });

  it("scales a straddling line's points", () => {
    const elements = [
      { type: "text", x: 10, y: 0, width: 40, height: 25, fontSize: 20, text: "aaaa", textAlign: "left" },
      { type: "line", x: 0, y: 0, width: 100, height: 0, points: [[0, 0], [100, 0]] },
    ];
    const out = applyText(elements, "aaaaaa", "x/y");
    expect(out[1].width).toBeCloseTo(120, 6);
    expect(out[1].points).toEqual([[0, 0], [120, 0]]);
  });

  it("leaves a zero-width straddling line alone", () => {
    const elements = [
      { type: "text", x: 10, y: 0, width: 40, height: 25, fontSize: 20, text: "aaaa", textAlign: "left" },
      { type: "line", x: 20, y: 0, width: 0, height: 50, points: [[0, 0], [0, 50]] },
    ];
    const out = applyText(elements, "aaaaaa", "x/y");
    expect(out[1]).toEqual(elements[1]);
  });
});

describe("applyText shrinking", () => {
  const box = () => [
    { type: "rectangle", x: 0, y: 0, width: 200, height: 56 },
    { type: "text", x: 50, y: 15, width: 100, height: 25, fontSize: 20, text: "aaaaaaaaaa", textAlign: "center" },
  ];

  it("never shrinks the box", () => {
    const out = applyText(box(), "aaaaa", "x/y");
    expect(out[0].width).toBe(200);
  });

  it("re-anchors centred text on its old centre", () => {
    const out = applyText(box(), "aaaaa", "x/y"); // 100 -> 50, delta = -50
    expect(out[1].x).toBeCloseTo(75, 6);
    expect(out[1].width).toBeCloseTo(50, 6);
  });

  it("leaves left-aligned text where it is", () => {
    const elements = box();
    elements[1].textAlign = "left";
    expect(applyText(elements, "aaaaa", "x/y")[1].x).toBe(50);
  });

  it("keeps right-aligned text's right edge", () => {
    const elements = box();
    elements[1].textAlign = "right";
    const out = applyText(elements, "aaaaa", "x/y");
    expect(out[1].x + out[1].width).toBeCloseTo(150, 6);
  });
});

describe("applyText with several slots", () => {
  it("replaces positionally", () => {
    const out = applyText(tabs(), ["Post", "Block"], "tabs/default");
    expect(textSlots(out).map((e) => e.text)).toEqual([
      "Post", "Block", "Notes", "Panel content lives here.",
    ]);
  });

  it("skips nulls and holes", () => {
    const out = applyText(tabs(), [null, "Block"], "tabs/default");
    expect(textSlots(out).map((e) => e.text)).toEqual([
      "Preview", "Block", "Notes", "Panel content lives here.",
    ]);
  });

  it("does not mutate its input", () => {
    const original = button();
    applyText(original, "Publish", "button/default");
    expect(original.find((e) => e.type === "text")!.text).toBe("Click me!");
  });
});

describe("normalizeText errors", () => {
  it("rejects the string form on a multi-text component", () => {
    expect(() => normalizeText("Post", textSlots(tabs()), "tabs/default"))
      .toThrow(/tabs\/default has 4 text elements; pass an array/);
  });

  it("names the current strings so the order can be read", () => {
    expect(() => normalizeText("Post", textSlots(tabs()), "tabs/default")).toThrow(/"Preview", "Code"/);
  });

  it("rejects more replacements than slots", () => {
    expect(() => normalizeText(["a", "b", "c", "d", "e"], textSlots(tabs()), "tabs/default"))
      .toThrow(/has 4 text elements but 5 replacements/);
  });

  it("rejects a non-string entry", () => {
    expect(() => normalizeText([42], textSlots(button()), "button/default"))
      .toThrow(/must be a string or null, got 42/);
  });

  it("rejects a newline", () => {
    expect(() => normalizeText(["a\nb"], textSlots(button()), "button/default"))
      .toThrow(/single line/);
  });

  it("rejects a spec that is neither string nor array", () => {
    expect(() => normalizeText({ label: "a" } as never, textSlots(button()), "button/default"))
      .toThrow(/must be a string or an array/);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/text.test.ts`
Expected: FAIL — cannot resolve `../scripts/text.mjs`.

- [ ] **Step 3: Write the implementation**

Create `scripts/text.mjs`:

```js
/**
 * Text replacement for composed components.
 *
 * Two properties of the built scenes make this possible without touching src/ or
 * rebuilding dist/. Text elements are standalone (Factory.text sets containerId: null),
 * so there is never a bound-container refit. And the build sized every text element as
 * `len * fontSize * advance`, so the font metric can be divided back out per element —
 * which means presets with different faces work with no extra plumbing.
 */

export const FALLBACK_ADVANCE = 0.55;

/** Recover the chars-per-em metric the build used for this element. */
export function advanceOf(element) {
  const length = String(element.text ?? "").length;
  const fontSize = element.fontSize ?? 0;
  if (length === 0 || fontSize === 0) return FALLBACK_ADVANCE;
  return element.width / (length * fontSize);
}

/** The component's text elements, in the order the build emitted them. */
export function textSlots(elements) {
  return elements.filter((e) => e.type === "text");
}

function quote(texts) {
  return texts.map((t) => JSON.stringify(t.text)).join(", ");
}

/**
 * Validate a leaf's `text` and return it as an array aligned with the slots.
 * `label` is "<component>/<variant>", used so every message says which leaf is wrong.
 */
export function normalizeText(spec, texts, label) {
  const current = texts.length > 0 ? ` Current: ${quote(texts)}` : "";

  if (typeof spec === "string") {
    if (texts.length !== 1) {
      throw new Error(
        `${label} has ${texts.length} text elements; pass an array, not a string.${current}`,
      );
    }
    return [spec];
  }

  if (!Array.isArray(spec)) {
    throw new Error(`"text" must be a string or an array of strings, got ${JSON.stringify(spec)}.`);
  }

  if (spec.length > texts.length) {
    throw new Error(
      `${label} has ${texts.length} text elements but ${spec.length} replacements were given.${current}`,
    );
  }

  for (const entry of spec) {
    if (entry === null || entry === undefined) continue;
    if (typeof entry !== "string") {
      throw new Error(`Replacement text must be a string or null, got ${JSON.stringify(entry)}.`);
    }
    if (entry.includes("\n")) {
      throw new Error(`Replacement text must be a single line; ${JSON.stringify(entry)} contains a newline.`);
    }
  }

  return spec;
}

/**
 * Widening: `delta` px of blank space are inserted at `cut`, the replaced text's old
 * right edge. Because the insertion point is the text's own right edge and the box
 * around it grows by the same amount, the text keeps its distance to both box edges —
 * so centred and right-aligned labels stay put without any containing-rect detection.
 */
function insertSpace(element, cut, delta) {
  const width = element.width ?? 0;
  if (element.x + width <= cut) return element;
  if (element.x >= cut) return { ...element, x: element.x + delta };

  if (element.type === "rectangle" || element.type === "ellipse") {
    return { ...element, width: width + delta };
  }
  if (element.type === "line" && width > 0) {
    const scale = (width + delta) / width;
    return {
      ...element,
      width: width * scale,
      points: element.points.map(([px, py]) => [px * scale, py]),
    };
  }
  return element;
}

/** Narrowing: the box is untouched; only the text moves, by its own alignment. */
function reanchor(element, width) {
  const shrink = element.width - width;
  const x = element.textAlign === "center" ? element.x + shrink / 2
    : element.textAlign === "right" ? element.x + shrink
    : element.x;
  return { ...element, x, width };
}

function replaceOne(elements, index, next) {
  const target = elements[index];
  const width = next.length * target.fontSize * advanceOf(target);
  const delta = width - target.width;
  const written = { text: next, originalText: next };

  if (delta <= 0) {
    return elements.map((e, i) => (i === index ? { ...reanchor(e, width), ...written } : e));
  }

  const cut = target.x + target.width;
  return elements.map((e, i) => (
    i === index ? { ...e, ...written, width } : insertSpace(e, cut, delta)
  ));
}

/**
 * Apply a leaf's `text` to a component's elements. Returns a new array; the input is
 * never mutated, because the caller's elements come straight from the loaded scene and
 * may be reused by another instance of the same component.
 */
export function applyText(elements, spec, label) {
  const replacements = normalizeText(spec, textSlots(elements), label);

  let out = elements;
  replacements.forEach((next, slot) => {
    if (next === null || next === undefined) return;
    const index = out.reduce(
      (found, e, i) => (found.length === slot + 1 ? found : e.type === "text" ? [...found, i] : found),
      [],
    );
    out = replaceOne(out, index[slot], next);
  });
  return out;
}
```

Note on the index lookup in `applyText`: slot positions are recomputed from `out` on each
replacement because `replaceOne` returns a fresh array, but element *order* never changes,
so slot N is always the N-th text element. A simpler equivalent is to compute the index map
once before the loop — do that if the reduce above reads awkwardly:

```js
const slots = [];
elements.forEach((e, i) => { if (e.type === "text") slots.push(i); });
```

and then use `slots[slot]`. Prefer this simpler form.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/text.test.ts`
Expected: PASS, all cases.

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add scripts/text.mjs tests/text.test.ts
git commit -m "feat: replace component text at compose time"
```

---

### Task 2: Wire `text` into compose

**Files:**
- Modify: `scripts/compose.mjs` (`LEAF_KEYS` line 5, `check` lines 9-34, `size` lines 60-75, `compose` lines 106-118)
- Test: `tests/compose.test.ts`

**Interfaces:**
- Consumes: `applyText` from Task 1.
- Produces: `compose()` accepts `text` on any component leaf. No signature change.

- [ ] **Step 1: Write the failing tests**

Append to `tests/compose.test.ts`, inside the existing `describe("compose", ...)`:

```typescript
  it("replaces a leaf's text", () => {
    const scene = compose({ component: "button", text: "Publish" }, { root });
    const text = scene.elements.find((e: { type: string }) => e.type === "text");
    expect(text.text).toBe("Publish");
  });

  it("reflows neighbours when text grows the component", () => {
    const plain = compose({ type: "row", gap: 10, children: [leaf("button"), leaf("input")] }, { root });
    const grown = compose(
      { type: "row", gap: 10, children: [{ component: "button", text: "Featured image" }, leaf("input")] },
      { root },
    );
    const inputX = (scene: { elements: Array<{ groupIds: string[]; x: number }> }) => {
      const last = scene.elements[scene.elements.length - 1]!.groupIds[0];
      return Math.min(...scene.elements.filter((e) => e.groupIds[0] === last).map((e) => e.x));
    };
    expect(inputX(grown)).toBeGreaterThan(inputX(plain));
  });

  it("moves nothing but the text when it shrinks", () => {
    const plain = compose(leaf("button"), { root });
    const short = compose({ component: "button", text: "Go" }, { root });
    const rects = (s: { elements: Array<{ type: string; x: number; width: number }> }) =>
      s.elements.filter((e) => e.type === "rectangle").map((e) => [e.x, e.width]);
    expect(rects(short)).toEqual(rects(plain));
  });

  it("keeps two instances of one component independent", () => {
    const scene = compose(
      { type: "row", children: [{ component: "button", text: "Publish" }, leaf("button")] },
      { root },
    );
    const texts = scene.elements.filter((e: { type: string }) => e.type === "text").map((e) => e.text);
    expect(texts).toEqual(["Publish", "Click me!"]);
  });

  it("names the component when a text spec is wrong", () => {
    expect(() => compose({ component: "tabs", text: "Post" }, { root })).toThrow(/tabs\/default/);
  });

  it("rejects text on a container", () => {
    expect(() => compose(
      { type: "row", text: "no", children: [leaf("button")] } as never,
      { root },
    )).toThrow(/only valid on a component node/);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/compose.test.ts`
Expected: FAIL — `Unknown key "text" on a component node.`

- [ ] **Step 3: Write the implementation**

In `scripts/compose.mjs`, add the import at the top:

```js
import { applyText } from "./text.mjs";
```

Add `"text"` to `LEAF_KEYS` (line 5):

```js
const LEAF_KEYS = new Set(["component", "variant", "text"]);
```

In `check`, before the container's unknown-key loop, add the targeted message (the generic
one would say `Unknown key "text" on a row node`, which does not tell the author that `text`
exists at all):

```js
  if ("text" in node) {
    throw new Error(`"text" is only valid on a component node, not on a row or column.`);
  }
```

In `compose`, have `load` apply the text. `resolveVariant` already produced the variant name
used for the error label:

```js
  const load = (component, variant, text) => {
    const resolved = resolveVariant(root, preset, component, variant);
    const loaded = loadVariant(root, preset, component, resolved);
    appState ??= loaded.appState;
    return text === undefined
      ? loaded.elements
      : applyText(loaded.elements, text, `${component}/${resolved}`);
  };
```

`load` now returns elements rather than `{ elements }`, so update `size` (line 61-63):

```js
  if ("component" in node) {
    const elements = load(node.component, node.variant, node.text);
    return { node, elements, ...measure(elements) };
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — the whole suite, including the pre-existing compose tests.

- [ ] **Step 5: Commit**

```bash
git add scripts/compose.mjs tests/compose.test.ts
git commit -m "feat: accept text overrides on layout leaves"
```

---

### Task 3: Show each variant's strings in `list`

**Files:**
- Modify: `scripts/library.mjs` (`listComponents` lines 164-181)
- Modify: `scripts/compose.mjs` (the `list` branch, lines 172-176)
- Test: `tests/library.test.ts`

**Interfaces:**
- Consumes: `textSlots` from Task 1.
- Produces: each variant object from `listComponents` gains `texts: string[]`.

Without this, the positional array in Task 2 has to be guessed. It is the feature's
documentation.

- [ ] **Step 1: Write the failing test**

Append to `tests/library.test.ts` (match the file's existing import of `listComponents` and
its `root` constant; add them if absent):

```typescript
  it("reports each variant's current strings", () => {
    const tabs = listComponents(root).find((c) => c.name === "tabs")!;
    const variant = tabs.variants.find((v) => v.name === "default")!;
    expect(variant.texts).toEqual(["Preview", "Code", "Notes", "Panel content lives here."]);
  });

  it("reports an empty list for a variant with no text", () => {
    const separator = listComponents(root).find((c) => c.name === "separator")!;
    expect(separator.variants.find((v) => v.name === "vertical")!.texts).toEqual([]);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/library.test.ts`
Expected: FAIL — `texts` is undefined.

- [ ] **Step 3: Write the implementation**

In `scripts/library.mjs`, import the helper:

```js
import { textSlots } from "./text.mjs";
```

and change the variant mapping at the end of `listComponents` so the loaded scene is used
twice rather than loaded twice:

```js
        .map((variant) => {
          const { elements } = loadVariant(root, preset, name, variant);
          return { name: variant, ...measure(elements), texts: textSlots(elements).map((e) => e.text) };
        }),
```

In `scripts/compose.mjs`, print the strings under each component in the `list` branch:

```js
      for (const component of listComponents(root, args.preset)) {
        const variants = component.variants.map((v) => `${v.name} (${v.width}x${v.height})`).join(", ");
        console.log(`${component.name}: ${variants}`);
        for (const variant of component.variants) {
          if (variant.texts.length === 0) continue;
          console.log(`    ${variant.name} text: ${variant.texts.map((t) => JSON.stringify(t)).join(", ")}`);
        }
      }
```

- [ ] **Step 4: Verify**

Run: `npx vitest run tests/library.test.ts`
Expected: PASS.

Run: `node scripts/compose.mjs list | head -20`
Expected: each component line is followed by indented `<variant> text: ...` lines, e.g.

```
button: default (206x62), disabled (200x56), secondary (206x62)
    default text: "Click me!"
    disabled text: "Can't touch this"
    secondary text: "Click me!"
```

(the exact strings are whatever the build holds — confirm the shape, not the words.)

- [ ] **Step 5: Commit**

```bash
git add scripts/library.mjs scripts/compose.mjs tests/library.test.ts
git commit -m "feat: list each variant's replaceable strings"
```

---

### Task 4: Frame module — validation, sampling, emission

**Files:**
- Create: `scripts/frame.mjs`
- Test: `tests/frame.test.ts`

**Interfaces:**
- Consumes: `advanceOf` from Task 1.
- Produces:
  - `DEFAULT_PADDING: number`
  - `checkFrame(frame: unknown): void`
  - `sampleStyle(): { sample(elements): void, get(): Style }` — a collector; `sample` is fed every loaded component, `get` returns the merged style with fallbacks applied
  - `frameInsets(frame: object, style: Style): { padding: number, band: number }`
  - `frameElements(frame: object, width: number, height: number, style: Style): object[]`

Where `Style` is `{ strokeColor, strokeWidth, roughness, roundness, fillStyle, fontFamily, fontSize, textColor, advance }`.

The collector exists because rect styling and text styling must be sampled **independently**:
`separator/horizontal` has no rectangle at all, so "the first component loaded" cannot be
assumed to supply both.

- [ ] **Step 1: Write the failing tests**

Create `tests/frame.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkFrame, frameElements, frameInsets, sampleStyle } from "../scripts/frame.mjs";

const root = join(import.meta.dirname, "..");
const load = (component: string, variant: string) =>
  JSON.parse(readFileSync(join(root, "dist", "components", component, `${variant}.excalidraw`), "utf8"))
    .elements as Array<Record<string, any>>;

const styleFrom = (...components: Array<[string, string]>) => {
  const collector = sampleStyle();
  for (const [component, variant] of components) collector.sample(load(component, variant));
  return collector.get();
};

describe("sampleStyle", () => {
  it("takes rect styling from the first component with a rectangle", () => {
    const style = styleFrom(["button", "default"]);
    expect(style.strokeWidth).toBe(1);
    expect(style.roughness).toBe(2);
    expect(style.roundness).toEqual({ type: 3 });
    expect(style.fillStyle).toBe("solid");
  });

  it("takes text styling even when the first component has no rectangle", () => {
    const style = styleFrom(["separator", "horizontal"], ["button", "default"]);
    expect(style.fontSize).toBe(20);
    expect(style.fontFamily).toBe(7);
    expect(style.strokeWidth).toBe(1); // came from button, sampled later
  });

  it("falls back when nothing was sampled", () => {
    const style = sampleStyle().get();
    expect(style).toMatchObject({ strokeWidth: 1, roughness: 2, fontSize: 20, fontFamily: 7 });
  });

  it("keeps the first sample when a second component is fed", () => {
    const one = styleFrom(["button", "default"]);
    const two = styleFrom(["button", "default"], ["tabs", "default"]);
    expect(two.strokeColor).toBe(one.strokeColor);
  });
});

describe("frameInsets", () => {
  const style = styleFrom(["button", "default"]);

  it("defaults padding to 16 and has no band without a label", () => {
    expect(frameInsets({}, style)).toEqual({ padding: 16, band: 0 });
  });

  it("honours an explicit padding", () => {
    expect(frameInsets({ padding: 4 }, style)).toEqual({ padding: 4, band: 0 });
  });

  it("adds a label band of fontSize * 1.25 plus padding", () => {
    expect(frameInsets({ label: "Settings" }, style)).toEqual({ padding: 16, band: 20 * 1.25 + 16 });
  });
});

describe("frameElements", () => {
  const style = styleFrom(["button", "default"]);

  it("emits one transparent rectangle at the frame's box", () => {
    const [rect] = frameElements({}, 300, 200, style);
    expect(rect.type).toBe("rectangle");
    expect(rect).toMatchObject({ x: 0, y: 0, width: 300, height: 200, backgroundColor: "transparent" });
    expect(rect.strokeColor).toBe(style.strokeColor);
  });

  it("emits no label element without a label", () => {
    expect(frameElements({}, 300, 200, style)).toHaveLength(1);
  });

  it("emits the label inside the top-left padding", () => {
    const [, label] = frameElements({ label: "Settings", padding: 16 }, 300, 200, style);
    expect(label.type).toBe("text");
    expect(label.text).toBe("Settings");
    expect(label.originalText).toBe("Settings");
    expect(label).toMatchObject({ x: 16, y: 16, fontSize: 20, fontFamily: 7 });
    expect(label.width).toBeCloseTo("Settings".length * 20 * style.advance, 6);
  });

  it("gives its elements a group of their own", () => {
    const elements = frameElements({ label: "Settings" }, 300, 200, style);
    const groups = new Set(elements.map((e) => e.groupIds[0]));
    expect(groups.size).toBe(1);
    expect(elements.every((e) => typeof e.id === "string" && typeof e.index === "string")).toBe(true);
  });
});

describe("checkFrame", () => {
  it("accepts an empty frame", () => {
    expect(() => checkFrame({})).not.toThrow();
  });

  it("rejects a non-object", () => {
    expect(() => checkFrame(true)).toThrow(/must be an object/);
  });

  it("rejects an unknown key", () => {
    expect(() => checkFrame({ border: 2 })).toThrow(/Unknown key "border" on a frame\. Use padding, label\./);
  });

  it("rejects a negative padding", () => {
    expect(() => checkFrame({ padding: -4 })).toThrow(/must be a number >= 0, got -4/);
  });

  it("rejects a non-numeric padding", () => {
    expect(() => checkFrame({ padding: "16" })).toThrow(/must be a number >= 0/);
  });

  it("rejects a non-string label", () => {
    expect(() => checkFrame({ label: 3 })).toThrow(/label must be a string, got 3/);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/frame.test.ts`
Expected: FAIL — cannot resolve `../scripts/frame.mjs`.

- [ ] **Step 3: Write the implementation**

Create `scripts/frame.mjs`:

```js
import { advanceOf } from "./text.mjs";

export const DEFAULT_PADDING = 16;
const LINE_HEIGHT = 1.25;
const FRAME_KEYS = new Set(["padding", "label"]);

/**
 * Used only when a layout somehow contains no component to sample from. Values match
 * the default preset so a frame never looks foreign.
 */
const FALLBACK = {
  strokeColor: "#18181b",
  strokeWidth: 1,
  roughness: 2,
  roundness: { type: 3 },
  fillStyle: "solid",
  fontFamily: 7,
  fontSize: 20,
  textColor: "#18181b",
  advance: 0.55,
};

export function checkFrame(frame) {
  if (frame === null || typeof frame !== "object" || Array.isArray(frame)) {
    throw new Error(`"frame" must be an object, e.g. {"padding": 16, "label": "Settings"}.`);
  }
  for (const key of Object.keys(frame)) {
    if (!FRAME_KEYS.has(key)) {
      throw new Error(`Unknown key "${key}" on a frame. Use padding, label.`);
    }
  }
  if (frame.padding !== undefined && (typeof frame.padding !== "number" || !Number.isFinite(frame.padding) || frame.padding < 0)) {
    throw new Error(`Frame padding must be a number >= 0, got ${JSON.stringify(frame.padding)}.`);
  }
  if (frame.label !== undefined && typeof frame.label !== "string") {
    throw new Error(`Frame label must be a string, got ${JSON.stringify(frame.label)}.`);
  }
}

/**
 * Frames are styled from the components they contain, never hardcoded, so a frame in a
 * blueprint-preset scene comes out thin-stroked and sharp-cornered for free. Rect and
 * text styling are sampled independently: separator/horizontal has no rectangle, so
 * "the first component" cannot be assumed to supply both.
 */
export function sampleStyle() {
  let box;
  let type;

  return {
    sample(elements) {
      box ??= elements.find((e) => e.type === "rectangle");
      type ??= elements.find((e) => e.type === "text");
    },
    get() {
      return {
        strokeColor: box?.strokeColor ?? FALLBACK.strokeColor,
        strokeWidth: box?.strokeWidth ?? FALLBACK.strokeWidth,
        roughness: box?.roughness ?? FALLBACK.roughness,
        roundness: box === undefined ? FALLBACK.roundness : box.roundness,
        fillStyle: box?.fillStyle ?? FALLBACK.fillStyle,
        fontFamily: type?.fontFamily ?? FALLBACK.fontFamily,
        fontSize: type?.fontSize ?? FALLBACK.fontSize,
        textColor: type?.strokeColor ?? box?.strokeColor ?? FALLBACK.textColor,
        advance: type === undefined ? FALLBACK.advance : advanceOf(type),
      };
    },
  };
}

export function frameInsets(frame, style) {
  const padding = frame.padding ?? DEFAULT_PADDING;
  const band = frame.label === undefined ? 0 : style.fontSize * LINE_HEIGHT + padding;
  return { padding, band };
}

/**
 * Ids and groupIds are placeholders: compose() suffixes every placement with a unique
 * instance tag, so two frames never collide and each selects as one unit.
 */
function element(type, index, extra) {
  return {
    id: `frame-${index}`,
    type,
    angle: 0,
    fillStyle: "solid",
    strokeStyle: "solid",
    opacity: 100,
    groupIds: ["frame-group"],
    frameId: null,
    index: `a${index.toString(36).padStart(5, "0")}V`,
    seed: 1,
    version: 1,
    versionNonce: 1,
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
    ...extra,
  };
}

export function frameElements(frame, width, height, style) {
  const { padding } = frameInsets(frame, style);

  const elements = [element("rectangle", 0, {
    x: 0,
    y: 0,
    width,
    height,
    strokeColor: style.strokeColor,
    backgroundColor: "transparent",
    fillStyle: style.fillStyle,
    strokeWidth: style.strokeWidth,
    roughness: style.roughness,
    roundness: style.roundness,
  })];

  if (frame.label !== undefined) {
    elements.push(element("text", 1, {
      x: padding,
      y: padding,
      width: frame.label.length * style.fontSize * style.advance,
      height: style.fontSize * LINE_HEIGHT,
      strokeColor: style.textColor,
      backgroundColor: "transparent",
      strokeWidth: style.strokeWidth,
      roughness: style.roughness,
      roundness: null,
      text: frame.label,
      originalText: frame.label,
      fontSize: style.fontSize,
      fontFamily: style.fontFamily,
      textAlign: "left",
      verticalAlign: "top",
      containerId: null,
      autoResize: true,
      lineHeight: LINE_HEIGHT,
    }));
  }

  return elements;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/frame.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/frame.mjs tests/frame.test.ts
git commit -m "feat: frame validation, style sampling and element emission"
```

---

### Task 5: Wire frames into compose

**Files:**
- Modify: `scripts/compose.mjs` (`CONTAINER_KEYS` line 6, `check`, `size` lines 60-75, `place` lines 78-101, `compose` lines 106-118)
- Test: `tests/compose.test.ts`

**Interfaces:**
- Consumes: `checkFrame`, `frameElements`, `frameInsets`, `sampleStyle` from Task 4.
- Produces: `compose()` accepts `frame` on any row or column.

- [ ] **Step 1: Write the failing tests**

Append to `tests/compose.test.ts`:

```typescript
  const bounds = (elements: Array<{ x: number; y: number; width: number; height: number }>) => ({
    left: Math.min(...elements.map((e) => e.x)),
    top: Math.min(...elements.map((e) => e.y)),
    right: Math.max(...elements.map((e) => e.x + e.width)),
    bottom: Math.max(...elements.map((e) => e.y + e.height)),
  });

  it("inflates a framed container by its padding", () => {
    const children = [leaf("button"), leaf("input")];
    const plain = compose({ type: "column", gap: 10, children }, { root });
    const framed = compose({ type: "column", gap: 10, frame: { padding: 20 }, children }, { root });
    const panel = framed.elements[0];
    const inner = bounds(plain.elements);
    expect(panel.width).toBeCloseTo(inner.right - inner.left + 40, 6);
    expect(panel.height).toBeCloseTo(inner.bottom - inner.top + 40, 6);
  });

  it("offsets children by the padding", () => {
    const framed = compose(
      { type: "column", frame: { padding: 20 }, children: [leaf("button")] },
      { root },
    );
    const children = framed.elements.slice(1);
    expect(bounds(children).left).toBeCloseTo(20, 6);
    expect(bounds(children).top).toBeCloseTo(20, 6);
  });

  it("puts the panel behind its children", () => {
    const framed = compose({ type: "column", frame: {}, children: [leaf("button")] }, { root });
    expect(framed.elements[0].type).toBe("rectangle");
    expect(framed.elements[0].backgroundColor).toBe("transparent");
    const indexes = framed.elements.map((e: { index: string }) => e.index);
    expect([...indexes].sort()).toEqual(indexes);
  });

  it("adds a label band above the children", () => {
    const plain = compose({ type: "column", frame: { padding: 10 }, children: [leaf("button")] }, { root });
    const titled = compose(
      { type: "column", frame: { padding: 10, label: "Settings" }, children: [leaf("button")] },
      { root },
    );
    expect(titled.elements[0].height).toBeCloseTo(plain.elements[0].height + 20 * 1.25 + 10, 6);
    expect(titled.elements[1].text).toBe("Settings");
    expect(bounds(titled.elements.slice(2)).top).toBeCloseTo(10 + 20 * 1.25 + 10, 6);
  });

  it("nests frames", () => {
    const scene = compose({
      type: "column",
      frame: { padding: 10 },
      children: [{ type: "row", frame: { padding: 5 }, children: [leaf("button")] }],
    }, { root });
    const panels = scene.elements.filter((e: { backgroundColor: string }) => e.backgroundColor === "transparent");
    expect(panels).toHaveLength(2);
    expect(panels[0].width).toBeCloseTo(panels[1].width + 20, 6);
  });

  it("gives each frame its own group", () => {
    const scene = compose({
      type: "column",
      frame: { padding: 10 },
      children: [{ type: "row", frame: { padding: 5 }, children: [leaf("button")] }],
    }, { root });
    const panels = scene.elements.filter((e: { backgroundColor: string }) => e.backgroundColor === "transparent");
    expect(panels[0].groupIds[0]).not.toBe(panels[1].groupIds[0]);
  });

  it("styles the frame from the components it contains", () => {
    const scene = compose({ type: "column", frame: {}, children: [leaf("button")] }, { root });
    const body = scene.elements.find((e: { type: string; x: number }) => e.type === "rectangle" && e.width === 200);
    expect(scene.elements[0].strokeColor).toBe(body.strokeColor);
    expect(scene.elements[0].roughness).toBe(body.roughness);
  });

  it("rejects a bad frame", () => {
    expect(() => compose(
      { type: "row", frame: { padding: -1 }, children: [leaf("button")] },
      { root },
    )).toThrow(/padding must be a number >= 0/);
  });

  it("rejects a frame on a leaf", () => {
    expect(() => compose({ component: "button", frame: {} } as never, { root })).toThrow(/frame/);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/compose.test.ts`
Expected: FAIL — `Unknown key "frame" on a column node.`

- [ ] **Step 3: Write the implementation**

In `scripts/compose.mjs`, extend the import block:

```js
import { checkFrame, frameElements, frameInsets, sampleStyle } from "./frame.mjs";
```

Add `"frame"` to `CONTAINER_KEYS` (line 6):

```js
const CONTAINER_KEYS = new Set(["type", "gap", "align", "children", "frame"]);
```

In `check`, after the container's unknown-key loop, validate it:

```js
  if (node.frame !== undefined) checkFrame(node.frame);
```

`size` gains the style collector and records the insets and the children's own extent. The
frame's own size needs `style.fontSize` for the label band, and that is available because
`node.children.map(...)` has already loaded every descendant leaf by the time the container's
size is computed:

```js
function size(node, load, style) {
  if ("component" in node) {
    const elements = load(node.component, node.variant, node.text);
    return { node, elements, ...measure(elements) };
  }

  const gap = node.gap ?? 24;
  const children = node.children.map((child) => size(child, load, style));
  const along = children.reduce((sum, c) => sum + (node.type === "row" ? c.width : c.height), 0)
    + gap * (children.length - 1);
  const across = Math.max(...children.map((c) => (node.type === "row" ? c.height : c.width)));

  const innerWidth = node.type === "row" ? along : across;
  const innerHeight = node.type === "row" ? across : along;
  const insets = node.frame === undefined ? { padding: 0, band: 0 } : frameInsets(node.frame, style.get());

  return {
    node,
    children,
    gap,
    insets,
    innerWidth,
    innerHeight,
    width: innerWidth + insets.padding * 2,
    height: innerHeight + insets.padding * 2 + insets.band,
  };
}
```

`place` emits the panel before descending, and offsets children by the insets. The align
offset must use the *inner* extent, not the inflated one, or children drift by the padding:

```js
function place(sized, x, y, out, style) {
  if (sized.elements) {
    out.push({ elements: sized.elements, x, y });
    return out;
  }

  if (sized.node.frame !== undefined) {
    out.push({ elements: frameElements(sized.node.frame, sized.width, sized.height, style.get()), x, y });
  }

  const { padding, band } = sized.insets;
  const originX = x + padding;
  const originY = y + padding + band;

  const align = sized.node.align ?? "start";
  const offset = (childExtent, containerExtent) =>
    align === "center" ? (containerExtent - childExtent) / 2
    : align === "end" ? containerExtent - childExtent
    : 0;

  let cursor = 0;
  for (const child of sized.children) {
    if (sized.node.type === "row") {
      place(child, originX + cursor, originY + offset(child.height, sized.innerHeight), out, style);
      cursor += child.width + sized.gap;
    } else {
      place(child, originX + offset(child.width, sized.innerWidth), originY + cursor, out, style);
      cursor += child.height + sized.gap;
    }
  }
  return out;
}
```

In `compose`, create the collector, feed it every loaded component, and pass it down:

```js
  const style = sampleStyle();
  const load = (component, variant, text) => {
    const resolved = resolveVariant(root, preset, component, variant);
    const loaded = loadVariant(root, preset, component, resolved);
    appState ??= loaded.appState;
    style.sample(loaded.elements);
    return text === undefined
      ? loaded.elements
      : applyText(loaded.elements, text, `${component}/${resolved}`);
  };

  const placements = place(size(layout, load, style), 0, 0, [], style);
```

The panel's elements go through the same suffixing loop as every other placement, so they
pick up a unique instance tag and their own group with no change to the emit loop.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — the whole suite. The pre-existing layout tests must still pass unchanged;
if `centres children on the cross axis` broke, the align offset is using `width` instead of
`innerWidth`.

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add scripts/compose.mjs tests/compose.test.ts
git commit -m "feat: frame rows and columns as bordered panels"
```

---

### Task 6: Document both features and prove them end to end

**Files:**
- Modify: `skills/composing-scenes/SKILL.md`
- Modify: `mockups/gutenberg-post-edit.layout.json`
- Modify: `mockups/gutenberg-post-edit.excalidraw` (regenerated output)

**Interfaces:**
- Consumes: everything from Tasks 1-5.
- Produces: nothing further depends on this.

- [ ] **Step 1: Update the skill's workflow section**

In `skills/composing-scenes/SKILL.md`, extend the description of a leaf in step 2 with the
`text` forms:

```markdown
   - A leaf is `{ "component": "<name>", "variant": "<name>", "text": ... }`. Omitting
     `variant` means `default`.
   - `text` replaces the component's baked-in strings. A string replaces the only text in
     a single-text component; an array replaces them positionally, and `null` skips one:

     ```json
     { "component": "button", "text": "Publish" }
     { "component": "tabs", "text": ["Post", "Block", null, "Draft saved"] }
     ```

     `list` prints every variant's current strings, in the order the array uses — read it
     rather than guessing. Text must be a single line. Longer text widens its box and
     reflows its neighbours; shorter text leaves the box alone and just re-centres.
```

and add the frame to the container description:

```markdown
   - A container is `{ "type": "row" | "column", "gap": 24, "align": "start",
     "children": [...] }`. `align` is the cross axis: `start`, `center`, or `end`.
   - Any container may carry `"frame": { "padding": 16, "label": "Settings" }`, which draws
     a bordered panel behind its children with that much space around them. Both keys are
     optional; padding defaults to 16. Frames nest.
```

- [ ] **Step 2: Replace the stale limitation**

Delete the `**Text is fixed.**` bullet from the "Limits" section and put this in its place:

```markdown
- **Text is single-line and re-measured, not re-flowed.** Replacement strings widen or
  narrow their own box; they never wrap, and nothing grows vertically. A very long string
  in a small component makes a very wide component.
```

Leave `**Rows and columns only.**` and `**One widget per leaf.**` as they are — overlap is
still unsupported.

- [ ] **Step 3: Rewrite the Gutenberg mockup using both features**

Replace `mockups/gutenberg-post-edit.layout.json` with a version that labels its widgets
and frames its three regions. Read the real strings first so the arrays line up:

```bash
node scripts/compose.mjs list | grep -A5 -E '^(button|tabs|sidebar|label|badge|item):'
```

Then write the layout with a framed header, a framed canvas column and a framed sidebar
column, giving `text` to at least the Publish button, the Post/Block tabs and the title
label. Keep it a valid layout — every `text` array must be no longer than the slot count
the listing reports.

- [ ] **Step 4: Compose and check the result**

```bash
node scripts/compose.mjs mockups/gutenberg-post-edit.layout.json -o mockups/gutenberg-post-edit.excalidraw
```

Expected: exits 0 and reports more elements than the previous 150 (frames add two per panel).
Confirm no warning or error, and confirm the JSON parses:

```bash
node -e "const s=require('./mockups/gutenberg-post-edit.excalidraw'); console.log(s.elements.length, new Set(s.elements.map(e=>e.index)).size)"
```

Expected: the two numbers are equal — every index is unique.

- [ ] **Step 5: Full check and commit**

```bash
npm run check
git add skills/composing-scenes/SKILL.md mockups/gutenberg-post-edit.layout.json mockups/gutenberg-post-edit.excalidraw
git commit -m "docs: document text overrides and frames, rebuild the Gutenberg mockup"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| Two properties of the built scenes (standalone text, recoverable advance) | 1 (`advanceOf`) |
| Authoring: string and array forms, `null`, short arrays | 1, 2 |
| `text` invalid on a container | 2 |
| Geometry Δ > 0 — insert space, per-type transform table | 1 |
| Geometry Δ < 0 — never shrink, re-anchor by `textAlign` | 1 |
| Vertical never touched, newline is an error | 1 |
| Multiple replacements applied in element order | 1 |
| Reflow is automatic via `measure()` | 2 (reflow test) |
| Frame authoring on rows and columns, nesting | 5 |
| Frame geometry: inflation, label band, panel emitted first | 4, 5 |
| Frame styling sampled per preset, transparent background | 4, 5 |
| Panel gets its own group | 4, 5 |
| Listing shows current strings | 3 |
| Every error in the spec's table | 1 (text errors), 4 (frame errors), 2 and 5 (surfaced through compose) |
| `CONTAINER_KEYS` / `LEAF_KEYS` updates | 2, 5 |
| Documentation | 6 |
| Out of scope items | not implemented, by design |

**Placeholder scan:** No TBDs. Every code step carries real code. Task 6 step 3 is the one
step that describes rather than shows — deliberately, because the layout's `text` arrays
depend on strings that Task 3's listing prints at that moment, and hardcoding them here
would go stale. The step names the command that produces them and the constraint they must
satisfy.

**Type consistency:** `applyText(elements, spec, label)` is defined in Task 1 and called
with exactly that shape in Task 2. `textSlots` is used in Tasks 1 and 3. `sampleStyle()`
returns a collector with `sample`/`get`, and Task 5 calls `style.sample(...)` and
`style.get()` accordingly. `frameInsets(frame, style)` and
`frameElements(frame, width, height, style)` are defined in Task 4 and called with those
arguments in Task 5. `size`/`place` both gained a trailing `style` parameter, threaded
consistently.

**One correction found and fixed during review:** Task 2's first draft had `load` still
returning `{ elements }` while `size` destructured it, which would have broken the moment
Task 5 rewrote `size`. `load` now returns the element array in both tasks.
