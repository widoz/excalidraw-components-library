# Excalidraw Comic Components Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate 20 hand-drawn, comic-styled Excalidraw UI components modelled on shadcn/ui, as one `.excalidraw` scene per component plus a single `.excalidrawlib` bundle.

**Architecture:** A TypeScript build script. `tokens.ts` holds constants, `element.ts` emits valid Excalidraw element JSON, `comic.ts` layers the house style on top, and each file under `components/` composes comic helpers into one component. `build.ts` walks a registry and writes `dist/`. Nothing but `element.ts` writes raw element JSON, so restyling the library is a change to `comic.ts`.

**Tech Stack:** Node 20+, TypeScript 5, tsx (to run TS directly), vitest. No runtime dependencies.

## Global Constraints

- Node 20 or newer. ES modules (`"type": "module"` in `package.json`).
- Zero runtime dependencies. `typescript`, `tsx` and `vitest` are devDependencies only.
- Every colour written into output must come from `tokens.ts` or be the literal string `"transparent"`. No inline hex anywhere outside `tokens.ts`.
- Every shape uses `roughness: 2`, `strokeWidth: 4`, `fillStyle: "solid"`.
- Builds are deterministic: seeded PRNG only, never `Math.random()`, never `Date.now()`.
- All elements of one component share exactly one groupId.
- Text elements are standalone: `containerId` is always `null`, `boundElements` is always `null`.
- Output directory is `dist/` and it IS committed to git.
- Component builder files export `default (): ExcalidrawElement[]`.
- Commit after every task.

---

### Task 1: Project scaffolding and design tokens

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `src/tokens.ts`
- Test: `tests/tokens.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `zinc` (record of shade number → hex string), `color` (record of semantic name → hex string), `PALETTE_VALUES: ReadonlySet<string>`, `style` (`roughness`, `strokeWidth`, `shadowOffset`), `font` (`hand`, `comic`), `size` (`control`, `rowHeight`, `gap`, `radius`, `fontSm`, `fontMd`, `fontLg`).

- [ ] **Step 1: Initialise the repository**

The directory `/Volumes/Dev/mine/excalidraw-components-library` is not yet a git repo.

```bash
cd /Volumes/Dev/mine/excalidraw-components-library
git init
git checkout -b main
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "excalidraw-comic-components",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Comic-styled shadcn-inspired UI components for Excalidraw",
  "scripts": {
    "build": "tsx src/build.ts",
    "validate": "tsx src/validate.ts",
    "test": "vitest run",
    "check": "npm run build && npm run validate && npm test"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "tsx": "^4.16.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["node"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 4: Create `.gitignore`**

Note `dist/` is deliberately NOT ignored — the generated library is committed.

```gitignore
node_modules/
*.log
.DS_Store
```

- [ ] **Step 5: Install dependencies**

```bash
npm install
```

- [ ] **Step 6: Write the failing test**

Create `tests/tokens.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PALETTE_VALUES, color, font, size, style, zinc } from "../src/tokens.js";

describe("tokens", () => {
  it("exposes the shadcn zinc scale", () => {
    expect(zinc[50]).toBe("#fafafa");
    expect(zinc[200]).toBe("#e4e4e7");
    expect(zinc[700]).toBe("#3f3f46");
    expect(zinc[900]).toBe("#18181b");
    expect(Object.keys(zinc)).toHaveLength(11);
  });

  it("maps semantic colours onto the zinc scale", () => {
    expect(color.ink).toBe(zinc[900]);
    expect(color.surface).toBe(zinc[50]);
    expect(color.muted).toBe(zinc[200]);
    expect(color.accent).toBe(zinc[700]);
    expect(color.transparent).toBe("transparent");
  });

  it("lists every legal output colour in PALETTE_VALUES", () => {
    for (const value of Object.values(color)) {
      expect(PALETTE_VALUES.has(value)).toBe(true);
    }
    expect(PALETTE_VALUES.has("#ff0000")).toBe(false);
  });

  it("pins the comic style constants", () => {
    expect(style.roughness).toBe(2);
    expect(style.strokeWidth).toBe(4);
    expect(style.shadowOffset).toBe(6);
    expect(font.hand).toBe(1);
    expect(font.comic).toBe(7);
    expect(size.control).toBe(320);
  });
});
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `npx vitest run tests/tokens.test.ts`
Expected: FAIL — cannot resolve `../src/tokens.js`.

- [ ] **Step 8: Write `src/tokens.ts`**

```ts
/** shadcn/ui "zinc" base colour scale. */
export const zinc = {
  50: "#fafafa",
  100: "#f4f4f5",
  200: "#e4e4e7",
  300: "#d4d4d8",
  400: "#a1a1aa",
  500: "#71717a",
  600: "#52525b",
  700: "#3f3f46",
  800: "#27272a",
  900: "#18181b",
  950: "#09090b",
} as const;

/** Semantic roles. Components reference these, never raw hex. */
export const color = {
  ink: zinc[900],
  surface: zinc[50],
  muted: zinc[200],
  border: zinc[300],
  subtle: zinc[400],
  mutedText: zinc[500],
  accent: zinc[700],
  accentText: zinc[50],
  transparent: "transparent",
} as const;

/** Every value legally allowed to appear as a stroke or background in output. */
export const PALETTE_VALUES: ReadonlySet<string> = new Set<string>([
  ...Object.values(zinc),
  "transparent",
]);

/** The comic look, applied to every shape. */
export const style = {
  roughness: 2,
  strokeWidth: 4,
  /** Hard drop-shadow displacement, in px, down and right. */
  shadowOffset: 6,
} as const;

/** Excalidraw font family ids. */
export const font = {
  /** Excalifont, the default hand-drawn face. */
  hand: 1,
  /** Comic Shanns, used for emphasis. */
  comic: 7,
} as const;

export const size = {
  /** Canonical width of a form control. */
  control: 320,
  rowHeight: 48,
  gap: 16,
  radius: 8,
  fontSm: 16,
  fontMd: 20,
  fontLg: 28,
} as const;
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `npx vitest run tests/tokens.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json tsconfig.json .gitignore src/tokens.ts tests/tokens.test.ts docs
git commit -m "feat: scaffold project and add zinc design tokens"
```

---

### Task 2: Element factory

**Files:**
- Create: `src/element.ts`
- Test: `tests/element.test.ts`

**Interfaces:**
- Consumes: `color`, `style`, `font` from `src/tokens.js`.
- Produces:
  - `type ExcalidrawElement = Record<string, unknown> & { id: string; type: string; index: string }`
  - `mulberry32(seed: number): () => number`
  - `seedFromString(input: string): number`
  - `class Factory` with constructor `(componentName: string)` and:
    - `readonly groupId: string`
    - `rect(o: RectOptions): ExcalidrawElement`
    - `ellipse(o: RectOptions): ExcalidrawElement`
    - `line(o: LineOptions): ExcalidrawElement`
    - `text(o: TextOptions): ExcalidrawElement`
  - `interface RectOptions { x: number; y: number; w: number; h: number; fill?: string; stroke?: string; strokeWidth?: number; strokeStyle?: "solid" | "dashed" | "dotted"; rounded?: boolean; opacity?: number }`
  - `interface LineOptions { x: number; y: number; points: Array<[number, number]>; stroke?: string; strokeWidth?: number; fill?: string; closed?: boolean }`
  - `interface TextOptions { x: number; y: number; text: string; fontSize?: number; fontFamily?: number; stroke?: string; align?: "left" | "center" | "right" }`
  - `estimateTextWidth(text: string, fontSize: number): number`

**Notes for the implementer:**

`index` must sort ascending as a plain string. Use a fixed-width base-36 counter with a
trailing non-zero character (`"a" + n.toString(36).padStart(5, "0") + "V"`) — fractional
index strings must not end in `"0"`, and fixed width keeps lexicographic order matching
numeric order.

For `line`, `x`/`y` is the origin and `points` are relative to it, with the first point
always `[0, 0]`. `width`/`height` are the bounding box of `points`.

- [ ] **Step 1: Write the failing test**

Create `tests/element.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { Factory, estimateTextWidth, mulberry32, seedFromString } from "../src/element.js";
import { color, style } from "../src/tokens.js";

const REQUIRED = [
  "id", "type", "x", "y", "width", "height", "angle", "strokeColor",
  "backgroundColor", "fillStyle", "strokeWidth", "strokeStyle", "roughness",
  "opacity", "groupIds", "frameId", "index", "roundness", "seed", "version",
  "versionNonce", "isDeleted", "boundElements", "updated", "link", "locked",
];

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("returns values in [0, 1)", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("seedFromString", () => {
  it("is stable and differs between inputs", () => {
    expect(seedFromString("button")).toBe(seedFromString("button"));
    expect(seedFromString("button")).not.toBe(seedFromString("input"));
  });
});

describe("Factory", () => {
  it("emits every mandatory field on a rectangle", () => {
    const f = new Factory("demo");
    const el = f.rect({ x: 0, y: 0, w: 100, h: 40 });
    for (const key of REQUIRED) expect(el).toHaveProperty(key);
    expect(el.type).toBe("rectangle");
    expect(el.roughness).toBe(style.roughness);
    expect(el.strokeWidth).toBe(style.strokeWidth);
    expect(el.fillStyle).toBe("solid");
    expect(el.groupIds).toEqual([f.groupId]);
  });

  it("assigns strictly ascending index strings across many elements", () => {
    const f = new Factory("demo");
    const indices = Array.from({ length: 50 }, () => f.rect({ x: 0, y: 0, w: 1, h: 1 }).index);
    const sorted = [...indices].sort();
    expect(indices).toEqual(sorted);
    expect(new Set(indices).size).toBe(50);
    for (const i of indices) expect(i.endsWith("0")).toBe(false);
  });

  it("assigns unique ids", () => {
    const f = new Factory("demo");
    const ids = Array.from({ length: 50 }, () => f.rect({ x: 0, y: 0, w: 1, h: 1 }).id);
    expect(new Set(ids).size).toBe(50);
  });

  it("produces identical output for the same component name", () => {
    const a = new Factory("demo").rect({ x: 0, y: 0, w: 10, h: 10 });
    const b = new Factory("demo").rect({ x: 0, y: 0, w: 10, h: 10 });
    expect(a).toEqual(b);
  });

  it("defaults rectangles to surface fill and ink stroke", () => {
    const el = new Factory("demo").rect({ x: 0, y: 0, w: 10, h: 10 });
    expect(el.backgroundColor).toBe(color.surface);
    expect(el.strokeColor).toBe(color.ink);
    expect(el.roundness).toEqual({ type: 3 });
  });

  it("supports sharp corners", () => {
    const el = new Factory("demo").rect({ x: 0, y: 0, w: 10, h: 10, rounded: false });
    expect(el.roundness).toBeNull();
  });

  it("emits ellipses with null roundness", () => {
    const el = new Factory("demo").ellipse({ x: 0, y: 0, w: 20, h: 20 });
    expect(el.type).toBe("ellipse");
    expect(el.roundness).toBeNull();
  });

  it("computes line geometry from its points", () => {
    const el = new Factory("demo").line({ x: 5, y: 5, points: [[0, 0], [30, 10], [0, 20]] });
    expect(el.type).toBe("line");
    expect(el.x).toBe(5);
    expect(el.width).toBe(30);
    expect(el.height).toBe(20);
    expect(el.points).toEqual([[0, 0], [30, 10], [0, 20]]);
    expect(el.startBinding).toBeNull();
    expect(el.endBinding).toBeNull();
    expect(el.startArrowhead).toBeNull();
  });

  it("closes a line by repeating the first point", () => {
    const el = new Factory("demo").line({ x: 0, y: 0, points: [[0, 0], [10, 0], [10, 10]], closed: true });
    expect(el.points).toEqual([[0, 0], [10, 0], [10, 10], [0, 0]]);
  });

  it("emits standalone text with no container binding", () => {
    const el = new Factory("demo").text({ x: 0, y: 0, text: "Hi" });
    expect(el.type).toBe("text");
    expect(el.text).toBe("Hi");
    expect(el.originalText).toBe("Hi");
    expect(el.containerId).toBeNull();
    expect(el.boundElements).toBeNull();
    expect(el.backgroundColor).toBe(color.transparent);
    expect(el.autoResize).toBe(true);
    expect(el.lineHeight).toBe(1.25);
  });

  it("centres text by shifting x left by half the estimated width", () => {
    const f = new Factory("demo");
    const el = f.text({ x: 100, y: 0, text: "Hello", align: "center" });
    expect(el.x).toBeCloseTo(100 - estimateTextWidth("Hello", 20) / 2);
    expect(el.textAlign).toBe("center");
  });
});

describe("estimateTextWidth", () => {
  it("scales with length and font size", () => {
    expect(estimateTextWidth("ab", 20)).toBeCloseTo(estimateTextWidth("a", 20) * 2);
    expect(estimateTextWidth("a", 40)).toBeCloseTo(estimateTextWidth("a", 20) * 2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/element.test.ts`
Expected: FAIL — cannot resolve `../src/element.js`.

- [ ] **Step 3: Write `src/element.ts`**

```ts
import { color, font, size, style } from "./tokens.js";

export type ExcalidrawElement = Record<string, unknown> & {
  id: string;
  type: string;
  index: string;
};

/** Small, fast, deterministic PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a. Turns a component name into a stable PRNG seed. */
export function seedFromString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Rough advance-width estimate. Good enough to centre a label. */
export function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.55;
}

export interface RectOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeStyle?: "solid" | "dashed" | "dotted";
  rounded?: boolean;
  opacity?: number;
}

export interface LineOptions {
  x: number;
  y: number;
  points: Array<[number, number]>;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  closed?: boolean;
}

export interface TextOptions {
  x: number;
  y: number;
  text: string;
  fontSize?: number;
  fontFamily?: number;
  stroke?: string;
  align?: "left" | "center" | "right";
}

/**
 * Emits Excalidraw elements for one component. Every element it produces carries
 * the component's single groupId and an index that ascends in creation order.
 */
export class Factory {
  readonly groupId: string;
  private readonly rng: () => number;
  private counter = 0;

  constructor(componentName: string) {
    this.rng = mulberry32(seedFromString(componentName));
    this.groupId = `${componentName}-group`;
  }

  /** Positive 31-bit integer from the seeded stream. */
  private int(): number {
    return Math.floor(this.rng() * 2 ** 31);
  }

  private nextId(): string {
    return `${this.groupId}-${this.counter.toString(36)}-${this.int().toString(36)}`;
  }

  /**
   * Fixed-width base-36 counter with a trailing non-zero char: fractional index
   * strings must not end in "0", and fixed width keeps string order == creation order.
   */
  private nextIndex(): string {
    return `a${this.counter.toString(36).padStart(5, "0")}V`;
  }

  private base(type: string, o: {
    x: number; y: number; w: number; h: number;
    fill: string; stroke: string; strokeWidth: number;
    strokeStyle: "solid" | "dashed" | "dotted";
    roundness: { type: number } | null;
    opacity: number;
  }): ExcalidrawElement {
    const el: ExcalidrawElement = {
      id: this.nextId(),
      type,
      x: o.x,
      y: o.y,
      width: o.w,
      height: o.h,
      angle: 0,
      strokeColor: o.stroke,
      backgroundColor: o.fill,
      fillStyle: "solid",
      strokeWidth: o.strokeWidth,
      strokeStyle: o.strokeStyle,
      roughness: style.roughness,
      opacity: o.opacity,
      groupIds: [this.groupId],
      frameId: null,
      index: this.nextIndex(),
      roundness: o.roundness,
      seed: this.int(),
      version: 1,
      versionNonce: this.int(),
      isDeleted: false,
      boundElements: null,
      updated: 1,
      link: null,
      locked: false,
    };
    this.counter++;
    return el;
  }

  rect(o: RectOptions): ExcalidrawElement {
    return this.base("rectangle", {
      x: o.x,
      y: o.y,
      w: o.w,
      h: o.h,
      fill: o.fill ?? color.surface,
      stroke: o.stroke ?? color.ink,
      strokeWidth: o.strokeWidth ?? style.strokeWidth,
      strokeStyle: o.strokeStyle ?? "solid",
      roundness: (o.rounded ?? true) ? { type: 3 } : null,
      opacity: o.opacity ?? 100,
    });
  }

  ellipse(o: RectOptions): ExcalidrawElement {
    return this.base("ellipse", {
      x: o.x,
      y: o.y,
      w: o.w,
      h: o.h,
      fill: o.fill ?? color.surface,
      stroke: o.stroke ?? color.ink,
      strokeWidth: o.strokeWidth ?? style.strokeWidth,
      strokeStyle: o.strokeStyle ?? "solid",
      roundness: null,
      opacity: o.opacity ?? 100,
    });
  }

  line(o: LineOptions): ExcalidrawElement {
    const points: Array<[number, number]> = o.closed
      ? [...o.points, [o.points[0]![0], o.points[0]![1]]]
      : [...o.points];
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const el = this.base("line", {
      x: o.x,
      y: o.y,
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
      fill: o.fill ?? color.transparent,
      stroke: o.stroke ?? color.ink,
      strokeWidth: o.strokeWidth ?? style.strokeWidth,
      strokeStyle: "solid",
      roundness: { type: 2 },
      opacity: 100,
    });
    el.points = points;
    el.lastCommittedPoint = null;
    el.startBinding = null;
    el.endBinding = null;
    el.startArrowhead = null;
    el.endArrowhead = null;
    return el;
  }

  text(o: TextOptions): ExcalidrawElement {
    const fontSize = o.fontSize ?? size.fontMd;
    const align = o.align ?? "left";
    const width = estimateTextWidth(o.text, fontSize);
    const height = fontSize * 1.25;
    const x = align === "center" ? o.x - width / 2 : align === "right" ? o.x - width : o.x;
    const el = this.base("text", {
      x,
      y: o.y,
      w: width,
      h: height,
      fill: color.transparent,
      stroke: o.stroke ?? color.ink,
      strokeWidth: style.strokeWidth,
      strokeStyle: "solid",
      roundness: null,
      opacity: 100,
    });
    el.text = o.text;
    el.originalText = o.text;
    el.fontSize = fontSize;
    el.fontFamily = o.fontFamily ?? font.hand;
    el.textAlign = align;
    el.verticalAlign = "top";
    el.containerId = null;
    el.autoResize = true;
    el.lineHeight = 1.25;
    return el;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/element.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/element.ts tests/element.test.ts
git commit -m "feat: add deterministic Excalidraw element factory"
```

---

### Task 3: Scene and library serialisation

**Files:**
- Create: `src/scene.ts`
- Test: `tests/scene.test.ts`

**Interfaces:**
- Consumes: `ExcalidrawElement` from `src/element.js`.
- Produces:
  - `SOURCE: string` (the literal `"excalidraw-comic-components"`)
  - `toScene(elements: ExcalidrawElement[]): object`
  - `interface LibraryItemInput { name: string; elements: ExcalidrawElement[] }`
  - `toLibrary(items: LibraryItemInput[]): object`

- [ ] **Step 1: Write the failing test**

Create `tests/scene.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { Factory } from "../src/element.js";
import { SOURCE, toLibrary, toScene } from "../src/scene.js";

const els = () => [new Factory("demo").rect({ x: 0, y: 0, w: 10, h: 10 })];

describe("toScene", () => {
  it("wraps elements in a valid scene envelope", () => {
    const scene = toScene(els()) as Record<string, unknown>;
    expect(scene.type).toBe("excalidraw");
    expect(scene.version).toBe(2);
    expect(scene.source).toBe(SOURCE);
    expect(scene.files).toEqual({});
    expect(scene.appState).toEqual({ gridSize: null, viewBackgroundColor: "#ffffff" });
    expect(scene.elements).toHaveLength(1);
  });
});

describe("toLibrary", () => {
  it("wraps items in a valid library envelope", () => {
    const lib = toLibrary([{ name: "Button", elements: els() }]) as Record<string, unknown>;
    expect(lib.type).toBe("excalidrawlib");
    expect(lib.version).toBe(2);
    expect(lib.source).toBe(SOURCE);
    const items = lib.libraryItems as Array<Record<string, unknown>>;
    expect(items).toHaveLength(1);
    expect(items[0]!.name).toBe("Button");
    expect(items[0]!.status).toBe("unpublished");
    expect(items[0]!.created).toBe(0);
    expect(items[0]!.id).toBe("Button");
  });

  it("is deterministic", () => {
    expect(toLibrary([{ name: "Button", elements: els() }]))
      .toEqual(toLibrary([{ name: "Button", elements: els() }]));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/scene.test.ts`
Expected: FAIL — cannot resolve `../src/scene.js`.

- [ ] **Step 3: Write `src/scene.ts`**

```ts
import type { ExcalidrawElement } from "./element.js";

export const SOURCE = "excalidraw-comic-components";

export function toScene(elements: ExcalidrawElement[]): object {
  return {
    type: "excalidraw",
    version: 2,
    source: SOURCE,
    elements,
    appState: { gridSize: null, viewBackgroundColor: "#ffffff" },
    files: {},
  };
}

export interface LibraryItemInput {
  name: string;
  elements: ExcalidrawElement[];
}

export function toLibrary(items: LibraryItemInput[]): object {
  return {
    type: "excalidrawlib",
    version: 2,
    source: SOURCE,
    libraryItems: items.map((item) => ({
      // Stable id and created timestamp keep builds byte-identical.
      id: item.name,
      status: "unpublished",
      created: 0,
      name: item.name,
      elements: item.elements,
    })),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/scene.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scene.ts tests/scene.test.ts
git commit -m "feat: add scene and library serialisation"
```

---

### Task 4: Comic style helpers

**Files:**
- Create: `src/comic.ts`
- Test: `tests/comic.test.ts`

**Interfaces:**
- Consumes: `Factory`, `ExcalidrawElement`, `estimateTextWidth` from `src/element.js`; `color`, `font`, `size`, `style` from `src/tokens.js`.
- Produces (all take the `Factory` as first argument and return `ExcalidrawElement[]`, already in z-order):
  - `inkBox(f, o: { x, y, w, h, fill?, stroke?, rounded?, shadow?, strokeWidth? })`
  - `inkCircle(f, o: { cx, cy, r, fill?, stroke?, shadow? })`
  - `label(f, o: { x, y, text, fontSize?, fontFamily?, stroke?, align? })`
  - `rule(f, o: { x, y, w, stroke?, strokeWidth? })`
  - `checkMark(f, o: { x, y, s, stroke? })`
  - `chevron(f, o: { x, y, s, dir: "down" | "right", stroke? })`
  - `bubble(f, o: { x, y, w, h, tailAt: "bottom" | "top"; tailX: number; fill? })`
  - `burst(f, o: { cx, cy, r, spikes?, fill?, stroke? })`
  - `xMark(f, o: { x, y, s, stroke? })`

**Notes for the implementer:**

`inkBox` emits the shadow rectangle FIRST (`x + style.shadowOffset`, `y + style.shadowOffset`,
filled and stroked with `color.ink`), then the surface rectangle. The shadow has
`strokeWidth: 1` so its own outline does not fatten the silhouette. Same idea for
`inkCircle`.

`label` centres vertically-agnostically: callers pass the text's top-left `y`. To vertically
centre a label inside a box of height `h` at top `y`, callers use `y + (h - fontSize * 1.25) / 2`.

- [ ] **Step 1: Write the failing test**

Create `tests/comic.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { Factory } from "../src/element.js";
import { bubble, burst, checkMark, chevron, inkBox, inkCircle, label, rule, xMark } from "../src/comic.js";
import { color, style } from "../src/tokens.js";

describe("inkBox", () => {
  it("emits a shadow behind the surface", () => {
    const f = new Factory("demo");
    const [shadow, surface] = inkBox(f, { x: 10, y: 20, w: 100, h: 40 });
    expect(shadow!.x).toBe(10 + style.shadowOffset);
    expect(shadow!.y).toBe(20 + style.shadowOffset);
    expect(shadow!.backgroundColor).toBe(color.ink);
    expect(shadow!.strokeColor).toBe(color.ink);
    expect(shadow!.strokeWidth).toBe(1);
    expect(surface!.x).toBe(10);
    expect(surface!.y).toBe(20);
    expect(surface!.backgroundColor).toBe(color.surface);
    // Shadow is emitted first, so it sits behind.
    expect(String(shadow!.index) < String(surface!.index)).toBe(true);
  });

  it("omits the shadow when asked", () => {
    const els = inkBox(new Factory("demo"), { x: 0, y: 0, w: 10, h: 10, shadow: false });
    expect(els).toHaveLength(1);
  });

  it("honours an explicit fill", () => {
    const els = inkBox(new Factory("demo"), { x: 0, y: 0, w: 10, h: 10, fill: color.accent });
    expect(els[1]!.backgroundColor).toBe(color.accent);
  });
});

describe("inkCircle", () => {
  it("emits a shadow and a surface positioned from the centre", () => {
    const [shadow, surface] = inkCircle(new Factory("demo"), { cx: 50, cy: 50, r: 20 });
    expect(surface!.x).toBe(30);
    expect(surface!.y).toBe(30);
    expect(surface!.width).toBe(40);
    expect(surface!.height).toBe(40);
    expect(shadow!.x).toBe(30 + style.shadowOffset);
  });
});

describe("label", () => {
  it("emits exactly one text element", () => {
    const els = label(new Factory("demo"), { x: 0, y: 0, text: "Hi" });
    expect(els).toHaveLength(1);
    expect(els[0]!.type).toBe("text");
    expect(els[0]!.text).toBe("Hi");
  });
});

describe("rule", () => {
  it("emits a horizontal line of the given width", () => {
    const [el] = rule(new Factory("demo"), { x: 5, y: 9, w: 60 });
    expect(el!.type).toBe("line");
    expect(el!.x).toBe(5);
    expect(el!.y).toBe(9);
    expect(el!.points).toEqual([[0, 0], [60, 0]]);
  });
});

describe("checkMark", () => {
  it("emits a three-point tick", () => {
    const [el] = checkMark(new Factory("demo"), { x: 0, y: 0, s: 20 });
    expect(el!.type).toBe("line");
    expect((el!.points as number[][]).length).toBe(3);
  });
});

describe("chevron", () => {
  it("emits a three-point angle", () => {
    const [down] = chevron(new Factory("demo"), { x: 0, y: 0, s: 12, dir: "down" });
    const [right] = chevron(new Factory("demo"), { x: 0, y: 0, s: 12, dir: "right" });
    expect((down!.points as number[][]).length).toBe(3);
    expect((right!.points as number[][]).length).toBe(3);
    expect(down!.points).not.toEqual(right!.points);
  });
});

describe("bubble", () => {
  it("emits a rounded box with a shadow and a closed tail", () => {
    const els = bubble(new Factory("demo"), { x: 0, y: 0, w: 120, h: 60, tailAt: "bottom", tailX: 30 });
    expect(els.length).toBe(3);
    const tail = els[2]!;
    expect(tail.type).toBe("line");
    expect((tail.points as number[][]).length).toBe(4);
    expect(tail.backgroundColor).toBe(color.surface);
  });
});

describe("burst", () => {
  it("emits one closed star polygon", () => {
    const [el] = burst(new Factory("demo"), { cx: 0, cy: 0, r: 30, spikes: 8 });
    expect(el!.type).toBe("line");
    // 8 spikes = 16 alternating points, plus the closing repeat.
    expect((el!.points as number[][]).length).toBe(17);
  });
});

describe("xMark", () => {
  it("emits two crossing lines", () => {
    const els = xMark(new Factory("demo"), { x: 0, y: 0, s: 16 });
    expect(els).toHaveLength(2);
    expect(els.every((e) => e.type === "line")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/comic.test.ts`
Expected: FAIL — cannot resolve `../src/comic.js`.

- [ ] **Step 3: Write `src/comic.ts`**

```ts
import type { ExcalidrawElement, Factory } from "./element.js";
import { color, font, size, style } from "./tokens.js";

/** A filled box with a bold ink outline and a hard offset shadow. */
export function inkBox(
  f: Factory,
  o: {
    x: number; y: number; w: number; h: number;
    fill?: string; stroke?: string; rounded?: boolean;
    shadow?: boolean; strokeWidth?: number;
  },
): ExcalidrawElement[] {
  const out: ExcalidrawElement[] = [];
  if (o.shadow ?? true) {
    out.push(f.rect({
      x: o.x + style.shadowOffset,
      y: o.y + style.shadowOffset,
      w: o.w,
      h: o.h,
      fill: color.ink,
      stroke: color.ink,
      strokeWidth: 1,
      rounded: o.rounded,
    }));
  }
  out.push(f.rect({
    x: o.x,
    y: o.y,
    w: o.w,
    h: o.h,
    fill: o.fill ?? color.surface,
    stroke: o.stroke ?? color.ink,
    strokeWidth: o.strokeWidth,
    rounded: o.rounded,
  }));
  return out;
}

/** Circular counterpart of inkBox, positioned by its centre. */
export function inkCircle(
  f: Factory,
  o: { cx: number; cy: number; r: number; fill?: string; stroke?: string; shadow?: boolean },
): ExcalidrawElement[] {
  const out: ExcalidrawElement[] = [];
  const d = o.r * 2;
  if (o.shadow ?? true) {
    out.push(f.ellipse({
      x: o.cx - o.r + style.shadowOffset,
      y: o.cy - o.r + style.shadowOffset,
      w: d,
      h: d,
      fill: color.ink,
      stroke: color.ink,
      strokeWidth: 1,
    }));
  }
  out.push(f.ellipse({
    x: o.cx - o.r,
    y: o.cy - o.r,
    w: d,
    h: d,
    fill: o.fill ?? color.surface,
    stroke: o.stroke ?? color.ink,
  }));
  return out;
}

export function label(
  f: Factory,
  o: {
    x: number; y: number; text: string;
    fontSize?: number; fontFamily?: number;
    stroke?: string; align?: "left" | "center" | "right";
  },
): ExcalidrawElement[] {
  return [f.text(o)];
}

export function rule(
  f: Factory,
  o: { x: number; y: number; w: number; stroke?: string; strokeWidth?: number },
): ExcalidrawElement[] {
  return [f.line({
    x: o.x,
    y: o.y,
    points: [[0, 0], [o.w, 0]],
    stroke: o.stroke ?? color.border,
    strokeWidth: o.strokeWidth ?? 2,
  })];
}

/** A tick, drawn from the top-left of an `s` by `s` box. */
export function checkMark(
  f: Factory,
  o: { x: number; y: number; s: number; stroke?: string },
): ExcalidrawElement[] {
  const s = o.s;
  return [f.line({
    x: o.x,
    y: o.y,
    points: [[0, s * 0.55], [s * 0.38, s], [s, 0]],
    stroke: o.stroke ?? color.ink,
  })];
}

export function chevron(
  f: Factory,
  o: { x: number; y: number; s: number; dir: "down" | "right"; stroke?: string },
): ExcalidrawElement[] {
  const s = o.s;
  const points: Array<[number, number]> = o.dir === "down"
    ? [[0, 0], [s, s * 0.7], [s * 2, 0]]
    : [[0, 0], [s * 0.7, s], [0, s * 2]];
  return [f.line({ x: o.x, y: o.y, points, stroke: o.stroke ?? color.ink })];
}

/** Speech bubble: box plus a closed triangular tail. */
export function bubble(
  f: Factory,
  o: { x: number; y: number; w: number; h: number; tailAt: "bottom" | "top"; tailX: number; fill?: string },
): ExcalidrawElement[] {
  const out = inkBox(f, { x: o.x, y: o.y, w: o.w, h: o.h, fill: o.fill ?? color.surface });
  const tailY = o.tailAt === "bottom" ? o.y + o.h : o.y;
  const dy = o.tailAt === "bottom" ? 26 : -26;
  out.push(f.line({
    x: o.x + o.tailX,
    y: tailY,
    points: [[0, 0], [22, dy], [40, 0]],
    closed: true,
    fill: o.fill ?? color.surface,
  }));
  return out;
}

/** Comic action starburst. */
export function burst(
  f: Factory,
  o: { cx: number; cy: number; r: number; spikes?: number; fill?: string; stroke?: string },
): ExcalidrawElement[] {
  const spikes = o.spikes ?? 10;
  const inner = o.r * 0.55;
  const points: Array<[number, number]> = [];
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? o.r : inner;
    const angle = (Math.PI * i) / spikes - Math.PI / 2;
    points.push([
      Math.round(Math.cos(angle) * radius * 100) / 100,
      Math.round(Math.sin(angle) * radius * 100) / 100,
    ]);
  }
  // Re-origin so the first point is [0, 0], as the factory expects.
  const [ox, oy] = points[0]!;
  const rel = points.map(([px, py]) => [px - ox, py - oy] as [number, number]);
  return [f.line({
    x: o.cx + ox,
    y: o.cy + oy,
    points: rel,
    closed: true,
    fill: o.fill ?? color.muted,
    stroke: o.stroke ?? color.ink,
  })];
}

/** Close icon: two crossing strokes in an `s` by `s` box. */
export function xMark(
  f: Factory,
  o: { x: number; y: number; s: number; stroke?: string },
): ExcalidrawElement[] {
  const stroke = o.stroke ?? color.ink;
  return [
    f.line({ x: o.x, y: o.y, points: [[0, 0], [o.s, o.s]], stroke }),
    f.line({ x: o.x + o.s, y: o.y, points: [[0, 0], [-o.s, o.s]], stroke }),
  ];
}

/** Re-exported so component files import layout constants from one place. */
export { color, font, size, style };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/comic.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/comic.ts tests/comic.test.ts
git commit -m "feat: add comic style helpers"
```

---

### Task 5: Registry, build, validate, and the Button component

This task wires the whole pipeline end to end with one real component, so every later
task only adds component files and registry lines.

**Files:**
- Create: `src/components/button.ts`
- Create: `src/registry.ts`
- Create: `src/build.ts`
- Create: `src/validate.ts`
- Test: `tests/build.test.ts`

**Interfaces:**
- Consumes: `Factory` from `src/element.js`; helpers from `src/comic.js`; `toScene`, `toLibrary` from `src/scene.js`.
- Produces:
  - `type ComponentBuilder = () => ExcalidrawElement[]`
  - `registry: Record<string, { title: string; build: ComponentBuilder }>` keyed by kebab-case file name
  - `src/validate.ts` exports `validateAll(dir?: string): string[]` returning error messages, and runs itself when executed directly, exiting non-zero on any error.
  - `src/build.ts` exports `buildAll(outDir?: string): void` and runs itself when executed directly.

- [ ] **Step 1: Write `src/components/button.ts`**

```ts
import { Factory, type ExcalidrawElement } from "../element.js";
import { color, font, inkBox, label, size } from "../comic.js";

const W = 200;
const H = 56;
const GAP = 28;

/** Three buttons: default (accent), secondary (surface), disabled (muted, flat). */
export default function button(): ExcalidrawElement[] {
  const f = new Factory("button");
  const els: ExcalidrawElement[] = [];

  const variants = [
    { text: "Click me!", fill: color.accent, ink: color.accentText, shadow: true, opacity: 100 },
    { text: "Secondary", fill: color.surface, ink: color.ink, shadow: true, opacity: 100 },
    { text: "Disabled", fill: color.muted, ink: color.mutedText, shadow: false, opacity: 100 },
  ];

  variants.forEach((v, i) => {
    const y = i * (H + GAP);
    els.push(...inkBox(f, { x: 0, y, w: W, h: H, fill: v.fill, shadow: v.shadow }));
    els.push(...label(f, {
      x: W / 2,
      y: y + (H - size.fontMd * 1.25) / 2,
      text: v.text,
      fontSize: size.fontMd,
      fontFamily: font.comic,
      stroke: v.ink,
      align: "center",
    }));
  });

  return els;
}
```

- [ ] **Step 2: Write `src/registry.ts`**

Later tasks append to this map. Keep it alphabetical by key.

```ts
import type { ExcalidrawElement } from "./element.js";
import button from "./components/button.js";

export type ComponentBuilder = () => ExcalidrawElement[];

export interface ComponentEntry {
  /** Human-readable name, used as the library item name. */
  title: string;
  build: ComponentBuilder;
}

export const registry: Record<string, ComponentEntry> = {
  button: { title: "Button", build: button },
};
```

- [ ] **Step 3: Write `src/build.ts`**

```ts
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { registry } from "./registry.js";
import { toLibrary, toScene, type LibraryItemInput } from "./scene.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_OUT = join(ROOT, "dist");

export function buildAll(outDir: string = DEFAULT_OUT): void {
  const componentsDir = join(outDir, "components");
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(componentsDir, { recursive: true });

  const items: LibraryItemInput[] = [];

  for (const [name, entry] of Object.entries(registry)) {
    const elements = entry.build();
    writeFileSync(
      join(componentsDir, `${name}.excalidraw`),
      `${JSON.stringify(toScene(elements), null, 2)}\n`,
    );
    items.push({ name: entry.title, elements });
  }

  writeFileSync(
    join(outDir, "comic-ui.excalidrawlib"),
    `${JSON.stringify(toLibrary(items), null, 2)}\n`,
  );

  console.log(`Wrote ${items.length} components to ${outDir}`);
}

// Only run when executed directly, not when imported by validate.ts or a test.
if (import.meta.url === `file://${process.argv[1]}`) {
  buildAll();
}
```

- [ ] **Step 4: Write `src/validate.ts`**

```ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_OUT } from "./build.js";
import { PALETTE_VALUES } from "./tokens.js";
import { SOURCE } from "./scene.js";

const REQUIRED_FIELDS = [
  "id", "type", "x", "y", "width", "height", "angle", "strokeColor",
  "backgroundColor", "fillStyle", "strokeWidth", "strokeStyle", "roughness",
  "opacity", "groupIds", "frameId", "index", "roundness", "seed", "version",
  "versionNonce", "isDeleted", "boundElements", "updated", "link", "locked",
];

type El = Record<string, unknown>;

function checkElements(where: string, elements: El[], errors: string[]): void {
  const ids = new Set<string>();
  const groupIds = new Set<string>();
  let previousIndex = "";

  for (const el of elements) {
    const id = String(el.id ?? "");
    if (!id) errors.push(`${where}: element with empty id`);
    if (ids.has(id)) errors.push(`${where}: duplicate element id "${id}"`);
    ids.add(id);

    for (const field of REQUIRED_FIELDS) {
      if (!(field in el)) errors.push(`${where}/${id}: missing field "${field}"`);
    }

    for (const field of ["x", "y", "width", "height"]) {
      const value = el[field];
      if (typeof value !== "number" || !Number.isFinite(value)) {
        errors.push(`${where}/${id}: "${field}" is not a finite number`);
      }
    }

    for (const field of ["strokeColor", "backgroundColor"]) {
      const value = String(el[field]);
      if (!PALETTE_VALUES.has(value)) {
        errors.push(`${where}/${id}: "${field}" value "${value}" is not in the palette`);
      }
    }

    const index = String(el.index ?? "");
    if (index <= previousIndex) {
      errors.push(`${where}/${id}: index "${index}" does not follow "${previousIndex}"`);
    }
    previousIndex = index;

    const groups = el.groupIds;
    if (!Array.isArray(groups) || groups.length !== 1) {
      errors.push(`${where}/${id}: expected exactly one groupId`);
    } else {
      groupIds.add(String(groups[0]));
    }

    if (el.containerId !== undefined && el.containerId !== null) {
      errors.push(`${where}/${id}: containerId must be null`);
    }
    if (el.boundElements !== null) {
      errors.push(`${where}/${id}: boundElements must be null`);
    }
    for (const field of ["startBinding", "endBinding"]) {
      if (el[field] !== undefined && el[field] !== null) {
        errors.push(`${where}/${id}: ${field} must be null`);
      }
    }
  }

  if (groupIds.size > 1) {
    errors.push(`${where}: expected one groupId, found ${[...groupIds].join(", ")}`);
  }
  if (elements.length === 0) {
    errors.push(`${where}: no elements`);
  }
}

export function validateAll(outDir: string = DEFAULT_OUT): string[] {
  const errors: string[] = [];
  const componentsDir = join(outDir, "components");

  const files = readdirSync(componentsDir).filter((f) => f.endsWith(".excalidraw"));
  if (files.length === 0) errors.push("dist/components: no .excalidraw files");

  for (const file of files) {
    const scene = JSON.parse(readFileSync(join(componentsDir, file), "utf8")) as Record<string, unknown>;
    if (scene.type !== "excalidraw") errors.push(`${file}: type is not "excalidraw"`);
    if (scene.version !== 2) errors.push(`${file}: version is not 2`);
    if (scene.source !== SOURCE) errors.push(`${file}: unexpected source`);
    checkElements(file, (scene.elements ?? []) as El[], errors);
  }

  const lib = JSON.parse(
    readFileSync(join(outDir, "comic-ui.excalidrawlib"), "utf8"),
  ) as Record<string, unknown>;
  if (lib.type !== "excalidrawlib") errors.push("library: type is not \"excalidrawlib\"");
  if (lib.version !== 2) errors.push("library: version is not 2");
  const items = (lib.libraryItems ?? []) as Array<Record<string, unknown>>;
  if (items.length !== files.length) {
    errors.push(`library: has ${items.length} items but ${files.length} component files exist`);
  }
  for (const item of items) {
    checkElements(`library/${String(item.name)}`, (item.elements ?? []) as El[], errors);
  }

  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const errors = validateAll();
  if (errors.length > 0) {
    for (const error of errors) console.error(`ERROR ${error}`);
    console.error(`\n${errors.length} validation error(s)`);
    process.exit(1);
  }
  console.log("All generated files are valid.");
}
```

- [ ] **Step 5: Write the failing test**

Create `tests/build.test.ts`. This test builds into a temp directory and validates it, so
it covers the whole pipeline. Later tasks do not need to change it.

```ts
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildAll } from "../src/build.js";
import { validateAll } from "../src/validate.js";
import { registry } from "../src/registry.js";

let out: string;

beforeAll(() => {
  out = mkdtempSync(join(tmpdir(), "comic-ui-"));
  buildAll(out);
});

afterAll(() => {
  rmSync(out, { recursive: true, force: true });
});

describe("build", () => {
  it("produces output that passes validation", () => {
    expect(validateAll(out)).toEqual([]);
  });

  it("writes one scene file per registry entry", () => {
    for (const name of Object.keys(registry)) {
      const scene = JSON.parse(
        readFileSync(join(out, "components", `${name}.excalidraw`), "utf8"),
      );
      expect(scene.elements.length).toBeGreaterThan(0);
    }
  });

  it("is deterministic", () => {
    const first = readFileSync(join(out, "comic-ui.excalidrawlib"), "utf8");
    const second = mkdtempSync(join(tmpdir(), "comic-ui-"));
    buildAll(second);
    expect(readFileSync(join(second, "comic-ui.excalidrawlib"), "utf8")).toBe(first);
    rmSync(second, { recursive: true, force: true });
  });
});

describe("button", () => {
  it("draws three variants: 3 labels, and 2 of the 3 boxes have shadows", () => {
    const scene = JSON.parse(readFileSync(join(out, "components", "button.excalidraw"), "utf8"));
    const els = scene.elements as Array<Record<string, unknown>>;
    expect(els.filter((e) => e.type === "text")).toHaveLength(3);
    // 2 shadowed boxes (2 rects each) + 1 flat box (1 rect) = 5 rectangles.
    expect(els.filter((e) => e.type === "rectangle")).toHaveLength(5);
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npx vitest run tests/build.test.ts`
Expected: FAIL — modules not found (if run before Steps 1–4) or a build error.

- [ ] **Step 7: Run the full pipeline**

```bash
npm run build
npm run validate
npx vitest run
```

Expected: build reports `Wrote 1 components`, validate prints `All generated files are valid.`, all tests pass.

- [ ] **Step 8: Open the result in Excalidraw and eyeball it**

Open <https://excalidraw.com>, use **Menu → Open** and select `dist/components/button.excalidraw`.
Confirm: three buttons appear, outlines are visibly wobbly, each shadowed button has a solid
dark block down-right, and clicking one button selects all its parts as a group.

If the file fails to open, that is a schema bug in `element.ts` — fix it before continuing.

- [ ] **Step 9: Commit**

```bash
git add src/components/button.ts src/registry.ts src/build.ts src/validate.ts tests/build.test.ts dist
git commit -m "feat: add build pipeline, validator, and button component"
```

---

### Task 6: Form input components

**Files:**
- Create: `src/components/input.ts`
- Create: `src/components/textarea.ts`
- Create: `src/components/checkbox-group.ts`
- Create: `src/components/radio-group.ts`
- Create: `src/components/switch.ts`
- Modify: `src/registry.ts`
- Test: `tests/components.test.ts`

**Interfaces:**
- Consumes: `Factory`, `ExcalidrawElement`; `inkBox`, `inkCircle`, `label`, `rule`, `checkMark`, `color`, `font`, `size` from `src/comic.js`.
- Produces: five default-exported `ComponentBuilder`s, registered under keys `input`, `textarea`, `checkbox-group`, `radio-group`, `switch`.

- [ ] **Step 1: Write the shared component test file**

Create `tests/components.test.ts`. Later tasks append `describe` blocks to this file.

```ts
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildAll } from "../src/build.js";
import { color } from "../src/tokens.js";

let out: string;
beforeAll(() => {
  out = mkdtempSync(join(tmpdir(), "comic-ui-comp-"));
  buildAll(out);
});
afterAll(() => rmSync(out, { recursive: true, force: true }));

type El = Record<string, unknown>;

function load(dir: string, name: string): El[] {
  return JSON.parse(readFileSync(join(dir, "components", `${name}.excalidraw`), "utf8")).elements;
}
const count = (els: El[], type: string) => els.filter((e) => e.type === type).length;
const texts = (els: El[]) => els.filter((e) => e.type === "text").map((e) => String(e.text));

describe("input", () => {
  it("shows a placeholder field and a focused field", () => {
    const els = load(out, "input");
    expect(texts(els)).toContain("your@email.com");
    expect(texts(els)).toContain("hello there");
    // Focused field is drawn twice for the doubled outline, plus a caret line.
    expect(count(els, "line")).toBeGreaterThanOrEqual(1);
  });
});

describe("textarea", () => {
  it("has ruled placeholder lines and a resize grip", () => {
    const els = load(out, "textarea");
    // 4 ruled lines + 3 grip strokes.
    expect(count(els, "line")).toBe(7);
  });
});

describe("checkbox-group", () => {
  it("has three boxes with two ticks and three labels", () => {
    const els = load(out, "checkbox-group");
    expect(count(els, "text")).toBe(3);
    // Two ticks, drawn as lines.
    expect(count(els, "line")).toBe(2);
  });

  it("fills checked boxes with accent", () => {
    const els = load(out, "checkbox-group");
    const accentBoxes = els.filter((e) => e.type === "rectangle" && e.backgroundColor === color.accent);
    expect(accentBoxes).toHaveLength(2);
  });
});

describe("radio-group", () => {
  it("has three circles, three labels, and one selected dot", () => {
    const els = load(out, "radio-group");
    expect(count(els, "text")).toBe(3);
    // 3 outer circles x2 (shadow + surface) = 6, plus 1 selected dot = 7.
    expect(count(els, "ellipse")).toBe(7);
  });
});

describe("switch", () => {
  it("has two tracks and two knobs, one on and one off", () => {
    const els = load(out, "switch");
    expect(count(els, "text")).toBe(2);
    const tracks = els.filter((e) => e.type === "rectangle");
    expect(tracks.some((e) => e.backgroundColor === color.accent)).toBe(true);
    expect(tracks.some((e) => e.backgroundColor === color.muted)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/components.test.ts`
Expected: FAIL — `dist/components/input.excalidraw` does not exist.

- [ ] **Step 3: Write `src/components/input.ts`**

```ts
import { Factory, type ExcalidrawElement } from "../element.js";
import { color, inkBox, label, size } from "../comic.js";

const W = size.control;
const H = 56;

/** Two fields: one with placeholder text, one focused with a doubled outline and caret. */
export default function input(): ExcalidrawElement[] {
  const f = new Factory("input");
  const els: ExcalidrawElement[] = [];

  // Resting field.
  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: H }));
  els.push(...label(f, {
    x: 18,
    y: (H - size.fontSm * 1.25) / 2,
    text: "your@email.com",
    fontSize: size.fontSm,
    stroke: color.subtle,
  }));

  // Focused field: a second, offset outline gives the sketchy "double stroke" focus ring.
  const y2 = H + 40;
  els.push(...inkBox(f, { x: 0, y: y2, w: W, h: H }));
  els.push(f.rect({ x: -4, y: y2 - 4, w: W + 8, h: H + 8, fill: color.transparent }));
  els.push(...label(f, {
    x: 18,
    y: y2 + (H - size.fontSm * 1.25) / 2,
    text: "hello there",
    fontSize: size.fontSm,
  }));
  // Caret.
  els.push(f.line({ x: 132, y: y2 + 14, points: [[0, 0], [0, H - 28]], strokeWidth: 2 }));

  return els;
}
```

- [ ] **Step 4: Write `src/components/textarea.ts`**

```ts
import { Factory, type ExcalidrawElement } from "../element.js";
import { color, inkBox, label, rule, size } from "../comic.js";

const W = size.control;
const H = 180;

/** Multi-line box with ruled placeholder lines and a corner resize grip. */
export default function textarea(): ExcalidrawElement[] {
  const f = new Factory("textarea");
  const els: ExcalidrawElement[] = [];

  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: H }));
  els.push(...label(f, {
    x: 18,
    y: 16,
    text: "Tell us your story...",
    fontSize: size.fontSm,
    stroke: color.subtle,
  }));

  // Ruled lines suggesting wrapped text.
  const widths = [W - 52, W - 36, W - 90, W - 140];
  widths.forEach((w, i) => {
    els.push(...rule(f, { x: 18, y: 62 + i * 24, w, stroke: color.muted, strokeWidth: 2 }));
  });

  // Resize grip: three short diagonals in the bottom-right corner.
  for (let i = 0; i < 3; i++) {
    const offset = 8 + i * 8;
    els.push(f.line({
      x: W - offset,
      y: H - 8,
      points: [[0, 0], [offset - 8, -(offset - 8)]],
      stroke: color.subtle,
      strokeWidth: 2,
    }));
  }

  return els;
}
```

- [ ] **Step 5: Write `src/components/checkbox-group.ts`**

```ts
import { Factory, type ExcalidrawElement } from "../element.js";
import { checkMark, color, inkBox, label, size } from "../comic.js";

const BOX = 34;
const ROW = 56;

/** Three stacked checkboxes: checked, unchecked, checked. */
export default function checkboxGroup(): ExcalidrawElement[] {
  const f = new Factory("checkbox-group");
  const els: ExcalidrawElement[] = [];

  const rows = [
    { text: "Ship it", checked: true },
    { text: "Sleep on it", checked: false },
    { text: "Draw it first", checked: true },
  ];

  rows.forEach((row, i) => {
    const y = i * ROW;
    els.push(...inkBox(f, {
      x: 0,
      y,
      w: BOX,
      h: BOX,
      fill: row.checked ? color.accent : color.surface,
    }));
    if (row.checked) {
      els.push(...checkMark(f, { x: 8, y: y + 9, s: 18, stroke: color.accentText }));
    }
    els.push(...label(f, {
      x: BOX + 22,
      y: y + (BOX - size.fontMd * 1.25) / 2,
      text: row.text,
      fontSize: size.fontMd,
    }));
  });

  return els;
}
```

- [ ] **Step 6: Write `src/components/radio-group.ts`**

```ts
import { Factory, type ExcalidrawElement } from "../element.js";
import { color, inkCircle, label, size } from "../comic.js";

const R = 18;
const ROW = 56;

/** Three stacked radios, the second one selected. */
export default function radioGroup(): ExcalidrawElement[] {
  const f = new Factory("radio-group");
  const els: ExcalidrawElement[] = [];

  const rows = [
    { text: "Pencil", selected: false },
    { text: "Ink pen", selected: true },
    { text: "Marker", selected: false },
  ];

  rows.forEach((row, i) => {
    const cy = R + i * ROW;
    els.push(...inkCircle(f, { cx: R, cy, r: R }));
    if (row.selected) {
      els.push(f.ellipse({ x: R - 8, y: cy - 8, w: 16, h: 16, fill: color.accent }));
    }
    els.push(...label(f, {
      x: R * 2 + 22,
      y: cy - (size.fontMd * 1.25) / 2,
      text: row.text,
      fontSize: size.fontMd,
    }));
  });

  return els;
}
```

- [ ] **Step 7: Write `src/components/switch.ts`**

```ts
import { Factory, type ExcalidrawElement } from "../element.js";
import { color, inkBox, inkCircle, label, size } from "../comic.js";

const TRACK_W = 88;
const TRACK_H = 44;
const KNOB_R = 15;
const ROW = 72;

/** Two switches: off (knob left, muted track) and on (knob right, accent track). */
export default function switchComponent(): ExcalidrawElement[] {
  const f = new Factory("switch");
  const els: ExcalidrawElement[] = [];

  const rows = [
    { text: "Notifications", on: false },
    { text: "Sloppy mode", on: true },
  ];

  rows.forEach((row, i) => {
    const y = i * ROW;
    els.push(...inkBox(f, {
      x: 0,
      y,
      w: TRACK_W,
      h: TRACK_H,
      fill: row.on ? color.accent : color.muted,
    }));
    const cx = row.on ? TRACK_W - KNOB_R - 7 : KNOB_R + 7;
    els.push(...inkCircle(f, { cx, cy: y + TRACK_H / 2, r: KNOB_R, shadow: false }));
    els.push(...label(f, {
      x: TRACK_W + 24,
      y: y + (TRACK_H - size.fontMd * 1.25) / 2,
      text: row.text,
      fontSize: size.fontMd,
    }));
  });

  return els;
}
```

- [ ] **Step 8: Register the five components**

Edit `src/registry.ts` — add these imports below the `button` import:

```ts
import checkboxGroup from "./components/checkbox-group.js";
import input from "./components/input.js";
import radioGroup from "./components/radio-group.js";
import switchComponent from "./components/switch.js";
import textarea from "./components/textarea.js";
```

and these entries to the `registry` object, keeping keys alphabetical:

```ts
  "checkbox-group": { title: "Checkbox Group", build: checkboxGroup },
  input: { title: "Input", build: input },
  "radio-group": { title: "Radio Group", build: radioGroup },
  switch: { title: "Switch", build: switchComponent },
  textarea: { title: "Textarea", build: textarea },
```

- [ ] **Step 9: Run build, validate and tests**

```bash
npm run build && npm run validate && npx vitest run
```

Expected: `Wrote 6 components`, no validation errors, all tests pass.

If a count assertion in `tests/components.test.ts` fails, read the failure: it tells you the
actual element count. Decide whether the component or the assertion is wrong, and fix that
one. Do not loosen an assertion just to make it pass.

- [ ] **Step 10: Eyeball in Excalidraw**

Open each of the five new files from `dist/components/`. Confirm the checked checkboxes have a
visible white tick on a dark fill, the selected radio has a dark dot, and the "on" switch has
its knob on the right.

- [ ] **Step 11: Commit**

```bash
git add src tests dist
git commit -m "feat: add input, textarea, checkbox group, radio group and switch"
```

---

### Task 7: Select and Dropdown Menu

**Files:**
- Create: `src/components/select.ts`
- Create: `src/components/dropdown-menu.ts`
- Modify: `src/registry.ts`
- Modify: `tests/components.test.ts`

**Interfaces:**
- Consumes: `inkBox`, `label`, `rule`, `chevron`, `color`, `font`, `size` from `src/comic.js`.
- Produces: builders registered as `select` and `dropdown-menu`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/components.test.ts`:

```ts
describe("select", () => {
  it("shows a trigger with a chevron and an open menu with a highlighted item", () => {
    const els = load(out, "select");
    expect(texts(els)).toContain("Pick a style");
    expect(texts(els)).toContain("Comic");
    // One chevron line.
    expect(count(els, "line")).toBe(1);
    // The highlighted menu row is an accent-filled rectangle.
    expect(els.some((e) => e.type === "rectangle" && e.backgroundColor === color.accent)).toBe(true);
  });
});

describe("dropdown-menu", () => {
  it("shows a trigger, four items, one hover row and one separator", () => {
    const els = load(out, "dropdown-menu");
    expect(texts(els)).toContain("Duplicate");
    expect(texts(els)).toContain("Delete");
    // One separator rule.
    expect(count(els, "line")).toBe(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/components.test.ts`
Expected: FAIL — `dist/components/select.excalidraw` does not exist.

- [ ] **Step 3: Write `src/components/select.ts`**

```ts
import { Factory, type ExcalidrawElement } from "../element.js";
import { chevron, color, inkBox, label, size } from "../comic.js";

const W = size.control;
const TRIGGER_H = 56;
const ITEM_H = 46;

/** Closed trigger with a chevron, plus the open menu with one highlighted item. */
export default function select(): ExcalidrawElement[] {
  const f = new Factory("select");
  const els: ExcalidrawElement[] = [];

  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: TRIGGER_H }));
  els.push(...label(f, {
    x: 18,
    y: (TRIGGER_H - size.fontMd * 1.25) / 2,
    text: "Pick a style",
    fontSize: size.fontMd,
  }));
  els.push(...chevron(f, { x: W - 42, y: TRIGGER_H / 2 - 5, s: 12, dir: "down" }));

  // Open menu.
  const items = ["Sketchy", "Comic", "Clean"];
  const menuY = TRIGGER_H + 22;
  const menuH = items.length * ITEM_H + 16;
  els.push(...inkBox(f, { x: 0, y: menuY, w: W, h: menuH }));

  items.forEach((text, i) => {
    const y = menuY + 8 + i * ITEM_H;
    const highlighted = text === "Comic";
    if (highlighted) {
      els.push(f.rect({ x: 8, y, w: W - 16, h: ITEM_H, fill: color.accent }));
    }
    els.push(...label(f, {
      x: 22,
      y: y + (ITEM_H - size.fontSm * 1.25) / 2,
      text,
      fontSize: size.fontSm,
      stroke: highlighted ? color.accentText : color.ink,
    }));
  });

  return els;
}
```

- [ ] **Step 4: Write `src/components/dropdown-menu.ts`**

```ts
import { Factory, type ExcalidrawElement } from "../element.js";
import { color, font, inkBox, label, rule, size } from "../comic.js";

const W = 260;
const TRIGGER_W = 150;
const TRIGGER_H = 52;
const ITEM_H = 46;

/** Trigger plus an open menu: four items, one hovered, one separator before the last. */
export default function dropdownMenu(): ExcalidrawElement[] {
  const f = new Factory("dropdown-menu");
  const els: ExcalidrawElement[] = [];

  els.push(...inkBox(f, { x: 0, y: 0, w: TRIGGER_W, h: TRIGGER_H }));
  els.push(...label(f, {
    x: TRIGGER_W / 2,
    y: (TRIGGER_H - size.fontMd * 1.25) / 2,
    text: "Actions",
    fontSize: size.fontMd,
    fontFamily: font.comic,
    align: "center",
  }));

  const items = [
    { text: "Edit", hovered: false },
    { text: "Duplicate", hovered: true },
    { text: "Share", hovered: false },
    { text: "Delete", hovered: false, danger: true },
  ];

  const menuY = TRIGGER_H + 22;
  // Room for four rows, 16px of padding and a separator gap.
  const menuH = items.length * ITEM_H + 16 + 12;
  els.push(...inkBox(f, { x: 0, y: menuY, w: W, h: menuH }));

  items.forEach((item, i) => {
    // The last item sits below the separator, so it gets pushed down.
    const y = menuY + 8 + i * ITEM_H + (i === items.length - 1 ? 12 : 0);
    if (i === items.length - 1) {
      els.push(...rule(f, { x: 12, y: y - 6, w: W - 24, stroke: color.border }));
    }
    if (item.hovered) {
      els.push(f.rect({ x: 8, y, w: W - 16, h: ITEM_H, fill: color.muted }));
    }
    els.push(...label(f, {
      x: 22,
      y: y + (ITEM_H - size.fontSm * 1.25) / 2,
      text: item.text,
      fontSize: size.fontSm,
      stroke: item.danger ? color.mutedText : color.ink,
    }));
  });

  return els;
}
```

- [ ] **Step 5: Register both components**

Edit `src/registry.ts` — add imports:

```ts
import dropdownMenu from "./components/dropdown-menu.js";
import select from "./components/select.js";
```

and entries:

```ts
  "dropdown-menu": { title: "Dropdown Menu", build: dropdownMenu },
  select: { title: "Select", build: select },
```

- [ ] **Step 6: Run build, validate and tests**

```bash
npm run build && npm run validate && npx vitest run
```

Expected: `Wrote 8 components`, no errors, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src tests dist
git commit -m "feat: add select and dropdown menu"
```

---

### Task 8: Card, Badge, Alert and Avatar

**Files:**
- Create: `src/components/card.ts`
- Create: `src/components/badge.ts`
- Create: `src/components/alert.ts`
- Create: `src/components/avatar.ts`
- Modify: `src/registry.ts`
- Modify: `tests/components.test.ts`

**Interfaces:**
- Consumes: `inkBox`, `inkCircle`, `label`, `rule`, `burst`, `color`, `font`, `size` from `src/comic.js`.
- Produces: builders registered as `card`, `badge`, `alert`, `avatar`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/components.test.ts`:

```ts
describe("card", () => {
  it("has a title, two body lines and a footer button", () => {
    const els = load(out, "card");
    expect(texts(els)).toContain("Sketch Kit");
    expect(texts(els)).toContain("Get it");
    expect(count(els, "line")).toBe(2);
  });
});

describe("badge", () => {
  it("has four badges with four labels", () => {
    const els = load(out, "badge");
    expect(count(els, "text")).toBe(4);
    expect(texts(els)).toContain("New");
  });
});

describe("alert", () => {
  it("has a burst behind the icon plus a title and body", () => {
    const els = load(out, "alert");
    const bursts = els.filter((e) => e.type === "line" && Array.isArray(e.points) && (e.points as unknown[]).length > 10);
    expect(bursts).toHaveLength(1);
    expect(texts(els)).toContain("Heads up!");
  });
});

describe("avatar", () => {
  it("has an image placeholder, an initials circle and a stack of three", () => {
    const els = load(out, "avatar");
    expect(texts(els)).toContain("GS");
    // 2 shadowed avatars (2 ellipses each) = 4, + 2 glyph ellipses = 6,
    // + 3 flat stacked avatars (1 each) = 9.
    expect(count(els, "ellipse")).toBe(9);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/components.test.ts`
Expected: FAIL — `dist/components/card.excalidraw` does not exist.

- [ ] **Step 3: Write `src/components/card.ts`**

```ts
import { Factory, type ExcalidrawElement } from "../element.js";
import { color, font, inkBox, label, rule, size } from "../comic.js";

const W = 340;
const H = 230;

/** Title, description lines, and a footer button. */
export default function card(): ExcalidrawElement[] {
  const f = new Factory("card");
  const els: ExcalidrawElement[] = [];

  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: H }));

  els.push(...label(f, {
    x: 24,
    y: 24,
    text: "Sketch Kit",
    fontSize: size.fontLg,
    fontFamily: font.comic,
  }));
  els.push(...label(f, {
    x: 24,
    y: 66,
    text: "Hand-drawn UI parts",
    fontSize: size.fontSm,
    stroke: color.mutedText,
  }));

  // Two ruled lines standing in for body copy.
  els.push(...rule(f, { x: 24, y: 108, w: W - 48, stroke: color.muted }));
  els.push(...rule(f, { x: 24, y: 130, w: W - 110, stroke: color.muted }));

  // Footer button.
  const btnW = 120;
  const btnH = 48;
  const btnY = H - btnH - 24;
  els.push(...inkBox(f, { x: 24, y: btnY, w: btnW, h: btnH, fill: color.accent }));
  els.push(...label(f, {
    x: 24 + btnW / 2,
    y: btnY + (btnH - size.fontSm * 1.25) / 2,
    text: "Get it",
    fontSize: size.fontSm,
    fontFamily: font.comic,
    stroke: color.accentText,
    align: "center",
  }));

  return els;
}
```

- [ ] **Step 4: Write `src/components/badge.ts`**

```ts
import { Factory, type ExcalidrawElement } from "../element.js";
import { color, font, inkBox, label, size } from "../comic.js";

const H = 38;
const GAP = 16;
const PAD = 18;

/** Row of four badges: default, secondary, outline, dark. */
export default function badge(): ExcalidrawElement[] {
  const f = new Factory("badge");
  const els: ExcalidrawElement[] = [];

  const variants = [
    { text: "New", fill: color.accent, ink: color.accentText },
    { text: "Beta", fill: color.muted, ink: color.ink },
    { text: "Draft", fill: color.transparent, ink: color.ink },
    { text: "Hot", fill: color.ink, ink: color.accentText },
  ];

  let x = 0;
  for (const v of variants) {
    const w = v.text.length * size.fontSm * 0.55 + PAD * 2;
    els.push(...inkBox(f, { x, y: 0, w, h: H, fill: v.fill, shadow: false }));
    els.push(...label(f, {
      x: x + w / 2,
      y: (H - size.fontSm * 1.25) / 2,
      text: v.text,
      fontSize: size.fontSm,
      fontFamily: font.comic,
      stroke: v.ink,
      align: "center",
    }));
    x += w + GAP;
  }

  return els;
}
```

- [ ] **Step 5: Write `src/components/alert.ts`**

```ts
import { Factory, type ExcalidrawElement } from "../element.js";
import { burst, color, font, inkBox, label, size } from "../comic.js";

const W = 380;
const H = 120;

/** Icon slot with a comic burst behind it, plus a title and body. */
export default function alert(): ExcalidrawElement[] {
  const f = new Factory("alert");
  const els: ExcalidrawElement[] = [];

  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: H, fill: color.surface }));

  // Burst sits behind the "!" glyph.
  els.push(...burst(f, { cx: 52, cy: H / 2, r: 30, spikes: 10, fill: color.muted }));
  els.push(...label(f, {
    x: 52,
    y: H / 2 - (size.fontLg * 1.25) / 2,
    text: "!",
    fontSize: size.fontLg,
    fontFamily: font.comic,
    align: "center",
  }));

  els.push(...label(f, {
    x: 100,
    y: 28,
    text: "Heads up!",
    fontSize: size.fontMd,
    fontFamily: font.comic,
  }));
  els.push(...label(f, {
    x: 100,
    y: 62,
    text: "Your drawing was not saved.",
    fontSize: size.fontSm,
    stroke: color.mutedText,
  }));

  return els;
}
```

- [ ] **Step 6: Write `src/components/avatar.ts`**

```ts
import { Factory, type ExcalidrawElement } from "../element.js";
import { color, font, inkCircle, label, size } from "../comic.js";

const R = 30;

/** Three avatars: image placeholder, initials, and an overlapping stack. */
export default function avatar(): ExcalidrawElement[] {
  const f = new Factory("avatar");
  const els: ExcalidrawElement[] = [];

  // 1. Image placeholder: a head-and-shoulders glyph built from two ellipses.
  els.push(...inkCircle(f, { cx: R, cy: R, r: R, fill: color.muted }));
  els.push(f.ellipse({ x: R - 10, y: R - 18, w: 20, h: 20, fill: color.mutedText, stroke: color.ink }));
  els.push(f.ellipse({ x: R - 20, y: R + 6, w: 40, h: 34, fill: color.mutedText, stroke: color.ink }));

  // 2. Initials.
  const cx2 = R * 2 + 40 + R;
  els.push(...inkCircle(f, { cx: cx2, cy: R, r: R, fill: color.accent }));
  els.push(...label(f, {
    x: cx2,
    y: R - (size.fontMd * 1.25) / 2,
    text: "GS",
    fontSize: size.fontMd,
    fontFamily: font.comic,
    stroke: color.accentText,
    align: "center",
  }));

  // 3. Overlapping stack of three.
  const fills = [color.surface, color.muted, color.accent];
  const startX = cx2 + R + 60 + R;
  fills.forEach((fill, i) => {
    els.push(...inkCircle(f, { cx: startX + i * (R + 12), cy: R, r: R, fill, shadow: false }));
  });

  return els;
}
```

- [ ] **Step 7: Register the four components**

Edit `src/registry.ts` — add imports:

```ts
import alert from "./components/alert.js";
import avatar from "./components/avatar.js";
import badge from "./components/badge.js";
import card from "./components/card.js";
```

and entries:

```ts
  alert: { title: "Alert", build: alert },
  avatar: { title: "Avatar", build: avatar },
  badge: { title: "Badge", build: badge },
  card: { title: "Card", build: card },
```

- [ ] **Step 8: Run build, validate and tests**

```bash
npm run build && npm run validate && npx vitest run
```

Expected: `Wrote 12 components`, no errors, all tests pass.

- [ ] **Step 9: Commit**

```bash
git add src tests dist
git commit -m "feat: add card, badge, alert and avatar"
```

---

### Task 9: Tabs and Table

**Files:**
- Create: `src/components/tabs.ts`
- Create: `src/components/table.ts`
- Modify: `src/registry.ts`
- Modify: `tests/components.test.ts`

**Interfaces:**
- Consumes: `inkBox`, `label`, `rule`, `color`, `font`, `size` from `src/comic.js`.
- Produces: builders registered as `tabs` and `table`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/components.test.ts`:

```ts
describe("tabs", () => {
  it("has three headers with the first active, and a panel", () => {
    const els = load(out, "tabs");
    expect(texts(els)).toEqual(expect.arrayContaining(["Preview", "Code", "Notes"]));
    // Only the active tab is accent-filled.
    const active = els.filter((e) => e.type === "rectangle" && e.backgroundColor === color.accent);
    expect(active).toHaveLength(1);
  });
});

describe("table", () => {
  it("has a header row, three body rows and alternating stripes", () => {
    const els = load(out, "table");
    expect(texts(els)).toEqual(expect.arrayContaining(["Name", "Role", "Ada", "Grace"]));
    const striped = els.filter((e) => e.type === "rectangle" && e.backgroundColor === color.muted);
    // Header row plus one striped body row.
    expect(striped.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/components.test.ts`
Expected: FAIL — `dist/components/tabs.excalidraw` does not exist.

- [ ] **Step 3: Write `src/components/tabs.ts`**

```ts
import { Factory, type ExcalidrawElement } from "../element.js";
import { color, font, inkBox, label, size } from "../comic.js";

const TAB_W = 120;
const TAB_H = 48;
const W = TAB_W * 3;
const PANEL_H = 150;

/** Three tab headers with the first active, plus the panel below. */
export default function tabs(): ExcalidrawElement[] {
  const f = new Factory("tabs");
  const els: ExcalidrawElement[] = [];

  // Panel first, so the active tab's outline overlaps it.
  const panelY = TAB_H;
  els.push(...inkBox(f, { x: 0, y: panelY, w: W, h: PANEL_H }));

  const titles = ["Preview", "Code", "Notes"];
  titles.forEach((title, i) => {
    const active = i === 0;
    const x = i * TAB_W;
    els.push(f.rect({
      x,
      y: 0,
      w: TAB_W,
      h: TAB_H,
      fill: active ? color.accent : color.muted,
    }));
    els.push(...label(f, {
      x: x + TAB_W / 2,
      y: (TAB_H - size.fontSm * 1.25) / 2,
      text: title,
      fontSize: size.fontSm,
      fontFamily: font.comic,
      stroke: active ? color.accentText : color.mutedText,
      align: "center",
    }));
  });

  els.push(...label(f, {
    x: 24,
    y: panelY + 32,
    text: "Panel content lives here.",
    fontSize: size.fontSm,
    stroke: color.mutedText,
  }));

  return els;
}
```

- [ ] **Step 4: Write `src/components/table.ts`**

```ts
import { Factory, type ExcalidrawElement } from "../element.js";
import { color, font, inkBox, label, rule, size } from "../comic.js";

const W = 380;
const ROW_H = 50;
const COL_X = [20, 200];

/** Header row plus three body rows with alternating stripes. */
export default function table(): ExcalidrawElement[] {
  const f = new Factory("table");
  const els: ExcalidrawElement[] = [];

  const rows = [
    ["Ada", "Engineer"],
    ["Grace", "Admiral"],
    ["Alan", "Theorist"],
  ];
  const H = ROW_H * (rows.length + 1);

  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: H }));

  // Header band.
  els.push(f.rect({ x: 0, y: 0, w: W, h: ROW_H, fill: color.muted, rounded: false }));
  ["Name", "Role"].forEach((text, c) => {
    els.push(...label(f, {
      x: COL_X[c]!,
      y: (ROW_H - size.fontSm * 1.25) / 2,
      text,
      fontSize: size.fontSm,
      fontFamily: font.comic,
    }));
  });

  rows.forEach((row, r) => {
    const y = ROW_H * (r + 1);
    // Stripe every other body row.
    if (r % 2 === 1) {
      els.push(f.rect({ x: 0, y, w: W, h: ROW_H, fill: color.muted, rounded: false, opacity: 60 }));
    }
    els.push(...rule(f, { x: 0, y, w: W, stroke: color.border }));
    row.forEach((cell, c) => {
      els.push(...label(f, {
        x: COL_X[c]!,
        y: y + (ROW_H - size.fontSm * 1.25) / 2,
        text: cell,
        fontSize: size.fontSm,
      }));
    });
  });

  return els;
}
```

- [ ] **Step 5: Register both components**

Edit `src/registry.ts` — add imports:

```ts
import table from "./components/table.js";
import tabs from "./components/tabs.js";
```

and entries:

```ts
  table: { title: "Table", build: table },
  tabs: { title: "Tabs", build: tabs },
```

- [ ] **Step 6: Run build, validate and tests**

```bash
npm run build && npm run validate && npx vitest run
```

Expected: `Wrote 14 components`, no errors, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src tests dist
git commit -m "feat: add tabs and table"
```

---

### Task 10: Progress and Slider

**Files:**
- Create: `src/components/progress.ts`
- Create: `src/components/slider.ts`
- Modify: `src/registry.ts`
- Modify: `tests/components.test.ts`

**Interfaces:**
- Consumes: `inkBox`, `inkCircle`, `label`, `bubble`, `color`, `font`, `size` from `src/comic.js`.
- Produces: builders registered as `progress` and `slider`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/components.test.ts`:

```ts
describe("progress", () => {
  it("has two tracks and two accent fills", () => {
    const els = load(out, "progress");
    const fills = els.filter((e) => e.type === "rectangle" && e.backgroundColor === color.accent);
    expect(fills).toHaveLength(2);
    expect(texts(els)).toEqual(expect.arrayContaining(["35%", "80%"]));
  });
});

describe("slider", () => {
  it("has a filled track, a knob and a value bubble", () => {
    const els = load(out, "slider");
    expect(texts(els)).toContain("64");
    // Knob: shadow + surface ellipse.
    expect(count(els, "ellipse")).toBe(2);
    // Bubble tail is a closed 4-point line.
    const tails = els.filter((e) => e.type === "line" && (e.points as unknown[]).length === 4);
    expect(tails).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/components.test.ts`
Expected: FAIL — `dist/components/progress.excalidraw` does not exist.

- [ ] **Step 3: Write `src/components/progress.ts`**

```ts
import { Factory, type ExcalidrawElement } from "../element.js";
import { color, inkBox, label, size } from "../comic.js";

const W = size.control;
const H = 32;
const ROW = 76;

/** Two bars at 35% and 80%. */
export default function progress(): ExcalidrawElement[] {
  const f = new Factory("progress");
  const els: ExcalidrawElement[] = [];

  [35, 80].forEach((pct, i) => {
    const y = i * ROW;
    els.push(...inkBox(f, { x: 0, y, w: W, h: H, fill: color.muted }));
    // Inset by 5px so the fill sits inside the wobbly outline.
    els.push(f.rect({
      x: 5,
      y: y + 5,
      w: ((W - 10) * pct) / 100,
      h: H - 10,
      fill: color.accent,
    }));
    els.push(...label(f, {
      x: W + 20,
      y: y + (H - size.fontSm * 1.25) / 2,
      text: `${pct}%`,
      fontSize: size.fontSm,
      stroke: color.mutedText,
    }));
  });

  return els;
}
```

- [ ] **Step 4: Write `src/components/slider.ts`**

```ts
import { Factory, type ExcalidrawElement } from "../element.js";
import { bubble, color, font, inkBox, inkCircle, label, size } from "../comic.js";

const W = size.control;
const TRACK_H = 16;
const VALUE = 64;
const BUBBLE_W = 76;
const BUBBLE_H = 48;

/** Track, filled portion, knob, and a value bubble above the knob. */
export default function slider(): ExcalidrawElement[] {
  const f = new Factory("slider");
  const els: ExcalidrawElement[] = [];

  const trackY = 90;
  const knobX = (W * VALUE) / 100;

  els.push(...inkBox(f, { x: 0, y: trackY, w: W, h: TRACK_H, fill: color.muted }));
  els.push(f.rect({ x: 4, y: trackY + 4, w: knobX - 4, h: TRACK_H - 8, fill: color.accent }));
  els.push(...inkCircle(f, { cx: knobX, cy: trackY + TRACK_H / 2, r: 20 }));

  // Value bubble, tail pointing down at the knob.
  const bubbleX = knobX - BUBBLE_W / 2;
  els.push(...bubble(f, {
    x: bubbleX,
    y: trackY - BUBBLE_H - 42,
    w: BUBBLE_W,
    h: BUBBLE_H,
    tailAt: "bottom",
    tailX: BUBBLE_W / 2 - 20,
  }));
  els.push(...label(f, {
    x: knobX,
    y: trackY - BUBBLE_H - 42 + (BUBBLE_H - size.fontMd * 1.25) / 2,
    text: String(VALUE),
    fontSize: size.fontMd,
    fontFamily: font.comic,
    align: "center",
  }));

  return els;
}
```

- [ ] **Step 5: Register both components**

Edit `src/registry.ts` — add imports:

```ts
import progress from "./components/progress.js";
import slider from "./components/slider.js";
```

and entries:

```ts
  progress: { title: "Progress", build: progress },
  slider: { title: "Slider", build: slider },
```

- [ ] **Step 6: Run build, validate and tests**

```bash
npm run build && npm run validate && npx vitest run
```

Expected: `Wrote 16 components`, no errors, all tests pass.

- [ ] **Step 7: Eyeball the slider in Excalidraw**

Open `dist/components/slider.excalidraw`. The bubble's tail must point down at the knob and
its fill must hide the bubble's bottom border where they meet. If the tail is inverted or
detached, adjust `bubble`'s tail geometry in `src/comic.ts` and rebuild.

- [ ] **Step 8: Commit**

```bash
git add src tests dist
git commit -m "feat: add progress and slider"
```

---

### Task 11: Tooltip and Dialog

**Files:**
- Create: `src/components/tooltip.ts`
- Create: `src/components/dialog.ts`
- Modify: `src/registry.ts`
- Modify: `tests/components.test.ts`

**Interfaces:**
- Consumes: `inkBox`, `label`, `rule`, `bubble`, `xMark`, `color`, `font`, `size` from `src/comic.js`.
- Produces: builders registered as `tooltip` and `dialog`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/components.test.ts`:

```ts
describe("tooltip", () => {
  it("has a trigger and a speech bubble with a tail", () => {
    const els = load(out, "tooltip");
    expect(texts(els)).toContain("Save your work!");
    const tails = els.filter((e) => e.type === "line" && (e.points as unknown[]).length === 4);
    expect(tails).toHaveLength(1);
  });
});

describe("dialog", () => {
  it("has a panel frame, a close X, and two footer buttons", () => {
    const els = load(out, "dialog");
    expect(texts(els)).toEqual(expect.arrayContaining(["Delete drawing?", "Cancel", "Delete"]));
    // The close X is two 2-point lines; body copy is two ruled lines.
    expect(count(els, "line")).toBe(4);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/components.test.ts`
Expected: FAIL — `dist/components/tooltip.excalidraw` does not exist.

- [ ] **Step 3: Write `src/components/tooltip.ts`**

```ts
import { Factory, type ExcalidrawElement } from "../element.js";
import { bubble, color, font, inkBox, label, size } from "../comic.js";

const BTN_W = 140;
const BTN_H = 52;
const BUBBLE_W = 220;
const BUBBLE_H = 60;

/** A trigger button with a comic speech bubble pointing down at it. */
export default function tooltip(): ExcalidrawElement[] {
  const f = new Factory("tooltip");
  const els: ExcalidrawElement[] = [];

  const btnY = BUBBLE_H + 60;

  els.push(...bubble(f, {
    x: 0,
    y: 0,
    w: BUBBLE_W,
    h: BUBBLE_H,
    tailAt: "bottom",
    tailX: BTN_W / 2 - 20,
  }));
  els.push(...label(f, {
    x: BUBBLE_W / 2,
    y: (BUBBLE_H - size.fontSm * 1.25) / 2,
    text: "Save your work!",
    fontSize: size.fontSm,
    fontFamily: font.comic,
    align: "center",
  }));

  els.push(...inkBox(f, { x: 0, y: btnY, w: BTN_W, h: BTN_H, fill: color.accent }));
  els.push(...label(f, {
    x: BTN_W / 2,
    y: btnY + (BTN_H - size.fontSm * 1.25) / 2,
    text: "Save",
    fontSize: size.fontSm,
    fontFamily: font.comic,
    stroke: color.accentText,
    align: "center",
  }));

  return els;
}
```

- [ ] **Step 4: Write `src/components/dialog.ts`**

```ts
import { Factory, type ExcalidrawElement } from "../element.js";
import { color, font, inkBox, label, rule, size, xMark } from "../comic.js";

const W = 420;
const H = 250;
const BTN_W = 130;
const BTN_H = 50;

/** Comic panel frame: title, body lines, close X, and two footer buttons. */
export default function dialog(): ExcalidrawElement[] {
  const f = new Factory("dialog");
  const els: ExcalidrawElement[] = [];

  // Sharp corners read as a comic panel rather than a soft modal.
  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: H, rounded: false }));
  // Inner panel line, the classic comic double frame.
  els.push(f.rect({
    x: 10,
    y: 10,
    w: W - 20,
    h: H - 20,
    fill: color.transparent,
    strokeWidth: 2,
    rounded: false,
  }));

  els.push(...label(f, {
    x: 30,
    y: 30,
    text: "Delete drawing?",
    fontSize: size.fontLg,
    fontFamily: font.comic,
  }));

  els.push(...rule(f, { x: 30, y: 92, w: W - 120, stroke: color.muted }));
  els.push(...rule(f, { x: 30, y: 116, w: W - 200, stroke: color.muted }));

  els.push(...xMark(f, { x: W - 44, y: 26, s: 18 }));

  const btnY = H - BTN_H - 26;
  const buttons = [
    { text: "Cancel", x: W - BTN_W * 2 - 44, fill: color.surface, ink: color.ink },
    { text: "Delete", x: W - BTN_W - 30, fill: color.accent, ink: color.accentText },
  ];
  for (const b of buttons) {
    els.push(...inkBox(f, { x: b.x, y: btnY, w: BTN_W, h: BTN_H, fill: b.fill }));
    els.push(...label(f, {
      x: b.x + BTN_W / 2,
      y: btnY + (BTN_H - size.fontSm * 1.25) / 2,
      text: b.text,
      fontSize: size.fontSm,
      fontFamily: font.comic,
      stroke: b.ink,
      align: "center",
    }));
  }

  return els;
}
```

- [ ] **Step 5: Register both components**

Edit `src/registry.ts` — add imports:

```ts
import dialog from "./components/dialog.js";
import tooltip from "./components/tooltip.js";
```

and entries:

```ts
  dialog: { title: "Dialog", build: dialog },
  tooltip: { title: "Tooltip", build: tooltip },
```

- [ ] **Step 6: Run build, validate and tests**

```bash
npm run build && npm run validate && npx vitest run
```

Expected: `Wrote 18 components`, no errors, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src tests dist
git commit -m "feat: add tooltip and dialog"
```

---

### Task 12: Breadcrumb and Pagination

**Files:**
- Create: `src/components/breadcrumb.ts`
- Create: `src/components/pagination.ts`
- Modify: `src/registry.ts`
- Modify: `tests/components.test.ts`

**Interfaces:**
- Consumes: `inkBox`, `label`, `chevron`, `color`, `font`, `size`, `estimateTextWidth` from `src/comic.js` / `src/element.js`.
- Produces: builders registered as `breadcrumb` and `pagination`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/components.test.ts`:

```ts
describe("breadcrumb", () => {
  it("has three crumbs and two chevron separators", () => {
    const els = load(out, "breadcrumb");
    expect(texts(els)).toEqual(expect.arrayContaining(["Home", "Library", "Button"]));
    expect(count(els, "line")).toBe(2);
  });
});

describe("pagination", () => {
  it("has five page cells with one active, plus prev and next arrows", () => {
    const els = load(out, "pagination");
    expect(texts(els)).toEqual(expect.arrayContaining(["1", "2", "3", "4", "5"]));
    const active = els.filter((e) => e.type === "rectangle" && e.backgroundColor === color.accent);
    // Active page cell is drawn as a shadowed box, so the accent rect is the surface one.
    expect(active).toHaveLength(1);
    // Two chevrons.
    expect(count(els, "line")).toBe(2);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/components.test.ts`
Expected: FAIL — `dist/components/breadcrumb.excalidraw` does not exist.

- [ ] **Step 3: Write `src/components/breadcrumb.ts`**

```ts
import { Factory, estimateTextWidth, type ExcalidrawElement } from "../element.js";
import { chevron, color, font, label, size } from "../comic.js";

const GAP = 20;

/** Three crumbs with hand-drawn chevron separators; the last one is bold. */
export default function breadcrumb(): ExcalidrawElement[] {
  const f = new Factory("breadcrumb");
  const els: ExcalidrawElement[] = [];

  const crumbs = [
    { text: "Home", current: false },
    { text: "Library", current: false },
    { text: "Button", current: true },
  ];

  let x = 0;
  crumbs.forEach((crumb, i) => {
    const width = estimateTextWidth(crumb.text, size.fontMd);
    els.push(...label(f, {
      x,
      y: 0,
      text: crumb.text,
      fontSize: size.fontMd,
      fontFamily: crumb.current ? font.comic : font.hand,
      stroke: crumb.current ? color.ink : color.mutedText,
    }));
    x += width;
    if (i < crumbs.length - 1) {
      els.push(...chevron(f, {
        x: x + GAP,
        y: 4,
        s: 8,
        dir: "right",
        stroke: color.subtle,
      }));
      x += GAP + 8 + GAP;
    }
  });

  return els;
}
```

- [ ] **Step 4: Write `src/components/pagination.ts`**

```ts
import { Factory, type ExcalidrawElement } from "../element.js";
import { chevron, color, font, inkBox, label, size } from "../comic.js";

const CELL = 48;
const GAP = 12;
const ACTIVE = 2;

/** Prev arrow, pages 1-5 with page 2 active, next arrow. */
export default function pagination(): ExcalidrawElement[] {
  const f = new Factory("pagination");
  const els: ExcalidrawElement[] = [];

  const pages = [1, 2, 3, 4, 5];
  const startX = CELL + GAP;

  // Prev chevron.
  els.push(...chevron(f, { x: 14, y: CELL / 2 - 8, s: 8, dir: "right", stroke: color.mutedText }));

  pages.forEach((page, i) => {
    const x = startX + i * (CELL + GAP);
    const active = page === ACTIVE;
    els.push(...inkBox(f, {
      x,
      y: 0,
      w: CELL,
      h: CELL,
      fill: active ? color.accent : color.surface,
      shadow: active,
    }));
    els.push(...label(f, {
      x: x + CELL / 2,
      y: (CELL - size.fontSm * 1.25) / 2,
      text: String(page),
      fontSize: size.fontSm,
      fontFamily: font.comic,
      stroke: active ? color.accentText : color.ink,
      align: "center",
    }));
  });

  // Next chevron.
  const endX = startX + pages.length * (CELL + GAP) + 6;
  els.push(...chevron(f, { x: endX, y: CELL / 2 - 8, s: 8, dir: "right", stroke: color.mutedText }));

  return els;
}
```

Note: the prev chevron points right here for simplicity of the `chevron` helper. If you want
it mirrored, pass negative-x points via a dedicated call rather than adding a `"left"`
direction — but a `"left"` direction in `comic.ts` is also acceptable if you add a test for it
in `tests/comic.test.ts` first.

- [ ] **Step 5: Register both components**

Edit `src/registry.ts` — add imports:

```ts
import breadcrumb from "./components/breadcrumb.js";
import pagination from "./components/pagination.js";
```

and entries:

```ts
  breadcrumb: { title: "Breadcrumb", build: breadcrumb },
  pagination: { title: "Pagination", build: pagination },
```

- [ ] **Step 6: Run build, validate and tests**

```bash
npm run build && npm run validate && npx vitest run
```

Expected: `Wrote 20 components`, no errors, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src tests dist
git commit -m "feat: add breadcrumb and pagination"
```

---

### Task 13: Registry coverage test, README, and final check

**Files:**
- Create: `README.md`
- Modify: `tests/build.test.ts`

**Interfaces:**
- Consumes: `registry` from `src/registry.js`.
- Produces: nothing new.

- [ ] **Step 1: Write the failing test**

Append to `tests/build.test.ts`:

```ts
describe("registry", () => {
  const EXPECTED = [
    "alert", "avatar", "badge", "breadcrumb", "button", "card", "checkbox-group",
    "dialog", "dropdown-menu", "input", "pagination", "progress", "radio-group",
    "select", "slider", "switch", "table", "tabs", "textarea", "tooltip",
  ];

  it("contains exactly the 20 planned components", () => {
    expect(Object.keys(registry).sort()).toEqual(EXPECTED);
  });

  it("gives every component a distinct title", () => {
    const titles = Object.values(registry).map((e) => e.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("appears in the library bundle once per component", () => {
    const lib = JSON.parse(readFileSync(join(out, "comic-ui.excalidrawlib"), "utf8"));
    expect(lib.libraryItems).toHaveLength(EXPECTED.length);
  });
});
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `npx vitest run tests/build.test.ts`
Expected: PASS. If it fails, a component is missing from or misnamed in the registry — fix
the registry, not the test.

- [ ] **Step 3: Write `README.md`**

```markdown
# Excalidraw Comic Components

Hand-drawn, comic-styled UI components for [Excalidraw](https://excalidraw.com),
modelled on the [shadcn/ui](https://ui.shadcn.com) component set.

Bold wobbly ink, flat fills, hard offset shadows. Colours are the shadcn **zinc** scale.

## Use it

**Whole library:** in Excalidraw open **Library → Load from file** and pick
`dist/comic-ui.excalidrawlib`. All 20 components land in your library panel.

**One component:** open `dist/components/<name>.excalidraw` via **Menu → Open**,
then copy what you need.

Each component is a single group — click once to select and drag the whole thing.

## Components

Alert, Avatar, Badge, Breadcrumb, Button, Card, Checkbox Group, Dialog,
Dropdown Menu, Input, Pagination, Progress, Radio Group, Select, Slider,
Switch, Table, Tabs, Textarea, Tooltip.

## Palette

shadcn zinc. `#18181b` for ink and shadows, `#fafafa` for surfaces, `#e4e4e7` for
muted fills, `#3f3f46` for accents.

## Develop

```bash
npm install
npm run build      # regenerate dist/
npm run validate   # structural checks on dist/
npm test           # unit tests
npm run check      # all three
```

`src/tokens.ts` holds the palette and sizing. `src/comic.ts` holds the house style —
change it and every component restyles. `src/components/*.ts` is one file per component.
`dist/` is generated but committed, so the library works without a build.
```

- [ ] **Step 4: Run the full check**

```bash
npm run check
```

Expected: `Wrote 20 components`, `All generated files are valid.`, all tests pass.

- [ ] **Step 5: Type-check the source**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any that appear.

- [ ] **Step 6: Final visual pass in Excalidraw**

Load `dist/comic-ui.excalidrawlib` into Excalidraw's library panel. Confirm all 20 items
appear with sensible thumbnails, and drag three at random onto the canvas to confirm they
place as single groups with the comic look intact.

- [ ] **Step 7: Commit**

```bash
git add README.md tests/build.test.ts
git commit -m "docs: add README and registry coverage test"
```

---

## Done when

- `npm run check` passes.
- `npx tsc --noEmit` is clean.
- `dist/` holds 20 `.excalidraw` files plus `comic-ui.excalidrawlib`, all committed.
- The library file loads into Excalidraw and every item renders.
