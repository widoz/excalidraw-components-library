import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Factory, type ExcalidrawElement } from "../src/element.js";
import { toLibrary, toScene } from "../src/scene.js";
import { validateAll } from "../src/validate.js";

let dir: string;

function makeElements(): ExcalidrawElement[] {
  const f = new Factory("widget");
  const rect = f.rect({ x: 0, y: 0, w: 40, h: 20 });
  const text = f.text({ x: 0, y: 30, text: "Hi" });
  const line = f.line({ x: 0, y: 0, points: [[0, 0], [10, 10]] });
  return [rect, text, line];
}

/** Writes a component scene (with an optional appState override) plus a matching, unmutated library file. */
function writeScene(elements: ExcalidrawElement[], appStateOverride?: Record<string, unknown>): void {
  const componentsDir = join(dir, "components");
  mkdirSync(componentsDir, { recursive: true });
  const scene = toScene(elements) as Record<string, unknown>;
  if (appStateOverride) scene.appState = appStateOverride;
  writeFileSync(join(componentsDir, "widget.excalidraw"), JSON.stringify(scene));
  writeFileSync(
    join(dir, "comic-ui.excalidrawlib"),
    JSON.stringify(toLibrary([{ name: "Widget", elements: makeElements() }])),
  );
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "validate-test-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("validateAll - baseline", () => {
  it("passes for a well-formed scene", () => {
    writeScene(makeElements());
    expect(validateAll(dir)).toEqual([]);
  });
});

describe("validateAll - text element checks", () => {
  it("flags a text element missing fontSize", () => {
    const elements = makeElements();
    delete (elements[1] as Record<string, unknown>).fontSize;
    writeScene(elements);
    const errors = validateAll(dir);
    expect(errors.some((e) => e.includes('missing text field "fontSize"'))).toBe(true);
  });

  it("flags a text element missing textAlign", () => {
    const elements = makeElements();
    delete (elements[1] as Record<string, unknown>).textAlign;
    writeScene(elements);
    const errors = validateAll(dir);
    expect(errors.some((e) => e.includes('missing text field "textAlign"'))).toBe(true);
  });

  it("flags a text element missing fontFamily", () => {
    const elements = makeElements();
    delete (elements[1] as Record<string, unknown>).fontFamily;
    writeScene(elements);
    const errors = validateAll(dir);
    expect(errors.some((e) => e.includes('missing text field "fontFamily"'))).toBe(true);
  });
});

describe("validateAll - line element checks", () => {
  it("flags a line element missing startBinding", () => {
    const elements = makeElements();
    delete (elements[2] as Record<string, unknown>).startBinding;
    writeScene(elements);
    const errors = validateAll(dir);
    expect(errors.some((e) => e.includes('missing line field "startBinding"'))).toBe(true);
  });

  it("flags a line whose points are not [number, number] pairs", () => {
    const elements = makeElements();
    (elements[2] as Record<string, unknown>).points = [[0, 0], "bad"];
    writeScene(elements);
    const errors = validateAll(dir);
    expect(errors.some((e) => e.includes('"points" must contain [number, number] pairs'))).toBe(true);
  });

  it("flags a line whose first point is not [0, 0]", () => {
    const elements = makeElements();
    (elements[2] as Record<string, unknown>).points = [[5, 5], [10, 10]];
    writeScene(elements);
    const errors = validateAll(dir);
    expect(errors.some((e) => e.includes("first point must be [0, 0]"))).toBe(true);
  });

  it("flags an empty points array", () => {
    const elements = makeElements();
    (elements[2] as Record<string, unknown>).points = [];
    writeScene(elements);
    const errors = validateAll(dir);
    expect(errors.some((e) => e.includes('"points" must be a non-empty array'))).toBe(true);
  });
});

describe("validateAll - appState checks", () => {
  it("flags an appState with an extra key", () => {
    writeScene(makeElements(), { gridSize: null, viewBackgroundColor: "#ffffff", scrollX: 0 });
    const errors = validateAll(dir);
    expect(errors.some((e) => e.includes("appState must have exactly the keys"))).toBe(true);
  });

  it("flags an appState missing a required key", () => {
    writeScene(makeElements(), { viewBackgroundColor: "#ffffff" });
    const errors = validateAll(dir);
    expect(errors.some((e) => e.includes("appState must have exactly the keys"))).toBe(true);
  });

  it("flags a background colour outside the palette", () => {
    writeScene(makeElements(), { gridSize: null, viewBackgroundColor: "#123456" });
    const errors = validateAll(dir);
    expect(errors.some((e) => e.includes('viewBackgroundColor "#123456" is not in the palette'))).toBe(true);
  });
});
