import { describe, expect, it } from "vitest";
import { normalize, variants } from "../src/variants.js";
import type { ExcalidrawElement } from "../src/element.js";

const el = (x: number, y: number): ExcalidrawElement =>
  ({ id: `e${x}-${y}`, type: "rectangle", x, y, width: 10, height: 10 } as unknown as ExcalidrawElement);

describe("variants", () => {
  it("concatenates parts in declaration order", () => {
    const out = variants([
      { name: "default", elements: [el(0, 0)] },
      { name: "secondary", elements: [el(0, 20), el(0, 30)] },
    ]);
    expect(out.elements.map((e) => e.y)).toEqual([0, 20, 30]);
    expect(out.variants.map((v) => v.name)).toEqual(["default", "secondary"]);
  });

  it("rejects a malformed name", () => {
    expect(() => variants([{ name: "Default", elements: [el(0, 0)] }])).toThrow(/[a-z0-9]/);
  });

  it("rejects a duplicate name", () => {
    expect(() => variants([
      { name: "a", elements: [el(0, 0)] },
      { name: "a", elements: [el(0, 10)] },
    ])).toThrow(/duplicate/i);
  });

  it("rejects an empty variant", () => {
    expect(() => variants([{ name: "a", elements: [] }])).toThrow(/no elements/i);
  });

  it("rejects a component with no variants", () => {
    expect(() => variants([])).toThrow(/at least one/i);
  });
});

describe("normalize", () => {
  it("moves the bounding box to the origin", () => {
    const out = normalize([el(-4, 8), el(6, 20)]);
    expect(out.map((e) => [e.x, e.y])).toEqual([[0, 0], [10, 12]]);
  });

  it("does not mutate its input", () => {
    const input = [el(-4, 8)];
    normalize(input);
    expect(input[0]!.x).toBe(-4);
  });
});
