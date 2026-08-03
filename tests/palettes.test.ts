import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { palettes, paletteGroups, zinc } from "../src/palettes.js";

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

describe("the fetched Tailwind scales", () => {
  it("pins a sample of the fetched Tailwind scales", () => {
    // Spot checks against the fetched source. These exist so a hand-edit to the table
    // is caught; they are not a substitute for the fetch being right in the first place.
    expect(palettes.blue[700]).toBe("#1447e6");
    expect(palettes.red[500]).toBe("#fb2c36");
    expect(palettes.slate[900]).toBe("#0f172b");
  });

  // 209 of the 242 values in `palettes` are guarded by nothing else but the
  // `/^#[0-9a-f]{6}$/` format regex above: a one-character edit (`#fb2c36` ->
  // `#fb2c37`) passes every other check in this file and silently renders differently.
  // Regenerate this digest only when you meant to change a colour.
  it("pins the whole colour table", () => {
    const digest = createHash("sha256").update(JSON.stringify(palettes)).digest("hex");
    expect(digest).toBe("31064e9e792ee5ca43e5537f8605ad7acf48a5a1f0a8e9c22218fbb784e7d51e");
  });
});

describe("paletteGroups", () => {
  // The groups are what the prompt prints. If a new scale is added to `palettes` and
  // not to a group, it silently becomes unofferable: legal to type, never listed.
  it("names every palette exactly once", () => {
    const grouped = Object.values(paletteGroups).flat();
    expect([...grouped].sort()).toEqual(Object.keys(palettes).sort());
    expect(new Set(grouped).size).toBe(grouped.length);
  });
});

describe("the palette set", () => {
  it("carries all 22 Tailwind scales plus the 4 shadcn-only ones", () => {
    expect(Object.keys(palettes)).toHaveLength(26);
    for (const name of ["slate", "gray", "blue", "red", "green", "rose"]) {
      expect(Object.keys(palettes), name).toContain(name);
    }
    for (const name of ["mauve", "olive", "mist", "taupe"]) {
      expect(Object.keys(palettes), name).toContain(name);
    }
  });
});
