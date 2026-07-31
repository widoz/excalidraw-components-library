import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildAll } from "../src/build.js";
import { registry } from "../src/registry.js";
import { DEFAULT_PRESET, paletteValues, resolveTheme, type Preset } from "../src/theme.js";
import { validateAll } from "../src/validate.js";

/** The default, one preset per axis at its furthest-from-default value, and one combining all five. */
const PRESETS: Preset[] = [
  { name: "default" },
  { name: "ax-stroke", strokeWidth: "thin" },
  { name: "ax-sloppiness", sloppiness: "architect" },
  { name: "ax-edges", edges: "sharp" },
  { name: "ax-font", font: "nunito" },
  // nunito (0.5) is narrower than the default 0.55, so it can only shrink a text box —
  // which the one-sided growth check below passes vacuously. comic-shanns (0.58) is the
  // only face that can widen one, so it is the one that actually exercises the guard.
  { name: "ax-font-wide", font: "comic-shanns" },
  { name: "ax-palette", palette: "mauve" },
  { name: "ax-all", strokeWidth: "thin", sloppiness: "architect", edges: "sharp", font: "nunito", palette: "mauve" },
];

type El = Record<string, unknown>;
const load = (dir: string, name: string): El[] =>
  JSON.parse(readFileSync(join(dir, "components", `${name}.excalidraw`), "utf8")).elements;

function build(preset: Preset): string {
  const dir = mkdtempSync(join(tmpdir(), `preset-${preset.name}-`));
  buildAll(resolveTheme(preset), dir);
  return dir;
}

const baseline = build({ name: "default" });
const counts = Object.fromEntries(
  Object.keys(registry).map((n) => [n, load(baseline, n).length]),
);

// The baseline is built at module scope (every suite below compares against it), so its
// temp directory needs a file-level teardown of its own.
afterAll(() => rmSync(baseline, { recursive: true, force: true }));

describe.each(PRESETS)("preset $name", (preset) => {
  const theme = resolveTheme(preset);
  let dir: string;

  beforeAll(() => { dir = build(preset); });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("writes every component", () => {
    expect(readdirSync(join(dir, "components"))).toHaveLength(Object.keys(registry).length);
  });

  it("draws the same elements as the default — style changes how, never what", () => {
    for (const name of Object.keys(registry)) {
      expect(load(dir, name).length, `${name} element count`).toBe(counts[name]);
    }
  });

  it("passes validation under its own theme", () => {
    expect(validateAll(theme, dir)).toEqual([]);
  });

  it("uses only the active palette", () => {
    const allowed = paletteValues(theme);
    for (const name of Object.keys(registry)) {
      for (const el of load(dir, name)) {
        expect(allowed.has(String(el.strokeColor)), `${name} strokeColor`).toBe(true);
        expect(allowed.has(String(el.backgroundColor)), `${name} backgroundColor`).toBe(true);
      }
    }
  });

  it("uses only this ladder's rungs, this theme's fonts, and this roughness", () => {
    const rungs = new Set(Object.values(theme.strokes));
    const fonts = new Set(Object.values(theme.fonts));
    for (const name of Object.keys(registry)) {
      for (const el of load(dir, name)) {
        expect(rungs.has(Number(el.strokeWidth)), `${name} strokeWidth`).toBe(true);
        expect(Number(el.roughness), `${name} roughness`).toBe(theme.roughness);
        if (el.type === "text") {
          expect(fonts.has(Number(el.fontFamily)), `${name} fontFamily`).toBe(true);
        }
      }
    }
  });

  // A component's own bounding box is the union of its elements, so "inside the box" is
  // true by construction. What is not: how far this preset's box may widen against the
  // default's — the failure mode a wrong `advance` factor produces.
  it("does not widen a component much past the default's width", () => {
    for (const name of Object.keys(registry)) {
      const xs = load(dir, name).flatMap((e) => [Number(e.x), Number(e.x) + Number(e.width)]);
      const bxs = load(baseline, name).flatMap((e) => [Number(e.x), Number(e.x) + Number(e.width)]);
      const grow = (Math.max(...xs) - Math.min(...xs)) / (Math.max(...bxs) - Math.min(...bxs));
      expect(grow, `${name} width vs default`).toBeLessThan(1.35);
    }
  });

  it("is deterministic", () => {
    const second = build(preset);
    for (const name of Object.keys(registry)) {
      expect(readFileSync(join(second, "components", `${name}.excalidraw`), "utf8"))
        .toBe(readFileSync(join(dir, "components", `${name}.excalidraw`), "utf8"));
    }
    rmSync(second, { recursive: true, force: true });
  });
});

it("sharp edges leave no rounded rectangle anywhere", () => {
  const dir = build({ name: "sharp-check", edges: "sharp" });
  for (const name of Object.keys(registry)) {
    for (const el of load(dir, name)) {
      if (el.type === "rectangle") expect(el.roundness, `${name}`).toBeNull();
    }
  }
  rmSync(dir, { recursive: true, force: true });
});
