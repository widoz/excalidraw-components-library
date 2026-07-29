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

describe("carousel", () => {
  it("shows the slide index, three dot indicators and two chevrons", () => {
    const els = load(out, "carousel");
    expect(texts(els)).toContain("1 / 3");
    const dots = els.filter((e) => e.type === "ellipse" && e.width === 12);
    expect(dots).toHaveLength(3);
    // Two "left"/"right" chevrons, one per nav button, each a single line.
    expect(count(els, "line")).toBe(2);
  });
});

describe("chart", () => {
  it("has five month labels, five bars and one accent-filled bar", () => {
    const els = load(out, "chart");
    for (const month of ["Mar", "Apr", "May", "Jun", "Jul"]) {
      expect(texts(els)).toContain(month);
    }
    const bars = els.filter((e) => e.type === "rectangle" && e.strokeColor === color.transparent);
    expect(bars).toHaveLength(5);
    const accentBars = bars.filter((e) => e.backgroundColor === color.accent);
    expect(accentBars).toHaveLength(1);
  });
});

describe("collapsible", () => {
  it("shows the trigger text twice, two chevrons and three content rules", () => {
    const els = load(out, "collapsible");
    expect(texts(els).filter((t) => t === "Show 3 more")).toHaveLength(2);
    expect(count(els, "line")).toBe(2 + 3);
    // Content rules are drawn with the muted stroke, distinguishing them from the chevrons.
    const contentRules = els.filter((e) => e.type === "line" && e.strokeColor === color.muted);
    expect(contentRules).toHaveLength(3);
  });
});

describe("combobox", () => {
  it("shows the trigger, search row and items, with one selection", () => {
    const els = load(out, "combobox");
    for (const text of ["Excalifont", "Comic Shanns", "Nunito", "Search font..."]) {
      expect(texts(els)).toContain(text);
    }
    // checkMark's tick is the only line whose path goes upward (a negative relative
    // y): the trigger's chevron is also a 3-point line, so point count alone can't
    // tell them apart.
    const checks = els.filter(
      (e) => e.type === "line" && (e.points as Array<[number, number]>).some((p) => p[1] < 0),
    );
    expect(checks).toHaveLength(1);
    const mutedBands = els.filter((e) => e.type === "rectangle" && e.strokeColor === color.transparent && e.backgroundColor === color.muted);
    expect(mutedBands).toHaveLength(1);
  });
});

describe("command", () => {
  it("shows the search and suggestion texts, three key caps and one highlighted row", () => {
    const els = load(out, "command");
    for (const text of ["Type a command...", "Suggestions", "New drawing", "Open library", "Export as PNG"]) {
      expect(texts(els)).toContain(text);
    }
    for (const key of ["N", "L", "E"]) {
      expect(texts(els)).toContain(key);
    }
    const mutedBands = els.filter((e) => e.type === "rectangle" && e.strokeColor === color.transparent && e.backgroundColor === color.muted);
    expect(mutedBands).toHaveLength(1);
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

describe("context-menu", () => {
  it("shows the drop label, all three menu items, one hover row and one separator", () => {
    const els = load(out, "context-menu");
    // "Right-click here" + "Back" + "Reload" + "Inspect". The brief's own checklist
    // says "all five texts present" but only names four; the component draws the
    // four it names and this test pins that count explicitly.
    expect(texts(els)).toEqual(expect.arrayContaining(["Right-click here", "Back", "Reload", "Inspect"]));
    expect(count(els, "text")).toBe(4);
    const mutedBands = els.filter((e) => e.type === "rectangle" && e.strokeColor === color.transparent && e.backgroundColor === color.muted);
    expect(mutedBands).toHaveLength(1);
    // One separator rule.
    expect(count(els, "line")).toBe(1);
  });

  it("draws the drop target as a dashed rectangle", () => {
    const els = load(out, "context-menu");
    const dashed = els.filter((e) => e.type === "rectangle" && e.strokeStyle === "dashed");
    expect(dashed).toHaveLength(1);
  });
});

describe("date-picker", () => {
  it("shows the trigger date, the popover header and one accent-filled day", () => {
    const els = load(out, "date-picker");
    expect(texts(els)).toContain("17 July 2026");
    expect(texts(els)).toContain("July 2026");
    const accentEllipses = els.filter((e) => e.type === "ellipse" && e.backgroundColor === color.accent);
    expect(accentEllipses).toHaveLength(1);
    // Header left/right chevrons are 3-point lines; the glyph's two binding
    // strokes are 2-point lines, so filtering by point count isolates the chevrons.
    const chevrons = els.filter((e) => e.type === "line" && (e.points as unknown[]).length === 3);
    expect(chevrons).toHaveLength(2);
  });
});

describe("drawer", () => {
  it("has a title, a copy-link button and a 60-wide grabber bar", () => {
    const els = load(out, "drawer");
    expect(texts(els)).toContain("Share drawing");
    expect(texts(els)).toContain("Copy link");
    const grabber = els.find((e) => e.type === "rectangle" && e.backgroundColor === color.border && e.strokeColor === color.transparent);
    expect(grabber).toBeDefined();
    expect(grabber?.width).toBe(60);
    const accentSurfaces = els.filter((e) => e.type === "rectangle" && e.backgroundColor === color.accent);
    expect(accentSurfaces).toHaveLength(1);
  });
});

describe("empty", () => {
  it("has a burst glyph, a title, body copy and a call-to-action, inside a dashed frame", () => {
    const els = load(out, "empty");
    expect(texts(els)).toContain("?");
    expect(texts(els)).toContain("Nothing here yet");
    expect(texts(els)).toContain("Draw something to get started.");
    expect(texts(els)).toContain("New drawing");
    const bursts = els.filter((e) => e.type === "line" && Array.isArray(e.points) && (e.points as unknown[]).length > 10);
    expect(bursts).toHaveLength(1);
    const outer = els.find((e) => e.type === "rectangle");
    expect(outer?.strokeStyle).toBe("dashed");
  });
});

describe("field", () => {
  it("has two labelled groups, one valid and one in error", () => {
    const els = load(out, "field");
    expect(texts(els)).toEqual(expect.arrayContaining([
      "Email", "ada@example.com", "We'll never share it.",
      "Password", "•••", "Too short.",
    ]));
    // Each input is an inkBox, which draws exactly one shadow rect (fill = ink,
    // strokeWidth 1) behind its surface rect.
    const shadowed = els.filter((e) => e.type === "rectangle" && e.backgroundColor === color.ink && e.strokeWidth === 1);
    expect(shadowed).toHaveLength(2);
    const errorMessage = els.find((e) => e.type === "text" && e.text === "Too short.");
    expect(errorMessage?.fontFamily).toBe(7);
  });
});

describe("hover-card", () => {
  it("shows the handle twice, the initials once, and one accent avatar", () => {
    const els = load(out, "hover-card");
    expect(texts(els).filter((t) => t === "@guido")).toHaveLength(2);
    expect(texts(els)).toContain("GS");
    const accentEllipses = els.filter((e) => e.type === "ellipse" && e.backgroundColor === color.accent);
    expect(accentEllipses).toHaveLength(1);
  });
});

describe("input-group", () => {
  it("shows the prefix, value and action, with one accent segment and one shared shadow", () => {
    const els = load(out, "input-group");
    expect(texts(els)).toEqual(expect.arrayContaining(["@", "guido", "Copy"]));
    const accentSegments = els.filter((e) => e.type === "rectangle" && e.backgroundColor === color.accent);
    expect(accentSegments).toHaveLength(1);
    const shadowRects = els.filter((e) => e.type === "rectangle" && e.strokeWidth === 1);
    expect(shadowRects).toHaveLength(1);
  });
});

describe("input-otp", () => {
  it("has three filled digits, six shadowed cells and one caret", () => {
    const els = load(out, "input-otp");
    expect(texts(els)).toEqual(expect.arrayContaining(["4", "2", "7"]));
    const shadowedCells = els.filter((e) => e.type === "rectangle" && e.backgroundColor === color.ink && e.strokeWidth === 1);
    expect(shadowedCells).toHaveLength(6);
    const caret = els.filter((e) => e.type === "line" && e.strokeWidth === 2);
    expect(caret).toHaveLength(1);
  });
});

describe("item", () => {
  it("has a title, subtitle, glyph, one chevron and one muted icon circle", () => {
    const els = load(out, "item");
    expect(texts(els)).toEqual(expect.arrayContaining(["★", "Sketch Kit", "20 components"]));
    expect(count(els, "line")).toBe(1);
    const mutedEllipses = els.filter((e) => e.type === "ellipse" && e.backgroundColor === color.muted);
    expect(mutedEllipses).toHaveLength(1);
  });
});

describe("kbd", () => {
  it("has five labels and four shadowed key caps", () => {
    const els = load(out, "kbd");
    expect(texts(els)).toEqual(expect.arrayContaining(["⌘", "K", "Shift", "↵", "+"]));
    const shadowedCaps = els.filter((e) => e.type === "rectangle" && e.backgroundColor === color.ink && e.strokeWidth === 1);
    expect(shadowedCaps).toHaveLength(4);
  });
});

describe("label", () => {
  it("shows the input pairing and the checkbox pairing", () => {
    const els = load(out, "label");
    // The brief's own prose names three texts: "Email address", "ada@example.com"
    // and "Accept terms" — there is no fourth. See task-6-report.md.
    expect(texts(els)).toEqual(["Email address", "ada@example.com", "Accept terms"]);
    // One check mark, drawn as a single line.
    expect(count(els, "line")).toBe(1);
    const accentBoxes = els.filter((e) => e.type === "rectangle" && e.backgroundColor === color.accent);
    expect(accentBoxes).toHaveLength(1);
  });
});

describe("menubar", () => {
  it("shows four titles and Edit's open menu of three items", () => {
    const els = load(out, "menubar");
    expect(texts(els)).toEqual(["File", "Edit", "View", "Help", "Undo", "Redo", "Preferences"]);
    const mutedBands = els.filter((e) => e.type === "rectangle" && e.backgroundColor === color.muted);
    expect(mutedBands).toHaveLength(1);
    // One separator rule.
    expect(count(els, "line")).toBe(1);
  });
});

describe("navigation-menu", () => {
  it("shows three nav items with chevrons and a mega-panel of four subtitled items", () => {
    const els = load(out, "navigation-menu");
    expect(texts(els)).toEqual([
      "Product", "Docs", "Pricing",
      "Getting started", "Components", "Theming", "Examples",
    ]);
    // 3 down chevrons + 4 subtitle rules = 7 lines.
    expect(count(els, "line")).toBe(7);
  });
});

describe("popover", () => {
  it("shows the trigger and a bubble whose tail apex aims at the trigger's centre", () => {
    const els = load(out, "popover");
    expect(texts(els)).toEqual(expect.arrayContaining(["Options", "Dimensions", "px"]));
    const tails = els.filter((e) => e.type === "line" && (e.points as unknown[]).length === 4);
    expect(tails).toHaveLength(1);
    const tail = tails[0] as { x: number; points: Array<[number, number]> };
    const trigger = els.find((e) => e.type === "text" && e.text === "Options") as { x: number; width: number };
    const apexX = tail.x + tail.points[1]![0];
    const triggerCenterX = trigger.x + trigger.width / 2;
    expect(apexX).toBeCloseTo(triggerCenterX, 5);
  });
});

describe("resizable", () => {
  it("shows two panels and a handle with a three-dot vertical grip", () => {
    const els = load(out, "resizable");
    expect(texts(els)).toEqual(["Left", "Right"]);
    expect(count(els, "ellipse")).toBe(3);
    const mutedBands = els.filter((e) => e.type === "rectangle" && e.backgroundColor === color.muted);
    expect(mutedBands).toHaveLength(1);
  });
});

describe("scroll-area", () => {
  it("has eight content rules and a two-piece scrollbar with a shorter thumb", () => {
    const els = load(out, "scroll-area");
    expect(count(els, "line")).toBe(8);
    const scrollbarBands = els.filter((e) => e.type === "rectangle" && e.strokeColor === color.transparent);
    expect(scrollbarBands).toHaveLength(2);
    const [track, thumb] = scrollbarBands.sort((a, b) => (b.height as number) - (a.height as number));
    expect((thumb!.height as number)).toBeLessThan(track!.height as number);
  });
});

describe("separator", () => {
  it("has all five texts and three rules, one horizontal and two vertical", () => {
    const els = load(out, "separator");
    expect(texts(els)).toEqual(expect.arrayContaining([
      "Radix Primitives", "An open-source UI component library.", "Blog", "Docs", "Source",
    ]));
    const lines = els.filter((e) => e.type === "line") as Array<{ width: number; height: number }>;
    expect(lines).toHaveLength(3);
    const horizontal = lines.filter((l) => l.width > l.height);
    const vertical = lines.filter((l) => l.height > l.width);
    expect(horizontal).toHaveLength(1);
    expect(vertical).toHaveLength(2);
  });
});

describe("sheet", () => {
  it("has all five texts, a two-line X, and one accent button surface", () => {
    const els = load(out, "sheet");
    expect(texts(els)).toEqual(expect.arrayContaining([
      "Edit drawing", "Name", "Tags", "Notes", "Save changes",
    ]));
    expect(count(els, "line")).toBe(2);
    const accentSurfaces = els.filter((e) => e.type === "rectangle" && e.backgroundColor === color.accent);
    expect(accentSurfaces).toHaveLength(1);
  });

  it("draws its hard shadow to the left, behind the surface", () => {
    const els = load(out, "sheet");
    const rects = els.filter((e) => e.type === "rectangle");
    const shadow = rects[0] as { x: number; y: number; backgroundColor: string };
    const surface = rects[1] as { x: number; y: number; backgroundColor: string };
    expect(shadow.backgroundColor).toBe(color.ink);
    expect(shadow.x).toBeLessThan(surface.x);
    expect(shadow.y).toBeGreaterThan(surface.y);
  });
});

describe("sidebar", () => {
  it("has all seven texts, one muted row band and one accent edge marker", () => {
    const els = load(out, "sidebar");
    expect(texts(els)).toEqual(expect.arrayContaining([
      "Sketch Kit", "Overview", "Components", "Palette", "Settings", "GS", "guido",
    ]));
    const mutedBands = els.filter((e) => e.type === "rectangle" && e.strokeColor === color.transparent && e.backgroundColor === color.muted);
    expect(mutedBands).toHaveLength(1);
    const accentEdges = els.filter((e) => e.type === "rectangle" && e.strokeColor === color.transparent && e.backgroundColor === color.accent && e.width === 4);
    expect(accentEdges).toHaveLength(1);
  });
});

describe("skeleton", () => {
  it("has zero text, exactly three bars and one ellipse", () => {
    const els = load(out, "skeleton");
    expect(count(els, "text")).toBe(0);
    const bars = els.filter((e) => e.type === "rectangle" && e.strokeColor === color.transparent);
    expect(bars).toHaveLength(3);
    expect(count(els, "ellipse")).toBe(1);
  });
});

describe("spinner", () => {
  it("has three arc lines and a loading label, zero rectangles", () => {
    const els = load(out, "spinner");
    expect(texts(els)).toContain("Loading...");
    expect(count(els, "rectangle")).toBe(0);
    const arcs = els.filter((e) => e.type === "line");
    expect(arcs).toHaveLength(3);
    for (const a of arcs) {
      expect((a.points as unknown[]).length).toBeGreaterThan(8);
    }
  });
});

describe("toggle", () => {
  it("has one pressed toggle with no shadow and one at rest with a shadow", () => {
    const els = load(out, "toggle");
    expect(texts(els)).toEqual(expect.arrayContaining(["B", "I", "Bold", "Italic"]));
    const accentRects = els.filter((e) => e.type === "rectangle" && e.backgroundColor === color.accent);
    expect(accentRects).toHaveLength(1);
    const shadowRects = els.filter((e) => e.type === "rectangle" && e.strokeWidth === 1);
    expect(shadowRects).toHaveLength(1);
  });
});

describe("toggle-group", () => {
  it("has zero text, nine alignment marks, one pressed cell and one shared shadow", () => {
    const els = load(out, "toggle-group");
    expect(count(els, "text")).toBe(0);
    const marks = els.filter((e) => e.type === "line" && e.strokeWidth === 3);
    expect(marks).toHaveLength(9);
    const accentRects = els.filter((e) => e.type === "rectangle" && e.backgroundColor === color.accent);
    expect(accentRects).toHaveLength(1);
    const shadowRects = els.filter((e) => e.type === "rectangle" && e.strokeWidth === 1);
    expect(shadowRects).toHaveLength(1);
  });
});

describe("attachment", () => {
  it("has a filename and size, four lines, and one muted band", () => {
    const els = load(out, "attachment");
    expect(texts(els)).toEqual(expect.arrayContaining(["sketch-kit.excalidraw", "48 KB"]));
    expect(count(els, "line")).toBe(4);
    const mutedBands = els.filter((e) => e.type === "rectangle" && e.strokeColor === color.transparent && e.backgroundColor === color.muted);
    expect(mutedBands).toHaveLength(1);
  });
});

describe("bubble", () => {
  it("has zero text, two closed tails, and one accent-filled bubble", () => {
    const els = load(out, "bubble");
    expect(count(els, "text")).toBe(0);
    const tails = els.filter((e) => e.type === "line" && (e.points as unknown[]).length === 4);
    expect(tails).toHaveLength(2);
    const accentSurfaces = els.filter((e) => e.type === "rectangle" && e.backgroundColor === color.accent);
    expect(accentSurfaces).toHaveLength(1);
  });
});

describe("marker", () => {
  it("has all three lines of copy and exactly two closed swashes", () => {
    const els = load(out, "marker");
    expect(texts(els)).toEqual([
      "The quick brown fox",
      "jumps over the lazy dog",
      "and lands in the ink.",
    ]);
    // Each swash is a 7-point closed blob (the points array manually repeats its first point).
    const swashes = els.filter((e) => e.type === "line" && (e.points as unknown[]).length === 7);
    expect(swashes).toHaveLength(2);
  });

  it("emits each swash before the text line it highlights", () => {
    const els = load(out, "marker");
    const line1Text = els.find((e) => e.type === "text" && e.text === "The quick brown fox")!;
    const line2Text = els.find((e) => e.type === "text" && e.text === "jumps over the lazy dog")!;
    const swashes = els.filter((e) => e.type === "line" && (e.points as unknown[]).length === 7);
    expect((swashes[0]!.index as string) < (line1Text.index as string)).toBe(true);
    expect((swashes[1]!.index as string) < (line2Text.index as string)).toBe(true);
  });
});

describe("message", () => {
  it("has both timestamps and both initials", () => {
    const els = load(out, "message");
    expect(texts(els)).toEqual(expect.arrayContaining(["GS", "AI", "09:24", "09:25"]));
  });

  it("has exactly two tail lines, one accent-filled ellipse, one accent-filled bubble", () => {
    const els = load(out, "message");
    const tails = els.filter((e) => e.type === "line" && (e.points as unknown[]).length === 4);
    expect(tails).toHaveLength(2);
    const accentEllipses = els.filter((e) => e.type === "ellipse" && e.backgroundColor === color.accent);
    expect(accentEllipses).toHaveLength(1);
    const accentSurfaces = els.filter((e) => e.type === "rectangle" && e.backgroundColor === color.accent);
    expect(accentSurfaces).toHaveLength(1);
  });
});

describe("toast", () => {
  it("has a title, body and an Undo button", () => {
    const els = load(out, "toast");
    expect(texts(els)).toEqual(expect.arrayContaining(["Drawing saved", "Your changes are on disk.", "Undo"]));
  });

  it("draws its shadow offset +10 from the surface, not the default 6", () => {
    const els = load(out, "toast");
    const cards = els.filter((e) => e.type === "rectangle" && e.width === 360 && e.height === 110) as Array<{ x: number; y: number }>;
    expect(cards).toHaveLength(2);
    const surface = cards.find((r) => r.x === 0 && r.y === 0)!;
    const shadow = cards.find((r) => r.x === 10 && r.y === 10)!;
    expect(surface).toBeDefined();
    expect(shadow).toBeDefined();
    expect(shadow.x - surface.x).toBe(10);
    expect(shadow.y - surface.y).toBe(10);
  });

  it("has exactly two lines forming the X", () => {
    const els = load(out, "toast");
    expect(count(els, "line")).toBe(2);
  });
});
