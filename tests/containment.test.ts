import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildAll } from "../src/build.js";
import { registry } from "../src/registry.js";
import { color } from "../src/tokens.js";

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
  "menubar": [0, 0, 426, 222],
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
  "spinner": [0.06, 0, 231.88, 88],
  "switch": [0, 0, 255, 122],
  "table": [0, 0, 386, 206],
  "tabs": [0, 0, 366, 204],
  "textarea": [0, 0, 326, 186],
  "toggle": [0, 0, 212.8, 66],
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

    it(`${name} keeps every element inside that box`, () => {
      const els = load(name);
      const box = union(els);
      for (const el of els) {
        expect(contains(box, bounds(el)), `${String(el.type)} ${String(el.id)} escapes`).toBe(true);
      }
    });
  }
});

describe("fill bands stay inside a frame", () => {
  // A fill band has no outline of its own, so it is only ever legible as the inside
  // of some ink-outlined box. If one drifts, it has nothing left to sit in.
  for (const name of ["slider", "table", "progress", "select", "dropdown-menu"]) {
    it(`${name}: every fill band is enclosed by an ink-outlined rectangle`, () => {
      const els = load(name);
      const bands = els.filter((e) => e.type === "rectangle" && e.strokeColor === color.transparent);
      expect(bands.length).toBeGreaterThan(0);
      const frames = els
        .filter((e) => e.type === "rectangle" && e.strokeColor === color.ink)
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
    const circle = els.find((e) => e.type === "ellipse" && e.backgroundColor === color.muted);
    const glyph = els.filter((e) => e.type === "ellipse" && e.backgroundColor === color.mutedText);
    expect(circle).toBeDefined();
    expect(glyph).toHaveLength(2);
    for (const part of glyph) {
      expect(contains(bounds(circle!), bounds(part), 0)).toBe(true);
    }
  });
});
