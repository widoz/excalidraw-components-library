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
