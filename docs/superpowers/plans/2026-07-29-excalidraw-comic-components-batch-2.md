# Excalidraw Comic Components — Batch 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the remaining 38 drawable shadcn/ui components to the existing comic-styled Excalidraw library, taking it from 20 to 58 components.

**Architecture:** Unchanged. `src/tokens.ts` → `src/element.ts` → `src/comic.ts` → `src/components/*.ts`, wired through `src/registry.ts`, emitted by `src/build.ts`, checked by `src/validate.ts`. Task 1 adds four things to `comic.ts` that the new components need; Tasks 2–9 add components in batches of five; Task 10 closes out.

**Tech Stack:** Node 20+, TypeScript 5, tsx, vitest. No runtime dependencies.

## On the level of detail in this plan

Batch 1's plan carried full source for every component. That was right when the idioms were unproven. They are proven now: twenty working components sit in `src/components/`, the helper set is stable, and 128 tests guard it. Repeating full source for 38 more components would be writing the code twice and would go stale against the helpers the moment Task 1 lands.

So Task 1 carries complete code — it changes shared infrastructure. Tasks 2–9 give each component a **precise specification**: exact dimensions, exact states to show, the helpers to use, and the assertions its test must make. Implementers read the named reference components for idiom. Anything a spec leaves open is a genuine judgement call the implementer should make and report, not a gap.

## Global Constraints

Identical to batch 1. Every one of these still binds:

- Node 20+. ES modules. Zero runtime dependencies.
- Every colour written into output must come from `src/tokens.ts` or be the literal `"transparent"`. No inline hex outside `tokens.ts`.
- Every shape uses `roughness: 2` and `fillStyle: "solid"`.
- `strokeWidth` is `4` — the bold comic ink — for every primary shape. Fine detail goes thinner with the value explicit at the call site: `comic.rule()` hairlines and small incidental strokes use `2`; the hard-shadow shapes inside `inkBox`/`inkCircle` use `1`; `fillBand()` carries a transparent stroke. A `strokeWidth` below `4` is only correct on a stroke secondary to the component's silhouette.
- Builds are deterministic: seeded PRNG only, never `Math.random()`, never `Date.now()`.
- All elements of one component share exactly one groupId.
- Text elements are standalone: `containerId` always `null`, `boundElements` always `null`.
- `Factory.line` contract: `x`/`y` is the origin, `points` are relative to it, the first point is always `[0, 0]`, and a line must have non-zero extent. The validator enforces all three.
- **Fill-only rectangles go through `comic.fillBand()`**, never a bare `f.rect` — a bare one inherits a 4px ink outline and renders as a box, not a fill. This was batch 1's worst shipped bug.
- **Never nest a rounded shape inside another rounded shape and expect the corners to agree.** Excalidraw's adaptive radius scales with shape size, so a small rounded shape inside a large one produces overhang and seam notches. Square the inner shape, or inset it clear of the corner arc. This bug shipped twice in batch 1.
- Text-width arithmetic calls `estimateTextWidth` from `src/element.ts`. Never re-derive its formula.
- `dist/` IS committed to git.
- Component builder files export `default (): ExcalidrawElement[]`.
- Registry keys stay alphabetical.

## Verification every task must pass

`npm run build && npm run validate && npx vitest run && npx tsc --noEmit`, all clean, before committing. `dist/` committed with the change that regenerated it.

---

### Task 1: Extend the comic helper set

**Files:**
- Modify: `src/comic.ts`
- Test: `tests/comic.test.ts`

**Interfaces:**
- Consumes: `Factory`, `ExcalidrawElement` from `src/element.js`; `color`, `style` from `src/tokens.js`.
- Produces four additions, all returning `ExcalidrawElement[]`:
  - `arc(f, o: { cx, cy, r, startDeg, endDeg, stroke?, strokeWidth?, segments? })`
  - `dots(f, o: { x, y, count, gap, r, fill?, stroke? })`
  - `swash(f, o: { x, y, w, h, fill?, stroke? })`
  - `strokeStyle?: "solid" | "dashed" | "dotted"` added to `inkBox`'s and `fillBand`'s option objects, passed through to `Factory.rect`.

**Why each is needed:** `arc` draws the spinner. `dots` draws carousel indicators and the resizable handle's grip. `swash` draws the marker highlight. `strokeStyle` lets `aspect-ratio`, `empty` and `context-menu` draw dashed placeholder outlines.

- [ ] **Step 1: Write the failing tests**

Append to `tests/comic.test.ts`:

```ts
describe("arc", () => {
  it("emits one open line whose first point is [0,0]", () => {
    const [el] = arc(new Factory("demo"), { cx: 100, cy: 100, r: 40, startDeg: 0, endDeg: 270 });
    expect(el!.type).toBe("line");
    const pts = el!.points as number[][];
    expect(pts[0]).toEqual([0, 0]);
    expect(pts.length).toBeGreaterThan(8);
    // Open, not closed: last point must differ from the first.
    expect(pts[pts.length - 1]).not.toEqual([0, 0]);
    expect(el!.backgroundColor).toBe(color.transparent);
  });

  it("starts at the requested angle", () => {
    const f = new Factory("demo");
    const [el] = arc(f, { cx: 100, cy: 100, r: 40, startDeg: 0, endDeg: 90 });
    // 0 degrees is the +x axis, so the arc begins at (cx + r, cy).
    expect(el!.x).toBeCloseTo(140);
    expect(el!.y).toBeCloseTo(100);
  });

  it("sweeps a wider angle into a wider bounding box", () => {
    const quarter = arc(new Factory("a"), { cx: 0, cy: 0, r: 40, startDeg: 0, endDeg: 90 })[0]!;
    const full = arc(new Factory("b"), { cx: 0, cy: 0, r: 40, startDeg: 0, endDeg: 350 })[0]!;
    expect(Number(full.width)).toBeGreaterThan(Number(quarter.width));
  });
});

describe("dots", () => {
  it("emits one ellipse per dot, evenly spaced", () => {
    const els = dots(new Factory("demo"), { x: 10, y: 50, count: 3, gap: 20, r: 5 });
    expect(els).toHaveLength(3);
    expect(els.every((e) => e.type === "ellipse")).toBe(true);
    expect(els.map((e) => e.x)).toEqual([10, 30, 50]);
    expect(els.every((e) => e.width === 10)).toBe(true);
  });
});

describe("swash", () => {
  it("emits one closed filled polygon whose first point is [0,0]", () => {
    const [el] = swash(new Factory("demo"), { x: 0, y: 0, w: 120, h: 30 });
    expect(el!.type).toBe("line");
    const pts = el!.points as number[][];
    expect(pts[0]).toEqual([0, 0]);
    expect(pts[pts.length - 1]).toEqual([0, 0]);
    expect(el!.backgroundColor).toBe(color.muted);
  });
});

describe("strokeStyle passthrough", () => {
  it("inkBox forwards a dashed stroke style to the surface", () => {
    const els = inkBox(new Factory("demo"), { x: 0, y: 0, w: 100, h: 40, strokeStyle: "dashed" });
    expect(els[els.length - 1]!.strokeStyle).toBe("dashed");
  });

  it("fillBand forwards a stroke style", () => {
    const [el] = fillBand(new Factory("demo"), { x: 0, y: 0, w: 100, h: 40, rounded: false, strokeStyle: "dotted" });
    expect(el!.strokeStyle).toBe("dotted");
  });
});
```

Add `arc`, `dots`, `swash` to the file's existing import from `../src/comic.js`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/comic.test.ts`
Expected: FAIL — `arc`, `dots`, `swash` are not exported.

- [ ] **Step 3: Implement**

Add to `src/comic.ts`. Follow the file's existing style — every helper takes the `Factory` first and returns elements in z-order.

```ts
/**
 * An open circular arc, approximated by a polyline. Angles in degrees, 0 = +x axis,
 * increasing clockwise in screen coordinates.
 */
export function arc(
  f: Factory,
  o: {
    cx: number; cy: number; r: number;
    startDeg: number; endDeg: number;
    stroke?: string; strokeWidth?: number; segments?: number;
  },
): ExcalidrawElement[] {
  const segments = o.segments ?? Math.max(8, Math.round(Math.abs(o.endDeg - o.startDeg) / 12));
  const abs: Array<[number, number]> = [];
  for (let i = 0; i <= segments; i++) {
    const deg = o.startDeg + ((o.endDeg - o.startDeg) * i) / segments;
    const rad = (deg * Math.PI) / 180;
    abs.push([
      Math.round((o.cx + Math.cos(rad) * o.r) * 100) / 100,
      Math.round((o.cy + Math.sin(rad) * o.r) * 100) / 100,
    ]);
  }
  // Re-origin so the first point is [0, 0], as Factory.line requires.
  const [ox, oy] = abs[0]!;
  return [f.line({
    x: ox,
    y: oy,
    points: abs.map(([px, py]) => [px - ox, py - oy] as [number, number]),
    stroke: o.stroke ?? color.ink,
    strokeWidth: o.strokeWidth ?? style.strokeWidth,
  })];
}

/** A row of small circles: carousel indicators, grip dots. `x`/`y` is the first dot's top-left. */
export function dots(
  f: Factory,
  o: { x: number; y: number; count: number; gap: number; r: number; fill?: string; stroke?: string },
): ExcalidrawElement[] {
  const out: ExcalidrawElement[] = [];
  for (let i = 0; i < o.count; i++) {
    out.push(f.ellipse({
      x: o.x + i * o.gap,
      y: o.y,
      w: o.r * 2,
      h: o.r * 2,
      fill: o.fill ?? color.ink,
      stroke: o.stroke ?? color.ink,
      strokeWidth: 2,
    }));
  }
  return out;
}

/** A rough highlighter swash — a closed blob with uneven ends, for marking text. */
export function swash(
  f: Factory,
  o: { x: number; y: number; w: number; h: number; fill?: string; stroke?: string },
): ExcalidrawElement[] {
  const h = o.h;
  const w = o.w;
  return [f.line({
    x: o.x,
    y: o.y,
    points: [
      [0, 0],
      [w, -h * 0.12],
      [w + h * 0.25, h * 0.5],
      [w, h * 1.08],
      [0, h],
      [-h * 0.22, h * 0.5],
      [0, 0],
    ],
    fill: o.fill ?? color.muted,
    stroke: o.stroke ?? color.transparent,
    strokeWidth: 2,
  })];
}
```

Then add `strokeStyle?: "solid" | "dashed" | "dotted"` to the option types of `inkBox` and `fillBand`, and forward it to the `f.rect` call that draws the **surface** (not the shadow — a dashed shadow reads as noise).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/comic.test.ts`
Expected: PASS.

- [ ] **Step 5: Full verification and commit**

```bash
npm run build && npm run validate && npx vitest run && npx tsc --noEmit
git add src/comic.ts tests/comic.test.ts
git commit -m "feat: add arc, dots and swash helpers plus strokeStyle passthrough"
```

`dist/` must be unchanged by this task — no existing component calls the new helpers. If `git status` shows `dist/` changes, something in the `strokeStyle` passthrough altered existing output; investigate before committing.

---

## How Tasks 2–9 work

Every task in this range follows the identical shape. Each adds five (or four) components:

1. For each component, create `src/components/<key>.ts` exporting `default (): ExcalidrawElement[]`, building one `new Factory("<key>")` and composing `../comic.js` helpers.
2. Add the import and registry entry to `src/registry.ts`, keys alphabetical.
3. Append a `describe` block per component to `tests/components.test.ts`, using the existing module-scope `load` / `count` / `texts` helpers and `out` temp dir.
4. Add each component's expected bounding box to the table in `tests/containment.test.ts` so the containment invariant covers it.
5. Build, validate, test, type-check, commit with regenerated `dist/`.

**Reference components to read for idiom before starting:** `src/components/card.ts` (box + text + footer button), `src/components/dropdown-menu.ts` (trigger + open panel + rows + separator), `src/components/table.ts` (bands and rules inside a frame), `src/components/slider.ts` (bubble + knob + fill).

**Shared conventions for all new components:**
- Canonical control width is `size.control` (320) unless the spec says otherwise.
- Row height for list items is 46; control height is 56; label font is `size.fontSm` (16), titles `size.fontMd` (20), headings `size.fontLg` (28) with `font.comic`.
- A "trigger + open panel" component puts the trigger at `y: 0` and the panel 22px below it.
- Interior fill bands inset 8px from their frame's left and right edges.
- Every component's top-left sits near `(0, 0)`.

**Every component's test must assert, at minimum:** the expected text labels are present, and the element counts for the states the spec calls out (e.g. "one accent-filled row" → exactly one rect with `backgroundColor === color.accent`). Do not assert a bare total element count and nothing else — that passes against wrong output.

---

### Task 2: Accordion, Alert Dialog, Aspect Ratio, Button Group, Calendar

**Files:** create `src/components/{accordion,alert-dialog,aspect-ratio,button-group,calendar}.ts`; modify `src/registry.ts`, `tests/components.test.ts`, `tests/containment.test.ts`.

- [ ] **accordion** — 320 wide. Three stacked rows, each 56 tall with a 4px gap. Row 1 is expanded: its trigger shows "What is this?" with a **down** chevron at the right, and below it an 80-tall body area with two `rule()` lines standing in for copy. Rows 2 and 3 are collapsed, showing "How does it work?" and "Can I edit it?" with **right** chevrons. Each trigger is an `inkBox`; the body is not boxed, just indented copy with a `rule()` beneath it as the divider.
  *Test:* three trigger texts present; exactly 3 chevrons (3 lines) plus 2 body rules + 2 dividers.

- [ ] **alert-dialog** — 420×250, same comic panel treatment as `dialog.ts` (`rounded: false`, inner frame inset 10). Title "Delete everything?" in `font.comic` at `size.fontLg`, a `burst` behind a "!" glyph at the left of the title, two body `rule()` lines, and two footer buttons: "Cancel" (surface) and "Yes, delete" (accent). No close X — an alert dialog forces a choice.
  *Test:* the three texts present; exactly one burst (a line with >10 points); exactly two shadowed footer boxes.

- [ ] **aspect-ratio** — 320×180. A single `inkBox` with `strokeStyle: "dashed"` and `fill: color.transparent`, two crossed diagonals corner to corner drawn at `strokeWidth: 2` in `color.border`, and a centred "16 : 9" label in `font.comic`.
  *Test:* "16 : 9" present; exactly 2 lines; the surface rect has `strokeStyle === "dashed"`.

- [ ] **button-group** — three buttons joined edge to edge, each 110×56, no gaps, all `rounded: false` so the seams are clean (see the `tabs.ts` precedent — do not use rounded corners that would notch at the joins). Labels "Day", "Week", "Month"; "Week" is the pressed one, `color.accent` fill with `color.accentText` label. Only the group as a whole carries a hard shadow — draw one shadow rect behind the full 330 width rather than three.
  *Test:* three labels present; exactly one accent-filled rect; exactly one shadow rect (`strokeWidth === 1`).

- [ ] **calendar** — 320 wide. Header row 48 tall: a **left** chevron, centred "July 2026" in `font.comic`, a **right** chevron. Below it a row of seven weekday initials (S M T W T F S) at `size.fontSm` in `color.mutedText`, 44px column pitch. Then five rows of day numbers, 40 tall, starting the month on a Wednesday (so cells 1–2 of row 1 are blank). Day 17 is selected: an `inkCircle` of r=16 filled `color.accent` behind an `color.accentText` number. Day 24 is "today": an unfilled `inkCircle` outline, no shadow on either.
  *Test:* "July 2026" present; all seven weekday initials present; "17" and "24" present; exactly one accent-filled ellipse; exactly 2 chevrons.

---

### Task 3: Carousel, Chart, Collapsible, Combobox, Command

**Files:** create the five `src/components/*.ts`; modify `src/registry.ts`, `tests/components.test.ts`, `tests/containment.test.ts`.

- [ ] **carousel** — a 360×220 `inkBox` slide with a centred "1 / 3" label in `font.comic` at `size.fontLg`. Two `inkCircle` buttons of r=24 straddling the slide's vertical centre, one overlapping the left edge and one the right, each holding a **left** / **right** chevron. Below the slide, centred, `dots({ count: 3, gap: 22, r: 6 })` with the first filled `color.ink` and the other two `color.muted`.
  *Test:* "1 / 3" present; exactly 3 indicator ellipses of width 12; exactly 2 chevrons.

- [ ] **chart** — 340×220. Five vertical bars on a shared baseline, 44 wide with 20px gaps, heights 60/110/85/150/120, drawn with `fillBand` in `color.accent` (bar 4, the tallest) and `color.muted` (the rest) — squared, not rounded. A baseline `rule()` in `color.ink` at `strokeWidth: 4` spanning the full width, a left axis line likewise, and three faint `rule()` gridlines in `color.border` behind the bars. Month labels "Mar Apr May Jun Jul" under the bars at `size.fontSm`.
  *Test:* five month labels present; exactly 5 bar rects; exactly one accent-filled bar.

- [ ] **collapsible** — 320 wide. A trigger `inkBox` 56 tall reading "Show 3 more" with a **down** chevron, and below it three indented rows of `rule()` copy lines each 36 apart, representing the revealed content. Beneath that, separated by 40px, a second collapsed trigger reading "Show 3 more" with a **right** chevron and nothing below it — the two states side by side.
  *Test:* the trigger text appears twice; exactly 2 chevrons; exactly 3 content rules.

- [ ] **combobox** — 320 wide. Trigger `inkBox` 56 tall showing "Excalifont" with a **down** chevron. Open panel 22px below: a search row at the top with a "Search font..." placeholder in `color.subtle` and a `rule()` under it, then three rows — "Excalifont", "Comic Shanns", "Nunito". "Excalifont" is selected: a `checkMark` at its right edge and a `fillBand` in `color.muted` behind the row.
  *Test:* all four texts present; exactly one check mark line; exactly one muted fill band.

- [ ] **command** — 340 wide. A framed `inkBox` panel 300 tall. Top: a search row with a magnifier glyph (an `inkCircle` outline of r=8 with no shadow plus a short 45° handle line) and "Type a command..." in `color.subtle`, then a full-width `rule()`. Below: a group heading "Suggestions" in `color.mutedText` at `size.fontSm`, then three rows — "New drawing", "Open library", "Export as PNG". "New drawing" is highlighted with a `fillBand` in `color.muted`. Each row carries a right-aligned key hint: an `inkBox` key cap 34×26 with a single letter (N, L, E) at `strokeWidth: 2`, no shadow.
  *Test:* all five texts present; exactly 3 key-cap letters; exactly one muted fill band.

---

### Task 4: Context Menu, Date Picker, Drawer, Empty, Field

**Files:** create the five `src/components/*.ts`; modify `src/registry.ts`, `tests/components.test.ts`, `tests/containment.test.ts`.

- [ ] **context-menu** — a 300×160 dashed `inkBox` (`strokeStyle: "dashed"`, transparent fill, no shadow) with a centred "Right-click here" label in `color.subtle`. Overlapping its centre and extending past its bottom-right, an open menu `inkBox` 220 wide holding four rows: "Back", "Reload", a `rule()` separator, then "Inspect". "Reload" is hovered with a `fillBand` in `color.muted`.
  *Test:* all five texts present; the dashed rect exists; exactly one muted fill band; exactly one separator rule.

- [ ] **date-picker** — 320 wide. A trigger `inkBox` 56 tall showing a small calendar glyph (a 22×20 `inkBox` at `strokeWidth: 2`, no shadow, with two short vertical "binding" lines above it) then "17 July 2026". Below it, 22px down, a compact month popover 300 wide: header "July 2026" with left/right chevrons, and three rows of seven day numbers at 40px pitch, with 17 in an accent `inkCircle`.
  *Test:* "17 July 2026" and "July 2026" both present; exactly one accent-filled ellipse; exactly 2 chevrons.

- [ ] **drawer** — 360 wide. A bottom-sheet panel 260 tall whose top corners are the only rounded thing about it — since Excalidraw cannot round two corners only, draw it `rounded: false` and place a `fillBand` grabber bar 60×8 in `color.border`, rounded, centred 14px below the top edge. Then a title "Share drawing" in `font.comic` at `size.fontMd`, two `rule()` copy lines, and a full-width accent button "Copy link" 56 tall inset 20 from each side.
  *Test:* both texts present; the grabber band exists with width 60; exactly one accent-filled button surface.

- [ ] **empty** — 340×260 dashed `inkBox`, transparent fill, no shadow. Centred: a `burst` of r=34 in `color.muted` with a "?" glyph at `size.fontLg` in `font.comic` over it, a title "Nothing here yet" in `font.comic` at `size.fontMd`, one line of `color.mutedText` body copy "Draw something to get started.", and a 150×48 accent button "New drawing".
  *Test:* all four texts present; exactly one burst; the outer rect is dashed.

- [ ] **field** — 320 wide, two stacked field groups 130 apart. Group 1 is valid: a "Email" label at `size.fontSm`, an `inkBox` input 56 tall containing "ada@example.com", and helper text "We'll never share it." in `color.mutedText`. Group 2 is in error: a "Password" label, an input with a **doubled** outline (the `input.ts` focus idiom, but here signalling error) containing "•••", and a message "Too short." in `color.ink` with `font.comic` — in a grayscale palette, error emphasis is weight, not hue.
  *Test:* all six texts present; exactly 2 input surfaces carrying shadows; the error message uses `fontFamily` 7.

---

### Task 5: Hover Card, Input Group, Input OTP, Item, Kbd

**Files:** create the five `src/components/*.ts`; modify `src/registry.ts`, `tests/components.test.ts`, `tests/containment.test.ts`.

- [ ] **hover-card** — an open card `inkBox` 300×160 at the top holding a 2-avatar-style `inkCircle` of r=24 filled `color.accent` with "GS" initials, a name "@guido" in `font.comic`, and two `rule()` copy lines. Below it, 30px down, the trigger: the text "@guido" in `color.mutedText` with a `rule()` underline in `color.border` — a hovered link.
  *Test:* "@guido" appears twice; "GS" present; exactly one accent-filled ellipse.

- [ ] **input-group** — 340 wide, 56 tall, three joined segments all `rounded: false` with one shared shadow: a leading 50-wide chip in `color.muted` holding "@", a middle input area holding "guido" with a caret line, and a trailing 90-wide accent segment holding "Copy" in `color.accentText`. Seams drawn as two vertical `rule()` lines at `strokeWidth: 4` in `color.ink`.
  *Test:* "@", "guido" and "Copy" present; exactly one accent segment; exactly one shadow rect.

- [ ] **input-otp** — six separate 52×64 `inkBox` cells with 12px gaps, `rounded: false`. Cells 1–3 hold "4", "2", "7" centred in `font.comic` at `size.fontLg`. Cell 4 holds a caret line at `strokeWidth: 2` and has a doubled outline marking focus. Cells 5–6 are empty. A 20px wider gap between cells 3 and 4 to suggest the conventional grouping.
  *Test:* "4", "2", "7" present; exactly 6 cell surfaces with shadows; exactly one caret line.

- [ ] **item** — 340 wide, 76 tall, a single `inkBox` row: a leading `inkCircle` r=22 filled `color.muted` with no shadow holding a "★" glyph, a title "Sketch Kit" in `font.comic` at `size.fontMd`, a subtitle "20 components" in `color.mutedText` at `size.fontSm` below it, and a trailing **right** chevron.
  *Test:* all three texts present; exactly one chevron; exactly one muted ellipse.

- [ ] **kbd** — a row of key caps, each an `inkBox` `rounded: false` 52 tall with a hard shadow, holding a centred `font.comic` label: "⌘" (56 wide), "K" (56 wide), then after a 28px gap a wider "Shift" (100 wide) and "↵" (56 wide). Between "⌘" and "K", a "+" in `color.mutedText`.
  *Test:* all five labels present; exactly 4 key-cap surfaces with shadows.

---

### Task 6: Label, Menubar, Navigation Menu, Popover, Resizable

**Files:** create the five `src/components/*.ts`; modify `src/registry.ts`, `tests/components.test.ts`, `tests/containment.test.ts`.

- [ ] **label** — 320 wide, showing the two pairings a label has. Top: an "Email address" label at `size.fontSm` in `font.comic` above a 56-tall `inkBox` input holding "ada@example.com". Below, 40px down: a 34×34 checkbox `inkBox` filled `color.accent` with a `checkMark`, and to its right an "Accept terms" label, vertically centred against the box.
  *Test:* all four texts present; exactly one check mark; exactly one accent-filled rect.

- [ ] **menubar** — a horizontal bar 420×52, `rounded: false`, holding four menu titles at 100px pitch: "File", "Edit", "View", "Help". "Edit" is open: a `fillBand` in `color.muted` behind its title, and below the bar an open menu `inkBox` 200 wide aligned to "Edit"'s left edge, holding "Undo", "Redo", a `rule()` separator, and "Preferences".
  *Test:* all seven texts present; exactly one muted fill band in the bar; exactly one separator rule.

- [ ] **navigation-menu** — a horizontal nav row of three items at 130px pitch — "Product", "Docs", "Pricing" — each with a **down** chevron, "Docs" carrying a `fillBand` highlight. Below, an open mega-panel `inkBox` 420×200 holding two columns of two items each: "Getting started" / "Components" and "Theming" / "Examples", each with a `rule()` subtitle line beneath it in `color.border`.
  *Test:* all seven texts present; exactly 3 chevrons; exactly 4 subtitle rules.

- [ ] **popover** — a trigger `inkBox` 140×52 reading "Options", and above it (not below — a popover flips when near an edge, and this shows the tail idiom) a `bubble` 280×160 with `tailAt: "bottom"` and `apexX` aimed at the trigger's centre. The bubble holds a title "Dimensions" in `font.comic`, two `rule()` lines, and a small 40×24 accent chip reading "px".
  *Test:* "Options", "Dimensions" and "px" present; exactly one closed 4-point tail line; the tail apex x equals the trigger's centre x.

- [ ] **resizable** — two panels side by side inside a 400×220 footprint, both `rounded: false`: a left panel 180 wide holding "Left" and a right panel 200 wide holding "Right", with a 20-wide handle between them. The handle is a `fillBand` in `color.muted` full height, flanked by two vertical `rule()` lines at `strokeWidth: 4`, with `dots({ count: 3, gap: 0, r: 3 })` stacked **vertically** at its centre — note `dots` spaces horizontally, so draw three separate `f.ellipse` calls or call `dots` three times; say which you chose and why in your report.
  *Test:* "Left" and "Right" present; exactly 3 grip ellipses; exactly one muted handle band.

---

### Task 7: Scroll Area, Separator, Sheet, Sidebar, Skeleton

**Files:** create the five `src/components/*.ts`; modify `src/registry.ts`, `tests/components.test.ts`, `tests/containment.test.ts`.

- [ ] **scroll-area** — a 320×220 `inkBox` frame. Inside, eight `rule()` copy lines at 24px pitch in `color.muted` — the last two deliberately running to the frame's bottom edge to read as clipped content. On the right, inset 10 from the frame's edge, a scrollbar: a `fillBand` track 10 wide running the frame's inner height in `color.muted`, and a `fillBand` thumb 10×70 in `color.mutedText` at the top of it, both rounded.
  *Test:* exactly 8 content rules; exactly 2 scrollbar bands; the thumb's height is less than the track's.

- [ ] **separator** — two demonstrations. Top: a "Radix Primitives" title in `font.comic` and a `color.mutedText` line under it, then a full-width horizontal `rule()` at `strokeWidth: 4` in `color.ink` spanning 320. Bottom: three words — "Blog", "Docs", "Source" — at 90px pitch with two **vertical** `rule()`-style lines between them, each 28 tall at `strokeWidth: 2` in `color.border`.
  *Test:* all five texts present; exactly 3 lines, one horizontal (width > height) and two vertical (height > width).

- [ ] **sheet** — a right-edge panel 320×420, `rounded: false`, with its hard shadow on the left instead of the right (a right-docked sheet casts inward) — pass a negative offset by drawing the shadow rect manually at `x - 6, y + 6`, and say in your report that you did. Contents: a close X at the top right via `xMark`, a title "Edit drawing" in `font.comic` at `size.fontLg`, three labelled field rows (label + `inkBox` input, 90px apart) reading "Name" / "Tags" / "Notes", and a full-width accent "Save changes" button at the bottom.
  *Test:* all five texts present; exactly 2 lines forming the X; exactly one accent button surface.

- [ ] **sidebar** — a 240×420 vertical nav panel, `rounded: false`. Top: a 40×40 `fillBand` logo square in `color.accent` beside "Sketch Kit" in `font.comic`. Then a `rule()`. Then four nav rows 52 tall: "Overview", "Components", "Palette", "Settings". "Components" is active: a `fillBand` in `color.muted` behind it plus a 4-wide accent `fillBand` marker on its left edge. At the bottom, above a `rule()`, an avatar row: an `inkCircle` r=16 in `color.accent` with "GS" and the name "guido" beside it.
  *Test:* all seven texts present; exactly one muted row band; exactly one accent edge marker.

- [ ] **skeleton** — a 320×160 loading placeholder, no frame box at all — skeletons are bare shapes. An `inkCircle` r=28 in `color.muted` with **no** shadow and a `color.border` stroke at `strokeWidth: 2`, and to its right three stacked `fillBand` bars in `color.muted`, rounded, 16 tall at 28px pitch, of widths 200, 170 and 120. No text anywhere — that is the point of a skeleton.
  *Test:* zero text elements; exactly 3 bars; exactly one ellipse.

---

### Task 8: Spinner, Toggle, Toggle Group, Attachment, Bubble

**Files:** create the five `src/components/*.ts`; modify `src/registry.ts`, `tests/components.test.ts`, `tests/containment.test.ts`.

- [ ] **spinner** — three spinners in a row at 90px pitch, showing the motion. Each is an `arc` at `strokeWidth: 4` in `color.ink`: the first r=26 sweeping 0°→270°, the second r=26 sweeping 90°→330°, the third r=26 sweeping 200°→100° (wrapping past 360 — pass `endDeg: 460`). Under them, "Loading..." in `color.mutedText` at `size.fontSm`.
  *Test:* "Loading..." present; exactly 3 lines, each with more than 8 points; zero rectangles.

- [ ] **toggle** — two square toggles 60×60, `rounded: false`, 20px apart, each holding a `font.comic` glyph at `size.fontMd`: "B" and "I". "B" is pressed — `color.accent` fill, `color.accentText` glyph, and **no** shadow (a pressed button sits down). "I" is unpressed — surface fill with a shadow. To the right, "Bold" and "Italic" labels in `color.mutedText`.
  *Test:* all four texts present; exactly one accent-filled rect; exactly one shadow rect.

- [ ] **toggle-group** — three joined 70×60 toggles, `rounded: false`, no gaps, one shared shadow behind the full 210 width. Glyphs are alignment marks rather than letters: three horizontal `rule()` lines per cell at `strokeWidth: 3` in the cell's foreground colour, left-aligned in cell 1 (widths 30/20/26), centred in cell 2, right-aligned in cell 3. Cell 2 is pressed with `color.accent` fill and `color.accentText` marks.
  *Test:* zero text elements; exactly 9 mark lines; exactly one accent-filled cell; exactly one shadow rect.

- [ ] **attachment** — a file chip `inkBox` 300×72: a leading 40×48 `fillBand` in `color.muted` with a folded-corner line across its top right (two lines forming the fold), the filename "sketch-kit.excalidraw" in `size.fontSm`, a size "48 KB" in `color.mutedText` beneath it, and a trailing `xMark` at `strokeWidth: 2` to remove it.
  *Test:* both texts present; exactly 4 lines (2 fold + 2 X); exactly one muted band.

- [ ] **bubble** — two chat bubbles showing both directions. Incoming at the left: a `bubble` 220×80 in `color.surface` with `tailAt: "bottom"` and its apex near the **left** edge, holding two `rule()` copy lines. Outgoing below and to the right, offset 80px right and 120px down: a `bubble` 200×64 filled `color.accent` with its apex near the **right** edge, holding two `rule()` lines in `color.accentText`.
  *Test:* zero text elements; exactly 2 closed 4-point tail lines; exactly one accent-filled bubble surface.

---

### Task 9: Marker, Message, Toast, Sheet-adjacent cleanup

**Files:** create `src/components/{marker,message,toast}.ts`; modify `src/registry.ts`, `tests/components.test.ts`, `tests/containment.test.ts`.

This task has three components rather than five; it also closes out the registry.

- [ ] **marker** — 340 wide. Three lines of text at 44px pitch at `size.fontMd`: "The quick brown fox", "jumps over the lazy dog", "and lands in the ink." A `swash` in `color.muted` sits **behind** the words "brown fox" on line 1 (emit it before the text) and a second `swash` behind "lazy dog" on line 2. Size each swash from `estimateTextWidth` of the phrase it covers, plus 10px of bleed on each side.
  *Test:* all three texts present; exactly 2 closed swash lines; each swash is emitted before its line's text (compare `index` strings).

- [ ] **message** — 380 wide. A chat exchange: an `inkCircle` r=22 filled `color.muted` with "GS", beside it a `bubble` 260×86 in `color.surface` with `tailAt: "bottom"` and apex near the left edge, holding two `rule()` copy lines, and a timestamp "09:24" in `color.subtle` at `size.fontSm` below the bubble's bottom-left. Beneath, offset right, a second `inkCircle` r=22 in `color.accent` with "AI" and an accent `bubble` 240×64 with two `color.accentText` rules and a "09:25" timestamp.
  *Test:* "GS", "AI", "09:24", "09:25" present; exactly 2 tail lines; exactly one accent-filled ellipse and one accent-filled bubble surface.

- [ ] **toast** — a floating card `inkBox` 360×110 with a heavier shadow than usual: draw the shadow offset `+10, +10` rather than the default 6, to make it read as floating above the page. Contents: a title "Drawing saved" in `font.comic` at `size.fontMd`, a body line "Your changes are on disk." in `color.mutedText` at `size.fontSm`, a trailing `xMark` at `strokeWidth: 2` in the top right, and a small 80×40 surface button "Undo" at the right edge, vertically centred.
  *Test:* all three texts present; the shadow rect's x offset from the surface is 10; exactly 2 lines forming the X.

---

### Task 10: Registry coverage, README, final check

**Files:** modify `tests/build.test.ts`, `README.md`, and the design spec.

- [ ] **Step 1: Update the registry coverage test**

`tests/build.test.ts` pins the exact component key set. Extend `EXPECTED` to all 58 keys, alphabetically. The test must fail if any component is missing or misnamed — do not relax it to a count.

The 38 new keys: `accordion`, `alert-dialog`, `aspect-ratio`, `attachment`, `bubble`, `button-group`, `calendar`, `carousel`, `chart`, `collapsible`, `combobox`, `command`, `context-menu`, `date-picker`, `drawer`, `empty`, `field`, `hover-card`, `input-group`, `input-otp`, `item`, `kbd`, `label`, `marker`, `menubar`, `message`, `navigation-menu`, `popover`, `resizable`, `scroll-area`, `separator`, `sheet`, `sidebar`, `skeleton`, `spinner`, `toast`, `toggle`, `toggle-group`.

- [ ] **Step 2: Run it and watch it pass**

Run: `npx vitest run tests/build.test.ts`
If it fails, a component is missing or misnamed in the registry — fix the registry, not the test.

- [ ] **Step 3: Update `README.md`**

Update the component list to all 58 names, and the count wherever it appears. Check the "Develop" section's description of `src/comic.ts` still matches reality after Task 1 added three helpers — list them.

- [ ] **Step 4: Update the design spec**

`docs/superpowers/specs/2026-07-28-excalidraw-comic-components-design.md` says "Twenty components in this pass" under Non-goals, lists 20 rows in its Components table, and names `comic.ts`'s exports in the Layering table. Update all three. Also recount the "six of the twenty drop to a `Factory` primitive" sentence against the new total — run the grep, do not guess:

```bash
grep -lE '\bf\.(rect|ellipse|line|text)\(' src/components/*.ts | wc -l
```

- [ ] **Step 5: Final verification**

```bash
npm run check
npx tsc --noEmit
```

Expected: `Wrote 58 components`, validator clean, all tests passing, no type errors.

- [ ] **Step 6: Commit**

```bash
git add tests/build.test.ts README.md docs dist
git commit -m "docs: cover all 58 components in README, spec and registry test"
```

---

## Done when

- `npm run check` passes and reports 58 components.
- `npx tsc --noEmit` is clean.
- `dist/` holds 58 `.excalidraw` files plus `comic-ui.excalidrawlib`, all committed.
- Every new component has a `describe` block in `tests/components.test.ts` and a bounding-box entry in `tests/containment.test.ts`.
- The controller has loaded the library into real Excalidraw and looked at every new component.
