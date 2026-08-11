import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { componentsDir, ensureLibrary, listComponents, loadVariant, measure, resolveRoot } from "../scripts/library.mjs";

const ROOT = join(import.meta.dirname, "..");
const root = ROOT;
let fake: string;

beforeAll(() => {
  fake = mkdtempSync(join(tmpdir(), "lib-"));
  mkdirSync(join(fake, "dist", "default", "components", "widget"), { recursive: true });
  writeFileSync(join(fake, "dist", "default", "ui.excalidrawlib"), "{}");
  writeFileSync(join(fake, "dist", "default", "components", "widget", "default.excalidraw"), JSON.stringify({
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
  it("uses dist/default/components when no preset is named", () => {
    expect(componentsDir(fake)).toBe(join(fake, "dist", "default", "components"));
  });

  it("uses dist/<preset>/components for a named preset", () => {
    expect(componentsDir(fake, "soft")).toBe(join(fake, "dist", "soft", "components"));
  });

  it("derives both the same way: 'default' is a fallback name, not a special path", () => {
    expect(componentsDir(fake, "default")).toBe(componentsDir(fake));
  });

  it("says how to build a preset that is not there", () => {
    expect(() => loadVariant(fake, "soft", "widget", "default"))
      .toThrow(/npm run build -- --preset soft/);
  });

  it("names the preset in the build command for a missing default build", () => {
    const noDist = mkdtempSync(join(tmpdir(), "nodist-"));
    mkdirSync(join(noDist, "dist", "default"), { recursive: true });
    writeFileSync(join(noDist, "dist", "default", "ui.excalidrawlib"), "{}");

    expect(() => loadVariant(noDist, undefined, "widget", "default"))
      .toThrow(/Run: npm run build -- --preset default$/);
    expect(() => listComponents(noDist, undefined))
      .toThrow(/Run: npm run build -- --preset default$/);

    rmSync(noDist, { recursive: true, force: true });
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
      { name: "widget", variants: [{ name: "default", width: 40, height: 25, texts: [] }] },
    ]);
  });

  it("reports each variant's current strings", () => {
    const tabs = listComponents(root).find((c) => c.name === "tabs")!;
    const variant = tabs.variants.find((v) => v.name === "default")!;
    expect(variant.texts).toEqual(["Preview", "Code", "Notes", "Panel content lives here."]);
  });

  it("reports an empty list for a variant with no text", () => {
    const skeleton = listComponents(root).find((c) => c.name === "skeleton")!;
    expect(skeleton.variants.find((v) => v.name === "default")!.texts).toEqual([]);
  });
});

describe("resolveRoot: broken config is an error, not a silent fallback", () => {
  it("rejects a config file that is not valid JSON, naming the file", () => {
    const cfgDir = mkdtempSync(join(tmpdir(), "cfgdir-"));
    const cfg = join(cfgDir, "cfg.json");
    writeFileSync(cfg, "{ this is not json");

    expect(() => resolveRoot({ configPath: cfg, pluginRoot: ROOT })).toThrow(/Could not parse/);
    try {
      resolveRoot({ configPath: cfg, pluginRoot: ROOT });
      throw new Error("expected resolveRoot to throw");
    } catch (err) {
      expect((err as Error).message).toContain(cfg);
    }

    rmSync(cfgDir, { recursive: true, force: true });
  });

  it("rejects a config file whose path does not point at a library, instead of falling back", () => {
    const cfgDir = mkdtempSync(join(tmpdir(), "cfgdir-"));
    const cfg = join(cfgDir, "cfg.json");
    const missing = join(cfgDir, "nowhere");
    writeFileSync(cfg, JSON.stringify({ path: missing }));

    expect(() => resolveRoot({ configPath: cfg, pluginRoot: ROOT })).toThrow(/not a component library/);
    try {
      resolveRoot({ configPath: cfg, pluginRoot: ROOT });
      throw new Error("expected resolveRoot to throw");
    } catch (err) {
      expect((err as Error).message).toContain(cfg);
      expect((err as Error).message).toContain(missing);
    }

    rmSync(cfgDir, { recursive: true, force: true });
  });
});

describe("ensureLibrary: only ever installs into a verified git clone", () => {
  const pkgName = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).name;

  function makeCloneLike({ withGit = false, packageJson = JSON.stringify({ name: pkgName }) } = {}) {
    const clone = mkdtempSync(join(tmpdir(), "clone-"));
    mkdirSync(join(clone, "dist", "default"), { recursive: true });
    writeFileSync(join(clone, "dist", "default", "ui.excalidrawlib"), "{}");
    mkdirSync(join(clone, "src"), { recursive: true });
    writeFileSync(join(clone, "src", "build.ts"), "");
    writeFileSync(join(clone, "package.json"), packageJson);
    if (withGit) mkdirSync(join(clone, ".git"), { recursive: true });
    return clone;
  }

  function configFor(root: string) {
    const cfgDir = mkdtempSync(join(tmpdir(), "cfgdir-"));
    const cfg = join(cfgDir, "cfg.json");
    writeFileSync(cfg, JSON.stringify({ path: root }));
    return { cfg, cfgDir };
  }

  it("refuses a config-pointed root with a matching package.json but no .git", async () => {
    const clone = makeCloneLike({ withGit: false });
    const { cfg, cfgDir } = configFor(clone);

    await expect(ensureLibrary({ needsToolchain: true, configPath: cfg, pluginRoot: ROOT }))
      .rejects.toThrow(/\.git/);

    rmSync(clone, { recursive: true, force: true });
    rmSync(cfgDir, { recursive: true, force: true });
  });

  it("names the target package.json when it is not valid JSON", async () => {
    const clone = makeCloneLike({ withGit: true, packageJson: "{ not json" });
    const { cfg, cfgDir } = configFor(clone);

    await expect(ensureLibrary({ needsToolchain: true, configPath: cfg, pluginRoot: ROOT }))
      .rejects.toThrow(/Could not parse/);
    try {
      await ensureLibrary({ needsToolchain: true, configPath: cfg, pluginRoot: ROOT });
      throw new Error("expected ensureLibrary to reject");
    } catch (err) {
      expect((err as Error).message).toContain(join(clone, "package.json"));
    }

    rmSync(clone, { recursive: true, force: true });
    rmSync(cfgDir, { recursive: true, force: true });
  });
});
