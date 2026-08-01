import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { componentsDir, listComponents, loadVariant, measure, resolveRoot } from "../scripts/library.mjs";

const ROOT = join(import.meta.dirname, "..");
let fake: string;

beforeAll(() => {
  fake = mkdtempSync(join(tmpdir(), "lib-"));
  mkdirSync(join(fake, "dist", "components", "widget"), { recursive: true });
  writeFileSync(join(fake, "dist", "comic-ui.excalidrawlib"), "{}");
  writeFileSync(join(fake, "dist", "components", "widget", "default.excalidraw"), JSON.stringify({
    elements: [{ id: "a", x: 0, y: 0, width: 30, height: 10 }, { id: "b", x: 10, y: 5, width: 30, height: 20 }],
    appState: { gridSize: null, viewBackgroundColor: "#ffffff" },
  }));
});

afterAll(() => rmSync(fake, { recursive: true, force: true }));

describe("resolveRoot", () => {
  it("prefers a config file that points at a real library", () => {
    const cfg = join(fake, "cfg.json");
    writeFileSync(cfg, JSON.stringify({ path: fake }));
    expect(resolveRoot({ configPath: cfg, pluginRoot: ROOT })).toBe(fake);
  });

  it("falls back to the plugin root when no config exists", () => {
    expect(resolveRoot({ configPath: join(fake, "missing.json"), pluginRoot: ROOT })).toBe(ROOT);
  });

  it("explains what to do when nothing has a dist directory", () => {
    const empty = mkdtempSync(join(tmpdir(), "empty-"));
    expect(() => resolveRoot({ configPath: join(empty, "none.json"), pluginRoot: empty }))
      .toThrow(/excalidraw-lib\.json/);
    rmSync(empty, { recursive: true, force: true });
  });
});

describe("componentsDir", () => {
  it("uses dist/components for the default preset", () => {
    expect(componentsDir(fake)).toBe(join(fake, "dist", "components"));
  });

  it("uses dist/<preset>/components for a named preset", () => {
    expect(componentsDir(fake, "soft")).toBe(join(fake, "dist", "soft", "components"));
  });

  it("says how to build a preset that is not there", () => {
    expect(() => loadVariant(fake, "soft", "widget", "default"))
      .toThrow(/npm run build -- --preset soft/);
  });
});

describe("loadVariant", () => {
  it("returns elements and appState", () => {
    const { elements, appState } = loadVariant(fake, undefined, "widget", "default");
    expect(elements).toHaveLength(2);
    expect(appState.viewBackgroundColor).toBe("#ffffff");
  });

  it("lists the available variants when one is unknown", () => {
    expect(() => loadVariant(fake, undefined, "widget", "nope")).toThrow(/default/);
  });

  it("suggests near matches when the component is unknown", () => {
    expect(() => loadVariant(fake, undefined, "widgets", "default")).toThrow(/widget/);
  });
});

describe("measure", () => {
  it("returns the bounding box of the elements", () => {
    expect(measure([{ x: 0, y: 0, width: 30, height: 10 }, { x: 10, y: 5, width: 30, height: 20 }]))
      .toEqual({ width: 40, height: 25 });
  });
});

describe("listComponents", () => {
  it("reports each component's variants with sizes", () => {
    expect(listComponents(fake)).toEqual([
      { name: "widget", variants: [{ name: "default", width: 40, height: 25 }] },
    ]);
  });
});
