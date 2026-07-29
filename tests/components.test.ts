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

describe("select", () => {
  it("shows a trigger with a chevron and an open menu with a highlighted item", () => {
    const els = load(out, "select");
    expect(texts(els)).toContain("Pick a style");
    expect(texts(els)).toContain("Comic");
    // One chevron line.
    expect(count(els, "line")).toBe(1);
    // The highlighted menu row is an accent-filled rectangle.
    expect(els.some((e) => e.type === "rectangle" && e.backgroundColor === color.accent)).toBe(true);
  });
});

describe("dropdown-menu", () => {
  it("shows a trigger, four items, one hover row and one separator", () => {
    const els = load(out, "dropdown-menu");
    expect(texts(els)).toContain("Duplicate");
    expect(texts(els)).toContain("Delete");
    // One separator rule.
    expect(count(els, "line")).toBe(1);
  });
});

describe("card", () => {
  it("has a title, two body lines and a footer button", () => {
    const els = load(out, "card");
    expect(texts(els)).toContain("Sketch Kit");
    expect(texts(els)).toContain("Get it");
    expect(count(els, "line")).toBe(2);
  });
});

describe("badge", () => {
  it("has four badges with four labels", () => {
    const els = load(out, "badge");
    expect(count(els, "text")).toBe(4);
    expect(texts(els)).toContain("New");
  });
});

describe("alert", () => {
  it("has a burst behind the icon plus a title and body", () => {
    const els = load(out, "alert");
    const bursts = els.filter((e) => e.type === "line" && Array.isArray(e.points) && (e.points as unknown[]).length > 10);
    expect(bursts).toHaveLength(1);
    expect(texts(els)).toContain("Heads up!");
  });
});

describe("avatar", () => {
  it("has an image placeholder, an initials circle and a stack of three", () => {
    const els = load(out, "avatar");
    expect(texts(els)).toContain("GS");
    // 2 shadowed avatars (2 ellipses each) = 4, + 2 glyph ellipses = 6,
    // + 3 flat stacked avatars (1 each) = 9.
    expect(count(els, "ellipse")).toBe(9);
  });
});

describe("tabs", () => {
  it("has three headers with the first active, and a panel", () => {
    const els = load(out, "tabs");
    expect(texts(els)).toEqual(expect.arrayContaining(["Preview", "Code", "Notes"]));
    // Only the active tab is accent-filled.
    const active = els.filter((e) => e.type === "rectangle" && e.backgroundColor === color.accent);
    expect(active).toHaveLength(1);
  });
});

describe("table", () => {
  it("has a header row, three body rows and alternating stripes", () => {
    const els = load(out, "table");
    expect(texts(els)).toEqual(expect.arrayContaining(["Name", "Role", "Ada", "Grace"]));
    const striped = els.filter((e) => e.type === "rectangle" && e.backgroundColor === color.muted);
    // Header row plus one striped body row.
    expect(striped.length).toBeGreaterThanOrEqual(2);
  });
});

describe("progress", () => {
  it("has two tracks and two accent fills", () => {
    const els = load(out, "progress");
    const fills = els.filter((e) => e.type === "rectangle" && e.backgroundColor === color.accent);
    expect(fills).toHaveLength(2);
    expect(texts(els)).toEqual(expect.arrayContaining(["35%", "80%"]));
  });
});

describe("slider", () => {
  it("has a filled track, a knob and a value bubble", () => {
    const els = load(out, "slider");
    expect(texts(els)).toContain("64");
    // Knob: shadow + surface ellipse.
    expect(count(els, "ellipse")).toBe(2);
    // Bubble tail is a closed 4-point line.
    const tails = els.filter((e) => e.type === "line" && (e.points as unknown[]).length === 4);
    expect(tails).toHaveLength(1);
  });
});

describe("tooltip", () => {
  it("has a trigger and a speech bubble with a tail", () => {
    const els = load(out, "tooltip");
    expect(texts(els)).toContain("Save your work!");
    const tails = els.filter((e) => e.type === "line" && (e.points as unknown[]).length === 4);
    expect(tails).toHaveLength(1);
  });
});

describe("dialog", () => {
  it("has a panel frame, a close X, and two footer buttons", () => {
    const els = load(out, "dialog");
    expect(texts(els)).toEqual(expect.arrayContaining(["Delete drawing?", "Cancel", "Delete"]));
    // The close X is two 2-point lines; body copy is two ruled lines.
    expect(count(els, "line")).toBe(4);
  });
});

describe("breadcrumb", () => {
  it("has three crumbs and two chevron separators", () => {
    const els = load(out, "breadcrumb");
    expect(texts(els)).toEqual(expect.arrayContaining(["Home", "Library", "Button"]));
    expect(count(els, "line")).toBe(2);
  });
});

describe("accordion", () => {
  it("shows three triggers with one expanded body", () => {
    const els = load(out, "accordion");
    expect(texts(els)).toEqual(expect.arrayContaining([
      "What is this?",
      "How does it work?",
      "Can I edit it?",
    ]));
    // 3 chevrons + 2 body rules + 2 divider rules.
    expect(count(els, "line")).toBe(7);
  });
});

describe("alert-dialog", () => {
  it("has a title, an icon burst, and two footer buttons", () => {
    const els = load(out, "alert-dialog");
    expect(texts(els)).toEqual(expect.arrayContaining(["Delete everything?", "Cancel", "Yes, delete"]));
    const bursts = els.filter((e) => e.type === "line" && Array.isArray(e.points) && (e.points as unknown[]).length > 10);
    expect(bursts).toHaveLength(1);
    const shadowedFooterBoxes = els.filter(
      (e) => e.type === "rectangle" && e.backgroundColor === color.ink && e.width === 130,
    );
    expect(shadowedFooterBoxes).toHaveLength(2);
  });
});

describe("aspect-ratio", () => {
  it("has a dashed frame, crossed diagonals and a ratio label", () => {
    const els = load(out, "aspect-ratio");
    expect(texts(els)).toContain("16 : 9");
    expect(count(els, "line")).toBe(2);
    const surface = els.find((e) => e.type === "rectangle");
    expect(surface?.strokeStyle).toBe("dashed");
  });
});

describe("button-group", () => {
  it("has three labelled cells with one pressed and one shared shadow", () => {
    const els = load(out, "button-group");
    expect(texts(els)).toEqual(expect.arrayContaining(["Day", "Week", "Month"]));
    const accentRects = els.filter((e) => e.type === "rectangle" && e.backgroundColor === color.accent);
    expect(accentRects).toHaveLength(1);
    const shadowRects = els.filter((e) => e.type === "rectangle" && e.strokeWidth === 1);
    expect(shadowRects).toHaveLength(1);
  });
});

describe("calendar", () => {
  it("has a header, a full weekday row, and both marked days", () => {
    const els = load(out, "calendar");
    expect(texts(els)).toContain("July 2026");
    for (const initial of ["S", "M", "T", "W", "T", "F", "S"]) {
      expect(texts(els)).toContain(initial);
    }
    expect(texts(els)).toContain("17");
    expect(texts(els)).toContain("24");
    const accentEllipses = els.filter((e) => e.type === "ellipse" && e.backgroundColor === color.accent);
    expect(accentEllipses).toHaveLength(1);
    // Header's left/right chevrons.
    expect(count(els, "line")).toBe(2);
  });
});

describe("pagination", () => {
  it("has five page cells with one active, plus prev and next arrows", () => {
    const els = load(out, "pagination");
    expect(texts(els)).toEqual(expect.arrayContaining(["1", "2", "3", "4", "5"]));
    const active = els.filter((e) => e.type === "rectangle" && e.backgroundColor === color.accent);
    // Active page cell is drawn as a shadowed box, so the accent rect is the surface one.
    expect(active).toHaveLength(1);
    // Two chevrons.
    expect(count(els, "line")).toBe(2);
  });
});
