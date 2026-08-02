import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { advanceOf, applyText, normalizeText, textSlots } from "../scripts/text.mjs";

const root = join(import.meta.dirname, "..");
const load = (component: string, variant: string) =>
  JSON.parse(readFileSync(join(root, "dist", "components", component, `${variant}.excalidraw`), "utf8"))
    .elements as Array<Record<string, any>>;

const button = () => load("button", "default");
const tabs = () => load("tabs", "default");

describe("advanceOf", () => {
  it("recovers the metric the build used", () => {
    const text = button().find((e) => e.type === "text")!;
    // width = len * fontSize * advance  ->  99 = 9 * 20 * 0.55
    expect(advanceOf(text)).toBeCloseTo(0.55, 6);
  });

  it("falls back when there is no text to measure", () => {
    expect(advanceOf({ type: "text", text: "", width: 0, fontSize: 20 })).toBe(0.55);
  });
});

describe("textSlots", () => {
  it("returns text elements in array order", () => {
    expect(textSlots(tabs()).map((e: any) => e.text)).toEqual([
      "Preview", "Code", "Notes", "Panel content lives here.",
    ]);
  });

  it("returns an empty list for a component with no text", () => {
    expect(textSlots([{ type: "rectangle" }])).toEqual([]);
  });
});

describe("applyText growing", () => {
  it("inserts the extra width at the old right edge", () => {
    // "Click me!" is 9 chars (99px), "Featured image" is 14 (154px), so delta = 55.
    const out = applyText(button(), "Featured image", "button/default");
    const body = out.find((e: any) => e.type === "rectangle" && e.x === 0)!;
    const shadow = out.find((e: any) => e.type === "rectangle" && e.x === 6)!;
    const text = out.find((e: any) => e.type === "text")!;
    expect(body.width).toBeCloseTo(255, 6);
    expect(shadow.width).toBeCloseTo(255, 6);
    expect(text.width).toBeCloseTo(154, 6);
    expect(text.text).toBe("Featured image");
    expect(text.originalText).toBe("Featured image");
  });

  it("keeps padding symmetric on centred text", () => {
    const out = applyText(button(), "Featured image", "button/default");
    const body = out.find((e: any) => e.type === "rectangle" && e.x === 0)!;
    const text = out.find((e: any) => e.type === "text")!;
    const left = text.x - body.x;
    const right = (body.x + body.width) - (text.x + text.width);
    expect(left).toBeCloseTo(right, 6);
  });

  it("leaves elements entirely left of the cut alone", () => {
    const elements = [
      { type: "rectangle", x: 0, y: 0, width: 10, height: 10 },
      { type: "text", x: 20, y: 0, width: 40, height: 25, fontSize: 20, text: "aaaa", textAlign: "left" },
    ];
    const out = applyText(elements, "aaaaaa", "x/y");
    expect(out[0]).toEqual(elements[0]);
  });

  it("shifts elements that start at or past the cut", () => {
    const elements = [
      { type: "text", x: 0, y: 0, width: 40, height: 25, fontSize: 20, text: "aaaa", textAlign: "left" },
      { type: "rectangle", x: 40, y: 0, width: 10, height: 10 },
    ];
    const out = applyText(elements, "aaaaaa", "x/y");
    expect(out[1].x).toBeCloseTo(60, 6); // delta = 20
  });

  it("scales a straddling line's points", () => {
    const elements = [
      { type: "text", x: 10, y: 0, width: 40, height: 25, fontSize: 20, text: "aaaa", textAlign: "left" },
      { type: "line", x: 0, y: 0, width: 100, height: 0, points: [[0, 0], [100, 0]] },
    ];
    const out = applyText(elements, "aaaaaa", "x/y");
    expect(out[1].width).toBeCloseTo(120, 6);
    expect(out[1].points).toEqual([[0, 0], [120, 0]]);
  });

  it("shifts a zero-width line positioned past the cut", () => {
    const elements = [
      { type: "text", x: 10, y: 0, width: 40, height: 25, fontSize: 20, text: "aaaa", textAlign: "left" },
      { type: "line", x: 51, y: 0, width: 0, height: 50, points: [[0, 0], [0, 50]] },
    ];
    const out = applyText(elements, "aaaaaa", "x/y");
    expect(out[1].x).toBeCloseTo(71, 6); // delta = 20, shifts from 51 to 71
  });

  it("leaves unhandled straddling elements unchanged", () => {
    const elements = [
      { type: "text", x: 10, y: 0, width: 40, height: 25, fontSize: 20, text: "aaaa", textAlign: "left" },
      { type: "freedraw", x: 0, y: 0, width: 100, height: 10 },
    ];
    const out = applyText(elements, "aaaaaa", "x/y");
    expect(out[1]).toEqual(elements[1]);
  });
});

describe("applyText shrinking", () => {
  const box = () => [
    { type: "rectangle", x: 0, y: 0, width: 200, height: 56 },
    { type: "text", x: 50, y: 15, width: 100, height: 25, fontSize: 20, text: "aaaaaaaaaa", textAlign: "center" },
  ];

  it("never shrinks the box", () => {
    const out = applyText(box(), "aaaaa", "x/y");
    expect(out[0]!.width).toBe(200);
  });

  it("re-anchors centred text on its old centre", () => {
    const out = applyText(box(), "aaaaa", "x/y"); // 100 -> 50, delta = -50
    expect(out[1]!.x).toBeCloseTo(75, 6);
    expect(out[1]!.width).toBeCloseTo(50, 6);
  });

  it("leaves left-aligned text where it is", () => {
    const elements = box();
    elements[1]!.textAlign = "left";
    expect(applyText(elements, "aaaaa", "x/y")[1]!.x).toBe(50);
  });

  it("keeps right-aligned text's right edge", () => {
    const elements = box();
    elements[1]!.textAlign = "right";
    const out = applyText(elements, "aaaaa", "x/y");
    expect(out[1]!.x + out[1]!.width).toBeCloseTo(150, 6);
  });
});

describe("applyText with several slots", () => {
  it("replaces positionally", () => {
    const out = applyText(tabs(), ["Post", "Block"], "tabs/default");
    expect(textSlots(out).map((e: any) => e.text)).toEqual([
      "Post", "Block", "Notes", "Panel content lives here.",
    ]);
  });

  it("skips nulls and holes", () => {
    const out = applyText(tabs(), [null, "Block"], "tabs/default");
    expect(textSlots(out).map((e: any) => e.text)).toEqual([
      "Preview", "Block", "Notes", "Panel content lives here.",
    ]);
  });

  it("does not mutate its input", () => {
    const original = button();
    applyText(original, "Publish", "button/default");
    expect(original.find((e: any) => e.type === "text")!.text).toBe("Click me!");
  });
});

describe("normalizeText errors", () => {
  it("rejects the string form on a multi-text component", () => {
    expect(() => normalizeText("Post", textSlots(tabs()), "tabs/default"))
      .toThrow(/tabs\/default has 4 text elements; pass an array/);
  });

  it("names the current strings so the order can be read", () => {
    expect(() => normalizeText("Post", textSlots(tabs()), "tabs/default")).toThrow(/"Preview", "Code"/);
  });

  it("rejects more replacements than slots", () => {
    expect(() => normalizeText(["a", "b", "c", "d", "e"], textSlots(tabs()), "tabs/default"))
      .toThrow(/has 4 text elements but 5 replacements/);
  });

  it("rejects a non-string entry", () => {
    expect(() => normalizeText([42], textSlots(button()), "button/default"))
      .toThrow(/must be a string or null, got 42/);
  });

  it("rejects a newline", () => {
    expect(() => normalizeText(["a\nb"], textSlots(button()), "button/default"))
      .toThrow(/single line/);
  });

  it("rejects a spec that is neither string nor array", () => {
    expect(() => normalizeText({ label: "a" } as never, textSlots(button()), "button/default"))
      .toThrow(/must be a string or an array/);
  });
});
