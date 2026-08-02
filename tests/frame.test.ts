import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkFrame, frameElements, frameInsets, sampleStyle } from "../scripts/frame.mjs";

const root = join(import.meta.dirname, "..");
const load = (component: string, variant: string) =>
  JSON.parse(readFileSync(join(root, "dist", "components", component, `${variant}.excalidraw`), "utf8"))
    .elements as Array<Record<string, any>>;

const styleFrom = (...components: Array<[string, string]>) => {
  const collector = sampleStyle();
  for (const [component, variant] of components) collector.sample(load(component, variant));
  return collector.get();
};

describe("sampleStyle", () => {
  it("takes rect styling from the first component with a rectangle", () => {
    const style = styleFrom(["button", "default"]);
    expect(style.strokeWidth).toBe(1);
    expect(style.roughness).toBe(2);
    expect(style.roundness).toEqual({ type: 3 });
    expect(style.fillStyle).toBe("solid");
  });

  it("takes text styling even when the first component has no rectangle", () => {
    const style = styleFrom(["separator", "horizontal"], ["button", "default"]);
    expect(style.fontSize).toBe(28);     // separator/horizontal: sampled first, has text but no rect
    expect(style.fontFamily).toBe(7);
    expect(style.strokeWidth).toBe(1);   // button/default: no rect in separator, so rect styling waited
  });

  it("falls back when nothing was sampled", () => {
    const style = sampleStyle().get();
    expect(style).toMatchObject({ strokeWidth: 1, roughness: 2, fontSize: 20, fontFamily: 7 });
  });

  it("keeps the first sample when a second component is fed", () => {
    expect(styleFrom(["button", "default"], ["separator", "horizontal"]).fontSize).toBe(20);
    expect(styleFrom(["separator", "horizontal"], ["button", "default"]).fontSize).toBe(28);
  });

  it("preserves a sampled null roundness rather than falling back", () => {
    expect(styleFrom(["tabs", "default"]).roundness).toBeNull();
  });
});

describe("frameInsets", () => {
  const style = styleFrom(["button", "default"]);

  it("defaults padding to 16 and has no band without a label", () => {
    expect(frameInsets({}, style)).toEqual({ padding: 16, band: 0 });
  });

  it("honours an explicit padding", () => {
    expect(frameInsets({ padding: 4 }, style)).toEqual({ padding: 4, band: 0 });
  });

  it("adds a label band of fontSize * 1.25 plus padding", () => {
    expect(frameInsets({ label: "Settings" }, style)).toEqual({ padding: 16, band: 20 * 1.25 + 16 });
  });
});

describe("frameElements", () => {
  const style = styleFrom(["button", "default"]);

  it("emits one transparent rectangle at the frame's box", () => {
    const [rect] = frameElements({}, 300, 200, style);
    expect(rect.type).toBe("rectangle");
    expect(rect).toMatchObject({ x: 0, y: 0, width: 300, height: 200, backgroundColor: "transparent" });
    expect(rect.strokeColor).toBe(style.strokeColor);
  });

  it("emits no label element without a label", () => {
    expect(frameElements({}, 300, 200, style)).toHaveLength(1);
  });

  it("emits the label inside the top-left padding", () => {
    const [, label] = frameElements({ label: "Settings", padding: 16 }, 300, 200, style);
    expect(label.type).toBe("text");
    expect(label.text).toBe("Settings");
    expect(label.originalText).toBe("Settings");
    expect(label).toMatchObject({ x: 16, y: 16, fontSize: 20, fontFamily: 7 });
    expect(label.width).toBeCloseTo("Settings".length * 20 * style.advance, 6);
  });

  it("gives its elements a group of their own", () => {
    const elements = frameElements({ label: "Settings" }, 300, 200, style);
    const groups = new Set(elements.map((e) => e.groupIds[0]));
    expect(groups.size).toBe(1);
    expect(elements.every((e) => typeof e.id === "string" && typeof e.index === "string")).toBe(true);
  });
});

describe("checkFrame", () => {
  it("accepts an empty frame", () => {
    expect(() => checkFrame({})).not.toThrow();
  });

  it("rejects a non-object", () => {
    expect(() => checkFrame(true)).toThrow(/must be an object/);
  });

  it("rejects an unknown key", () => {
    expect(() => checkFrame({ border: 2 })).toThrow(/Unknown key "border" on a frame\. Use padding, label\./);
  });

  it("rejects a negative padding", () => {
    expect(() => checkFrame({ padding: -4 })).toThrow(/must be a number >= 0, got -4/);
  });

  it("rejects a non-numeric padding", () => {
    expect(() => checkFrame({ padding: "16" })).toThrow(/must be a number >= 0/);
  });

  it("rejects a non-string label", () => {
    expect(() => checkFrame({ label: 3 })).toThrow(/label must be a string, got 3/);
  });
});
