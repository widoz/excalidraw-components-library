import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildAll } from "../src/build.js";
import { registry } from "../src/registry.js";
import { DEFAULT_PRESET, resolveTheme } from "../src/theme.js";

const theme = resolveTheme(DEFAULT_PRESET);

let out: string;
beforeAll(() => {
  out = mkdtempSync(join(tmpdir(), "comic-ui-contain-"));
  buildAll(out);
});
afterAll(() => rmSync(out, { recursive: true, force: true }));

type El = Record<string, unknown>;
type Box = { x0: number; y0: number; x1: number; y1: number };

function load(name: string): El[] {
  return JSON.parse(readFileSync(join(out, "components", `${name}.excalidraw`), "utf8")).elements;
}

/**
 * Drawn extent of one element. For lines, x/y is the origin and the points are
 * relative and may be negative, so the drawn box is not x..x+width.
 */
function bounds(el: El): Box {
  const x = el.x as number;
  const y = el.y as number;
  if (el.type === "line") {
    const points = el.points as Array<[number, number]>;
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    return { x0: x + Math.min(...xs), y0: y + Math.min(...ys), x1: x + Math.max(...xs), y1: y + Math.max(...ys) };
  }
  return { x0: x, y0: y, x1: x + (el.width as number), y1: y + (el.height as number) };
}

function union(els: El[]): Box {
  const boxes = els.map(bounds);
  return {
    x0: Math.min(...boxes.map((b) => b.x0)),
    y0: Math.min(...boxes.map((b) => b.y0)),
    x1: Math.max(...boxes.map((b) => b.x1)),
    y1: Math.max(...boxes.map((b) => b.y1)),
  };
}

function contains(outer: Box, inner: Box, tolerance = 1): boolean {
  return inner.x0 >= outer.x0 - tolerance
    && inner.y0 >= outer.y0 - tolerance
    && inner.x1 <= outer.x1 + tolerance
    && inner.y1 <= outer.y1 + tolerance;
}

/**
 * The extent each component is expected to occupy, read back from a build that was
 * checked by eye in Excalidraw. Any element that drifts or escapes its container
 * moves one of these numbers: the pre-fix avatar, whose placeholder shoulders hung
 * below the avatar circle, reached y = 70 rather than 66.
 */
const EXPECTED: Record<string, [number, number, number, number]> = {
  "accordion": [0, 0, 326, 266],
  "alert": [0, 0, 386, 126],
  "alert-dialog": [0, 0, 426, 256],
  "aspect-ratio": [0, 0, 320, 180],
  "attachment": [0, 0, 306, 78],
  "avatar": [0, 0, 364, 66],
  "badge": [0, 0, 324, 38],
  "breadcrumb": [0, 0, 278.2, 25],
  "bubble": [0, 0, 286, 210],
  "button": [0, 0, 206, 224],
  "button-group": [0, 0, 336, 62],
  "calendar": [8, 11.5, 312, 266],
  "card": [0, 0, 346, 236],
  "carousel": [-24, 0, 390, 252],
  "chart": [0, 20, 340, 210],
  "checkbox-group": [0, 0, 199, 152],
  "collapsible": [0, 0, 326, 246],
  "combobox": [0, 0, 326, 274],
  "command": [0, 0, 346, 306],
  "context-menu": [0, 0, 346, 226],
  "date-picker": [0, 0, 326, 244],
  "dialog": [0, 0, 426, 256],
  "drawer": [0, 0, 366, 266],
  "dropdown-menu": [0, 0, 266, 292],
  "empty": [0, 0, 340, 260],
  "field": [-4, 0, 326, 240],
  "hover-card": [0, 0, 306, 212],
  "input": [-4, 0, 326, 158],
  "input-group": [0, 0, 346, 62],
  "input-otp": [0, -4, 398, 70],
  "item": [0, 0, 346, 82],
  "kbd": [0, 0, 349, 58],
  "label": [0, 0, 326, 164],
  "marker": [0, -2.76, 268.75, 113],
  "menubar": [0, 0, 426, 222],
  "message": [0, 0, 342, 282],
  "navigation-menu": [0, 2, 426, 266],
  "pagination": [36.4, 0, 371.6, 54],
  "popover": [0, 0, 286, 248],
  "progress": [0, 0, 366.4, 114],
  "radio-group": [0, 0, 135, 154],
  "resizable": [0, 0, 406, 226],
  "scroll-area": [0, 0, 326, 226],
  "select": [0, 0, 326, 238],
  "separator": [0, 0, 320, 134],
  "sheet": [-6, 0, 320, 426],
  "sidebar": [0, 0, 246, 426],
  "skeleton": [0, 44, 280, 116],
  "slider": [0, 0, 326, 124],
  "spinner": [26, 0, 231.93, 88],
  "switch": [0, 0, 255, 122],
  "table": [0, 0, 386, 206],
  "tabs": [0, 0, 366, 204],
  "textarea": [0, 0, 326, 186],
  "toast": [0, 0, 370, 120],
  "toggle": [0, 0, 146, 90],
  "toggle-group": [0, 0, 216, 66],
  "tooltip": [0, 0, 226, 148],
};

describe("component extents", () => {
  it("covers every registered component", () => {
    expect(Object.keys(EXPECTED).sort()).toEqual(Object.keys(registry).sort());
  });

  for (const [name, expected] of Object.entries(EXPECTED)) {
    it(`${name} occupies its expected bounding box`, () => {
      const box = union(load(name));
      const round = (v: number) => Math.round(v * 100) / 100;
      expect([round(box.x0), round(box.y0), round(box.x1), round(box.y1)]).toEqual(expected);
    });

    // The box comes from the EXPECTED literal above, never from union(load(name)):
    // a union of the very elements being checked contains them by construction, so
    // that form of the test could not fail and detected nothing.
    it(`${name} keeps every element inside its expected box`, () => {
      const [x0, y0, x1, y1] = expected;
      const box: Box = { x0, y0, x1, y1 };
      for (const el of load(name)) {
        expect(contains(box, bounds(el)), `${String(el.type)} ${String(el.id)} escapes`).toBe(true);
      }
    });
  }
});

/**
 * Components that draw fill bands with no enclosing frame, on purpose. Listed
 * explicitly so a new band-bearing component cannot quietly join them:
 * `FRAMED_BAND_COMPONENTS` below is derived from the build, so anything that grows
 * a band and is not named here starts being checked automatically.
 */
const FRAMELESS_BAND_COMPONENTS = new Set([
  // Loading placeholders. The whole point is bare grey bars floating on the canvas
  // with nothing around them.
  "skeleton",
  // The drag handle's band is the seam *between* the two panels, so it deliberately
  // straddles their outlines rather than sitting inside either one.
  "resizable",
  // The "Docs" highlight sits in the bare nav row above the mega-panel; the nav row
  // has no frame of its own.
  "navigation-menu",
  // Axis-and-baseline chart with no plot frame. Its bars now carry their own ink
  // outline, so it has no fill bands left at all — kept here as a standing decision.
  "chart",
]);

/** Every component whose fill bands are expected to sit inside an ink-outlined frame. */
const FRAMED_BAND_COMPONENTS = [
  "attachment",
  "combobox",
  "command",
  "context-menu",
  "drawer",
  "dropdown-menu",
  "menubar",
  "progress",
  "scroll-area",
  "select",
  "sidebar",
  "slider",
  "table",
];

describe("fill bands stay inside a frame", () => {
  // A fill band has no outline of its own, so it is only ever legible as the inside
  // of some ink-outlined box. If one drifts, it has nothing left to sit in.

  it("accounts for every band-bearing component in the library", () => {
    const withBands = Object.keys(registry).filter((name) =>
      load(name).some((e) => e.type === "rectangle" && e.strokeColor === theme.palette.transparent));
    // A new component that grows a fill band must be added to one of the two lists,
    // so nothing can escape this check by simply not being mentioned.
    const accounted = new Set([...FRAMED_BAND_COMPONENTS, ...FRAMELESS_BAND_COMPONENTS]);
    expect(withBands.filter((n) => !accounted.has(n))).toEqual([]);
    // Every name on either list is a real component, and everything on the framed
    // list really does still emit bands (so no case below is vacuous).
    for (const name of accounted) expect(Object.keys(registry)).toContain(name);
    expect(FRAMED_BAND_COMPONENTS.filter((n) => !withBands.includes(n))).toEqual([]);
  });

  for (const name of FRAMED_BAND_COMPONENTS) {
    it(`${name}: every fill band is enclosed by an ink-outlined rectangle`, () => {
      const els = load(name);
      const bands = els.filter((e) => e.type === "rectangle" && e.strokeColor === theme.palette.transparent);
      expect(bands.length).toBeGreaterThan(0);
      // Only real 4px outlines count as frames. The 1px ink rectangles are drop
      // shadows, offset down and right, and enclose nothing the viewer can see.
      const frames = els
        .filter((e) => e.type === "rectangle" && e.strokeColor === theme.palette.ink && e.strokeWidth === theme.strokes.outline)
        .map(bounds);
      for (const band of bands) {
        const box = bounds(band);
        const held = frames.some((frame) => contains(frame, box, 0));
        expect(held, `band at ${box.x0},${box.y0} is not inside any frame`).toBe(true);
      }
    });
  }
});

describe("avatar glyph", () => {
  it("keeps the head and shoulders inside the avatar circle", () => {
    const els = load("avatar");
    const circle = els.find((e) => e.type === "ellipse" && e.backgroundColor === theme.palette.muted);
    const glyph = els.filter((e) => e.type === "ellipse" && e.backgroundColor === theme.palette.mutedText);
    expect(circle).toBeDefined();
    expect(glyph).toHaveLength(2);
    for (const part of glyph) {
      expect(contains(bounds(circle!), bounds(part), 0)).toBe(true);
    }
  });
});
