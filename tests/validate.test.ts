import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildAll } from "../src/build.js";
import { Factory, type ExcalidrawElement } from "../src/element.js";
import { toLibrary, toScene } from "../src/scene.js";
import { validateAll } from "../src/validate.js";
import { DEFAULT_PRESET, resolveTheme, type Theme } from "../src/theme.js";

const theme = resolveTheme(DEFAULT_PRESET);
let dir: string;

function buildFixture(fixtureTheme: Theme = resolveTheme(DEFAULT_PRESET)): string {
  const fixtureDir = mkdtempSync(join(tmpdir(), "validate-"));
  buildAll(fixtureTheme, fixtureDir);
  return fixtureDir;
}

/** Corrupt one element of one component, so a check can be shown to fire. */
function perturb(fixtureDir: string, name: string, fn: (el: Record<string, unknown>) => void): void {
  const path = join(fixtureDir, "components", `${name}.excalidraw`);
  const scene = JSON.parse(readFileSync(path, "utf8")) as { elements: Record<string, unknown>[] };
  for (const el of scene.elements) fn(el);
  writeFileSync(path, `${JSON.stringify(scene, null, 2)}\n`);
}

function makeElements(): ExcalidrawElement[] {
  const f = new Factory("widget", theme);
  const rect = f.rect({ x: 0, y: 0, w: 40, h: 20 });
  const text = f.text({ x: 0, y: 30, text: "Hi" });
  const line = f.line({ x: 0, y: 0, points: [[0, 0], [10, 10]] });
  return [rect, text, line];
}

/** Writes a component scene (with optional overrides) plus a matching, unmutated library file. */
function writeScene(
  elements: ExcalidrawElement[],
  appStateOverride?: Record<string, unknown>,
  overrides?: { scene?: Record<string, unknown>; library?: Record<string, unknown> },
): void {
  const componentsDir = join(dir, "components");
  mkdirSync(componentsDir, { recursive: true });
  const scene = { ...(toScene(elements, theme) as Record<string, unknown>), ...overrides?.scene };
  if (appStateOverride) scene.appState = appStateOverride;
  writeFileSync(join(componentsDir, "widget.excalidraw"), JSON.stringify(scene));
  const library = {
    ...(toLibrary([{ name: "Widget", elements: makeElements() }]) as Record<string, unknown>),
    ...overrides?.library,
  };
  writeFileSync(join(dir, "comic-ui.excalidrawlib"), JSON.stringify(library));
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
    expect(validateAll(theme, dir)).toEqual([]);
  });
});

describe("validateAll - text element checks", () => {
  it("flags a text element missing fontSize", () => {
    const elements = makeElements();
    delete (elements[1] as Record<string, unknown>).fontSize;
    writeScene(elements);
    const errors = validateAll(theme, dir);
    expect(errors.some((e) => e.includes('missing text field "fontSize"'))).toBe(true);
  });

  it("flags a text element missing textAlign", () => {
    const elements = makeElements();
    delete (elements[1] as Record<string, unknown>).textAlign;
    writeScene(elements);
    const errors = validateAll(theme, dir);
    expect(errors.some((e) => e.includes('missing text field "textAlign"'))).toBe(true);
  });

  it("flags a text element missing fontFamily", () => {
    const elements = makeElements();
    delete (elements[1] as Record<string, unknown>).fontFamily;
    writeScene(elements);
    const errors = validateAll(theme, dir);
    expect(errors.some((e) => e.includes('missing text field "fontFamily"'))).toBe(true);
  });
});

describe("validateAll - line element checks", () => {
  it("flags a line element missing startBinding", () => {
    const elements = makeElements();
    delete (elements[2] as Record<string, unknown>).startBinding;
    writeScene(elements);
    const errors = validateAll(theme, dir);
    expect(errors.some((e) => e.includes('missing line field "startBinding"'))).toBe(true);
  });

  it("flags a line whose points are not [number, number] pairs", () => {
    const elements = makeElements();
    (elements[2] as Record<string, unknown>).points = [[0, 0], "bad"];
    writeScene(elements);
    const errors = validateAll(theme, dir);
    expect(errors.some((e) => e.includes('"points" must contain [number, number] pairs'))).toBe(true);
  });

  it("flags a line whose first point is not [0, 0]", () => {
    const elements = makeElements();
    (elements[2] as Record<string, unknown>).points = [[5, 5], [10, 10]];
    writeScene(elements);
    const errors = validateAll(theme, dir);
    expect(errors.some((e) => e.includes("first point must be [0, 0]"))).toBe(true);
  });

  it("flags an empty points array", () => {
    const elements = makeElements();
    (elements[2] as Record<string, unknown>).points = [];
    writeScene(elements);
    const errors = validateAll(theme, dir);
    expect(errors.some((e) => e.includes('"points" must be a non-empty array'))).toBe(true);
  });

  it("flags a line whose points all coincide", () => {
    const elements = makeElements();
    // Passes every other points check, yet draws nothing. This is the shape the
    // textarea resize grip's first stroke had.
    (elements[2] as Record<string, unknown>).points = [[0, 0], [0, 0]];
    writeScene(elements);
    const errors = validateAll(theme, dir);
    expect(errors.some((e) => e.includes('"points" span zero extent'))).toBe(true);
  });

  it("accepts a line with extent in only one axis", () => {
    const elements = makeElements();
    (elements[2] as Record<string, unknown>).points = [[0, 0], [0, 20]];
    writeScene(elements);
    expect(validateAll(theme, dir)).toEqual([]);
  });
});

describe("validateAll - size checks", () => {
  it("flags a negative width", () => {
    const elements = makeElements();
    (elements[0] as Record<string, unknown>).width = -5;
    writeScene(elements);
    const errors = validateAll(theme, dir);
    expect(errors.some((e) => e.includes('"width" must not be negative'))).toBe(true);
  });

  it("flags a negative height", () => {
    const elements = makeElements();
    (elements[0] as Record<string, unknown>).height = -1;
    writeScene(elements);
    const errors = validateAll(theme, dir);
    expect(errors.some((e) => e.includes('"height" must not be negative'))).toBe(true);
  });
});

describe("validateAll - structural checks", () => {
  it("reports, rather than throws, when elements is not an array", () => {
    writeScene(makeElements(), undefined, { scene: { elements: { nope: true } } });
    const errors = validateAll(theme, dir);
    expect(errors.some((e) => e.includes('"elements" must be an array'))).toBe(true);
  });

  it("flags a library with the wrong source", () => {
    writeScene(makeElements(), undefined, { library: { source: "somewhere-else" } });
    const errors = validateAll(theme, dir);
    expect(errors.some((e) => e.includes("library: unexpected source"))).toBe(true);
  });
});

describe("validateAll - appState checks", () => {
  it("flags an appState with an extra key", () => {
    writeScene(makeElements(), { gridSize: null, viewBackgroundColor: "#ffffff", scrollX: 0 });
    const errors = validateAll(theme, dir);
    expect(errors.some((e) => e.includes("appState must have exactly the keys"))).toBe(true);
  });

  it("flags an appState missing a required key", () => {
    writeScene(makeElements(), { viewBackgroundColor: "#ffffff" });
    const errors = validateAll(theme, dir);
    expect(errors.some((e) => e.includes("appState must have exactly the keys"))).toBe(true);
  });

  it("flags a background colour outside the palette", () => {
    writeScene(makeElements(), { gridSize: null, viewBackgroundColor: "#123456" });
    const errors = validateAll(theme, dir);
    expect(errors.some((e) => e.includes('viewBackgroundColor "#123456" is not in the palette'))).toBe(true);
  });
});

describe("theme-aware validation", () => {
  it("rejects a colour from a different palette", () => {
    const out = buildFixture();
    perturb(out, "button", (el) => { el.strokeColor = "#1d161e"; }); // mauve-900
    const errors = validateAll(resolveTheme({ name: "z", palette: "zinc" }), out);
    expect(errors.join("\n")).toMatch(/is not in the palette/);
  });

  it("accepts that same colour under the palette it belongs to", () => {
    const mauveTheme = resolveTheme({ name: "m", palette: "mauve" });
    const out = buildFixture(mauveTheme);
    expect(validateAll(mauveTheme, out)).toEqual([]);
  });

  it("rejects a strokeWidth that is not a rung of the active ladder", () => {
    const out = buildFixture();
    perturb(out, "button", (el) => { el.strokeWidth = 3; });
    const errors = validateAll(resolveTheme({ name: "d" }), out);
    expect(errors.join("\n")).toMatch(/strokeWidth "3" is not a rung/);
  });

  it("rejects a fontFamily the theme does not use", () => {
    const out = buildFixture();
    perturb(out, "button", (el) => { if (el.type === "text") el.fontFamily = 8; });
    const errors = validateAll(resolveTheme({ name: "d" }), out);
    expect(errors.join("\n")).toMatch(/fontFamily "8" is not/);
  });

  it("rejects a roughness that is not the theme's", () => {
    const out = buildFixture();
    perturb(out, "button", (el) => { el.roughness = 1; });
    const errors = validateAll(resolveTheme({ name: "d" }), out);
    expect(errors.join("\n")).toMatch(/roughness "1" is not the theme's "2"/);
  });
});
