import { describe, expect, it } from "vitest";
import { Factory, estimateTextWidth, mulberry32, seedFromString } from "../src/element.js";
import { style } from "../src/tokens.js";
import { DEFAULT_PRESET, resolveTheme } from "../src/theme.js";

const theme = resolveTheme(DEFAULT_PRESET);

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
    const f = new Factory("demo", theme);
    const el = f.rect({ x: 0, y: 0, w: 100, h: 40 });
    for (const key of REQUIRED) expect(el).toHaveProperty(key);
    expect(el.type).toBe("rectangle");
    expect(el.roughness).toBe(theme.roughness);
    expect(el.strokeWidth).toBe(style.strokeWidth);
    expect(el.fillStyle).toBe("solid");
    expect(el.groupIds).toEqual([f.groupId]);
  });

  it("assigns strictly ascending index strings across many elements", () => {
    const f = new Factory("demo", theme);
    const indices = Array.from({ length: 50 }, () => f.rect({ x: 0, y: 0, w: 1, h: 1 }).index);
    const sorted = [...indices].sort();
    expect(indices).toEqual(sorted);
    expect(new Set(indices).size).toBe(50);
    for (const i of indices) expect(i.endsWith("0")).toBe(false);
  });

  it("assigns unique ids", () => {
    const f = new Factory("demo", theme);
    const ids = Array.from({ length: 50 }, () => f.rect({ x: 0, y: 0, w: 1, h: 1 }).id);
    expect(new Set(ids).size).toBe(50);
  });

  it("produces identical output for the same component name", () => {
    const a = new Factory("demo", theme).rect({ x: 0, y: 0, w: 10, h: 10 });
    const b = new Factory("demo", theme).rect({ x: 0, y: 0, w: 10, h: 10 });
    expect(a).toEqual(b);
  });

  it("defaults rectangles to surface fill and ink stroke", () => {
    const el = new Factory("demo", theme).rect({ x: 0, y: 0, w: 10, h: 10 });
    expect(el.backgroundColor).toBe(theme.palette.surface);
    expect(el.strokeColor).toBe(theme.palette.ink);
    expect(el.roundness).toEqual({ type: 3 });
  });

  it("supports sharp corners", () => {
    const el = new Factory("demo", theme).rect({ x: 0, y: 0, w: 10, h: 10, rounded: false });
    expect(el.roundness).toBeNull();
  });

  it("emits ellipses with null roundness", () => {
    const el = new Factory("demo", theme).ellipse({ x: 0, y: 0, w: 20, h: 20 });
    expect(el.type).toBe("ellipse");
    expect(el.roundness).toBeNull();
  });

  it("computes line geometry from its points", () => {
    const el = new Factory("demo", theme).line({ x: 5, y: 5, points: [[0, 0], [30, 10], [0, 20]] });
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
    const el = new Factory("demo", theme).line({ x: 0, y: 0, points: [[0, 0], [10, 0], [10, 10]], closed: true });
    expect(el.points).toEqual([[0, 0], [10, 0], [10, 10], [0, 0]]);
  });

  it("emits standalone text with no container binding", () => {
    const el = new Factory("demo", theme).text({ x: 0, y: 0, text: "Hi" });
    expect(el.type).toBe("text");
    expect(el.text).toBe("Hi");
    expect(el.originalText).toBe("Hi");
    expect(el.containerId).toBeNull();
    expect(el.boundElements).toBeNull();
    expect(el.backgroundColor).toBe(theme.palette.transparent);
    expect(el.autoResize).toBe(true);
    expect(el.lineHeight).toBe(1.25);
  });

  it("centres text by shifting x left by half the estimated width", () => {
    const f = new Factory("demo", theme);
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
