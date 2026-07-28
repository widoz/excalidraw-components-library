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
