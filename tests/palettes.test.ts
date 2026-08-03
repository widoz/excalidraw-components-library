import { describe, expect, it } from "vitest";
import { palettes, zinc } from "../src/palettes.js";

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const HEX = /^#[0-9a-f]{6}$/;

describe("palettes", () => {
  it("exposes the shadcn zinc scale", () => {
    expect(zinc[50]).toBe("#fafafa");
    expect(zinc[200]).toBe("#e4e4e7");
    expect(zinc[700]).toBe("#3f3f46");
    expect(zinc[900]).toBe("#18181b");
    expect(Object.keys(zinc)).toHaveLength(11);
  });

  it("uses shadcn's current (Tailwind v4) zinc values", () => {
    expect(zinc[400]).toBe("#9f9fa9");
    expect(zinc[500]).toBe("#71717b");
    expect(zinc[600]).toBe("#52525c");
  });

  // A scale missing a step resolves a role to `undefined`, which reaches Excalidraw as
  // the string "undefined" and renders as black — no existing check catches that.
  it.each(Object.keys(palettes))("scale %s has exactly the eleven steps", (name) => {
    const scale = palettes[name as keyof typeof palettes] as Record<number, string>;
    expect(Object.keys(scale).map(Number).sort((a, b) => a - b)).toEqual(STEPS);
  });

  it.each(Object.keys(palettes))("every value in scale %s is a six-digit lowercase hex", (name) => {
    const scale = palettes[name as keyof typeof palettes] as Record<number, string>;
    for (const step of STEPS) {
      expect(scale[step], `${name}.${step}`).toMatch(HEX);
    }
  });
});
