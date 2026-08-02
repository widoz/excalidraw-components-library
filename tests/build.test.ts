import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildAll, DEFAULT_OUT, loadPreset, listPresets, outDirFor, PRESETS_DIR, pruneOrphans, selectPresets } from "../src/build.js";
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

  it("writes a variant directory per component", () => {
    for (const name of Object.keys(registry)) {
      const dir = join(out, "components", name);
      const files = readdirSync(dir).filter((f) => f.endsWith(".excalidraw"));
      expect(files.length).toBeGreaterThan(0);
    }
  });

  it("normalises every variant file to the origin", () => {
    for (const name of Object.keys(registry)) {
      const dir = join(out, "components", name);
      for (const file of readdirSync(dir)) {
        const scene = JSON.parse(readFileSync(join(dir, file), "utf8"));
        const minX = Math.min(...scene.elements.map((e: { x: number }) => e.x));
        const minY = Math.min(...scene.elements.map((e: { y: number }) => e.y));
        expect([minX, minY], `${name}/${file}`).toEqual([0, 0]);
      }
    }
  });

  it("keeps each component's variants a partition of its sheet", () => {
    for (const name of Object.keys(registry)) {
      const sheet = JSON.parse(readFileSync(join(out, "components", `${name}.excalidraw`), "utf8"));
      const dir = join(out, "components", name);
      const fromVariants = readdirSync(dir)
        .sort()
        .flatMap((file) => JSON.parse(readFileSync(join(dir, file), "utf8")).elements as { id: string }[])
        .map((e) => e.id)
        .sort();
      const fromSheet = (sheet.elements as { id: string }[]).map((e) => e.id).sort();
      expect(fromVariants, name).toEqual(fromSheet);
    }
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
  it("writes the default preset to its own subdirectory, like any other preset", () => {
    expect(outDirFor(resolveTheme(DEFAULT_PRESET))).toBe(join(DEFAULT_OUT, "default"));
  });

  it("writes a named preset to a subdirectory", () => {
    expect(outDirFor(resolveTheme({ name: "soft" }))).toBe(join(DEFAULT_OUT, "soft"));
  });

  // Second layer: even if a traversal name reached a Theme some other way (a future
  // caller building one by hand, a loosened check), the output path must stay in dist/.
  it.each(["..", "../..", "../../etc"])(
    "refuses to derive an output directory that escapes dist/ for the name %j",
    (name) => {
      const escaped = { ...theme, name };
      expect(() => outDirFor(escaped)).toThrow(/escapes/);
      expect(() => outDirFor(escaped)).toThrow(new RegExp(DEFAULT_OUT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    },
  );

  it("resolveTheme rejects a traversal name outright, so buildAll never sees one", () => {
    expect(() => resolveTheme({ name: ".." })).toThrow(/illegal/);
    expect(() => buildAll(resolveTheme({ name: "../.." }))).toThrow(/illegal/);
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

  it("rejects a preset whose filename and name field disagree", () => {
    const path = join(PRESETS_DIR, "_mismatch-test.json");
    writeFileSync(path, `{ "name": "somethingelse" }`);
    try {
      expect(() => loadPreset("_mismatch-test")).toThrow(/must match/);
      expect(() => loadPreset("_mismatch-test")).toThrow(/somethingelse/);
    } finally {
      unlinkSync(path);
    }
  });

  it("lists committed presets", () => {
    expect(listPresets()).toContain("default");
  });

  it("builds every component under a non-default theme", () => {
    const tmp = mkdtempSync(join(tmpdir(), "preset-"));
    buildAll(resolveTheme({ name: "t", palette: "mist", edges: "sharp" }), tmp);
    expect(
      readdirSync(join(tmp, "components")).filter((f) => f.endsWith(".excalidraw")),
    ).toHaveLength(58);
    rmSync(tmp, { recursive: true, force: true });
  });

  it("prunes a dist subdirectory with no backing preset file, and keeps the backed ones", () => {
    const dist = mkdtempSync(join(tmpdir(), "prune-"));
    // Created out of sorted order (zzz before aaa) so a returned .sort() actually
    // gets exercised — a single-orphan test would pass just as well without it.
    for (const name of ["zzz", "aaa"]) {
      mkdirSync(join(dist, name, "components"), { recursive: true });
    }
    for (const name of listPresets()) {
      mkdirSync(join(dist, name, "components"), { recursive: true });
    }
    // A loose file is not a preset's output directory and must survive.
    writeFileSync(join(dist, "notes.txt"), "keep me");

    expect(pruneOrphans(dist)).toEqual(["aaa", "zzz"]);
    expect(existsSync(join(dist, "zzz"))).toBe(false);
    expect(existsSync(join(dist, "aaa"))).toBe(false);
    for (const name of listPresets()) {
      expect(existsSync(join(dist, name)), name).toBe(true);
    }
    expect(existsSync(join(dist, "notes.txt"))).toBe(true);

    rmSync(dist, { recursive: true, force: true });
  });

  it("reports nothing to prune when dist mirrors presets", () => {
    const dist = mkdtempSync(join(tmpdir(), "prune-clean-"));
    for (const name of listPresets()) mkdirSync(join(dist, name), { recursive: true });
    expect(pruneOrphans(dist)).toEqual([]);
    rmSync(dist, { recursive: true, force: true });
  });
});

// This suite shells out to the real build/validate CLIs against the repo's actual
// dist/, including a full build's prune step — it deletes any dist/<name>/ with no
// backing preset file. It cleans up its own "_orphan-test", but an unrelated
// directory (e.g. a developer's dist/experiment/) left under dist/ would be destroyed
// by simply running the suite.
describe("preset CLI", () => {
  const REPO_ROOT = join(PRESETS_DIR, "..");

  it("exits with an error naming the missing argument when --preset has no value", () => {
    expect(() =>
      execFileSync("npx", ["tsx", "src/build.ts", "--preset"], {
        cwd: REPO_ROOT,
        stdio: ["ignore", "pipe", "pipe"],
      }),
    ).toThrowError(/--preset requires a preset name/);
  });

  it("does not take a following flag as the preset name", () => {
    expect(() => selectPresets(["--preset", "--quiet"])).toThrow(/--preset requires a preset name/);
  });

  it("rejects an unknown flag rather than silently running a full, pruning build", () => {
    // The bug this guards: "--preset=soft" and "--presset soft" both contain no
    // "--preset" token, so isFullBuild's indexOf check used to read them as a bare
    // (full, pruning) build — a typo in the narrowing flag reached the destructive path.
    expect(() => selectPresets(["--preset=soft"])).toThrow(/--preset=soft/);
    expect(() => selectPresets(["--presset", "soft"])).toThrow(/--presset/);
  });

  it("still accepts every previously-accepted form after adding unknown-flag rejection", () => {
    expect(() => selectPresets([])).not.toThrow();
    expect(() => selectPresets(["--all"])).not.toThrow();
    expect(() => selectPresets(["--preset", "blueprint"])).not.toThrow();
    expect(() => selectPresets(["--preset", "--quiet"])).toThrow(/--preset requires a preset name/);
  });

  it("selects every preset by default, every preset for --all, or one named preset", () => {
    expect(selectPresets([])).toEqual(listPresets());
    expect(selectPresets(["--all"])).toEqual(listPresets());
    expect(selectPresets(["--preset", "blueprint"])).toEqual(["blueprint"]);
  });

  it("selects more than one preset for a bare build, so no preset is privileged", () => {
    // Guards the regression this change exists to prevent: a bare build that quietly
    // means "default only" leaves every other preset's committed output stale.
    expect(selectPresets([]).length).toBeGreaterThan(1);
    expect(selectPresets([])).toContain("default");
  });

  // A full build iterates listPresets() in sorted order. Each preset owns its own
  // dist/<name>/, so building one never reaches a sibling.
  beforeAll(() => {
    execFileSync("npx", ["tsx", "src/build.ts", "--all"], { cwd: REPO_ROOT, encoding: "utf8" });
  });

  it("--all leaves every preset's output present", () => {
    for (const name of listPresets()) {
      const dir = outDirFor(resolveTheme(loadPreset(name)));
      expect(
        readdirSync(join(dir, "components")).filter((f) => f.endsWith(".excalidraw")),
        `${name} components`,
      ).toHaveLength(Object.keys(registry).length);
      expect(existsSync(join(dir, "comic-ui.excalidrawlib")), `${name} library`).toBe(true);
    }
  });

  it("building one named preset leaves other presets' output alone", () => {
    const blueprint = outDirFor(resolveTheme(loadPreset("blueprint")));
    execFileSync("npx", ["tsx", "src/build.ts", "--preset", "default"], { cwd: REPO_ROOT, encoding: "utf8" });
    expect(existsSync(join(blueprint, "comic-ui.excalidrawlib"))).toBe(true);
  });

  it("validates a named preset's own output directory", () => {
    const stdout = execFileSync("npx", ["tsx", "src/validate.ts", "--preset", "blueprint"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
    expect(stdout).toContain("All generated files are valid.");
  });

  it("a bare build prunes an orphaned output directory", () => {
    const orphan = join(PRESETS_DIR, "..", "dist", "_orphan-test");
    mkdirSync(join(orphan, "components"), { recursive: true });
    try {
      execFileSync("npx", ["tsx", "src/build.ts"], { cwd: REPO_ROOT, encoding: "utf8" });
      expect(existsSync(orphan)).toBe(false);
    } finally {
      // The build should have removed it; clean up anyway so a failure here does not
      // leave an untracked directory behind in the real dist/.
      rmSync(orphan, { recursive: true, force: true });
    }
  });

  it("a narrowed build leaves an orphaned output directory alone", () => {
    const orphan = join(PRESETS_DIR, "..", "dist", "_orphan-test");
    mkdirSync(join(orphan, "components"), { recursive: true });
    try {
      execFileSync("npx", ["tsx", "src/build.ts", "--preset", "default"], { cwd: REPO_ROOT, encoding: "utf8" });
      expect(existsSync(orphan)).toBe(true);
    } finally {
      rmSync(orphan, { recursive: true, force: true });
    }
  });
});
