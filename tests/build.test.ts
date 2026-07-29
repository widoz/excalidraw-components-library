import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildAll } from "../src/build.js";
import { validateAll } from "../src/validate.js";
import { registry } from "../src/registry.js";

let out: string;

beforeAll(() => {
  out = mkdtempSync(join(tmpdir(), "comic-ui-"));
  buildAll(out);
});

afterAll(() => {
  rmSync(out, { recursive: true, force: true });
});

describe("build", () => {
  it("produces output that passes validation", () => {
    expect(validateAll(out)).toEqual([]);
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
    buildAll(second);
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
    "accordion", "alert", "alert-dialog", "aspect-ratio", "avatar", "badge",
    "breadcrumb", "button", "button-group", "calendar", "card", "carousel",
    "chart", "checkbox-group", "collapsible", "combobox", "command",
    "context-menu", "date-picker", "dialog", "drawer", "dropdown-menu",
    "empty", "field", "input", "pagination", "progress", "radio-group",
    "select", "slider", "switch", "table", "tabs", "textarea", "tooltip",
  ];

  it("contains exactly the planned components", () => {
    expect(Object.keys(registry).sort()).toEqual(EXPECTED);
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
