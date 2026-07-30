import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildAll, DEFAULT_OUT, loadPreset, listPresets, outDirFor, PRESETS_DIR } from "../src/build.js";
import { validateAll } from "../src/validate.js";
import { registry } from "../src/registry.js";
import { DEFAULT_PRESET, resolveTheme } from "../src/theme.js";

const theme = resolveTheme(DEFAULT_PRESET);
let out: string;

beforeAll(() => {
  out = mkdtempSync(join(tmpdir(), "comic-ui-"));
  buildAll(theme, out);
});

afterAll(() => {
  rmSync(out, { recursive: true, force: true });
});

describe("build", () => {
  it("produces output that passes validation", () => {
    expect(validateAll(theme, out)).toEqual([]);
  });

  it("writes one scene file per registry entry", () => {
    for (const name of Object.keys(registry)) {
      const scene = JSON.parse(
        readFileSync(join(out, "components", `${name}.excalidraw`), "utf8"),
      );
      expect(scene.elements.length).toBeGreaterThan(0);
    }
  });

  it("is deterministic", () => {
    const first = readFileSync(join(out, "comic-ui.excalidrawlib"), "utf8");
    const second = mkdtempSync(join(tmpdir(), "comic-ui-"));
    buildAll(theme, second);
    expect(readFileSync(join(second, "comic-ui.excalidrawlib"), "utf8")).toBe(first);
    rmSync(second, { recursive: true, force: true });
  });
});

describe("button", () => {
  it("draws three variants: 3 labels, and 2 of the 3 boxes have shadows", () => {
    const scene = JSON.parse(readFileSync(join(out, "components", "button.excalidraw"), "utf8"));
    const els = scene.elements as Array<Record<string, unknown>>;
    expect(els.filter((e) => e.type === "text")).toHaveLength(3);
    // 2 shadowed boxes (2 rects each) + 1 flat box (1 rect) = 5 rectangles.
    expect(els.filter((e) => e.type === "rectangle")).toHaveLength(5);
  });
});

describe("registry", () => {
  const EXPECTED = [
    "accordion", "alert", "alert-dialog", "aspect-ratio", "attachment", "avatar", "badge",
    "breadcrumb", "bubble", "button", "button-group", "calendar", "card", "carousel",
    "chart", "checkbox-group", "collapsible", "combobox", "command",
    "context-menu", "date-picker", "dialog", "drawer", "dropdown-menu",
    "empty", "field", "hover-card", "input", "input-group", "input-otp",
    "item", "kbd", "label", "marker", "menubar", "message", "navigation-menu", "pagination",
    "popover", "progress", "radio-group", "resizable", "scroll-area",
    "select", "separator", "sheet", "sidebar", "skeleton",
    "slider", "spinner", "switch", "table", "tabs", "textarea", "toast",
    "toggle", "toggle-group", "tooltip",
  ];

  it("contains exactly the planned components", () => {
    expect(Object.keys(registry).sort()).toEqual(EXPECTED);
  });

  it("declares its keys in alphabetical order in the source file", () => {
    // Deliberately unsorted: sorting first would make any source ordering pass, which
    // is what the previous version of this check did.
    const keys = Object.keys(registry);
    expect(keys).toEqual([...keys].sort());
    expect(keys).toEqual(EXPECTED);
  });

  it("gives every component a distinct title", () => {
    const titles = Object.values(registry).map((e) => e.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("appears in the library bundle once per component", () => {
    const lib = JSON.parse(readFileSync(join(out, "comic-ui.excalidrawlib"), "utf8"));
    expect(lib.libraryItems).toHaveLength(EXPECTED.length);
  });
});

describe("preset builds", () => {
  it("writes the default preset to dist root", () => {
    expect(outDirFor(resolveTheme(DEFAULT_PRESET))).toBe(DEFAULT_OUT);
  });

  it("writes a named preset to a subdirectory", () => {
    expect(outDirFor(resolveTheme({ name: "soft" }))).toBe(join(DEFAULT_OUT, "soft"));
  });

  it("loads a preset file from presets/", () => {
    expect(loadPreset("default")).toMatchObject({ name: "default", palette: "zinc" });
  });

  it("throws with the path when a preset is missing", () => {
    expect(() => loadPreset("nope")).toThrow(/presets\/nope\.json/);
    expect(() => loadPreset("nope")).not.toThrow(/not valid JSON/);
  });

  it("throws naming the path and the parse error when a preset file is malformed", () => {
    const badPath = join(PRESETS_DIR, "_malformed-test.json");
    writeFileSync(badPath, "{ not: valid json");
    try {
      expect(() => loadPreset("_malformed-test")).toThrow(/presets\/_malformed-test\.json/);
      expect(() => loadPreset("_malformed-test")).toThrow(/not valid JSON/);
    } finally {
      unlinkSync(badPath);
    }
  });

  it("lists committed presets", () => {
    expect(listPresets()).toContain("default");
  });

  it("builds every component under a non-default theme", () => {
    const tmp = mkdtempSync(join(tmpdir(), "preset-"));
    buildAll(resolveTheme({ name: "t", palette: "mist", edges: "sharp" }), tmp);
    expect(readdirSync(join(tmp, "components"))).toHaveLength(58);
    rmSync(tmp, { recursive: true, force: true });
  });
});

describe("preset CLI", () => {
  it("exits with an error naming the missing argument when --preset has no value", () => {
    expect(() =>
      execFileSync("npx", ["tsx", "src/build.ts", "--preset"], {
        cwd: join(PRESETS_DIR, ".."),
        stdio: ["ignore", "pipe", "pipe"],
      }),
    ).toThrowError(/--preset requires a preset name/);
  });
});
