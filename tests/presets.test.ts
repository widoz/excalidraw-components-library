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

  it("keeps every element inside its component's bounding box", () => {
    for (const name of Object.keys(registry)) {
      const els = load(dir, name);
      const xs = els.flatMap((e) => [Number(e.x), Number(e.x) + Number(e.width)]);
      const ys = els.flatMap((e) => [Number(e.y), Number(e.y) + Number(e.height)]);
      const box = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
      // A text element whose estimate is badly wrong escapes this box relative to the
      // default's, which is the failure mode a wrong `advance` factor produces.
      const baseEls = load(baseline, name);
      const bxs = baseEls.flatMap((e) => [Number(e.x), Number(e.x) + Number(e.width)]);
      const grow = (box.x1 - box.x0) / (Math.max(...bxs) - Math.min(...bxs));
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
