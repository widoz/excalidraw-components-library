import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET, paletteValues, resolveTheme } from "../src/theme.js";

describe("resolveTheme", () => {
  it("resolves the default preset to today's look", () => {
    const t = resolveTheme({ name: "default" });
    expect(t.palette.ink).toBe("#18181b");
    expect(t.palette.accent).toBe("#3f3f46");
    expect(t.palette.transparent).toBe("transparent");
    expect(t.palette.canvas).toBe("#ffffff");
    expect(t.fonts).toEqual({ body: 7, heading: 7 });
    expect(t.strokes).toEqual({ outline: 4, hairline: 2, shadow: 1 });
    expect(t.roughness).toBe(2);
    expect(t.edges).toBe("round");
    expect(t.advance).toBe(0.55);
  });

  it("fills omitted fields from the default", () => {
    const t = resolveTheme({ name: "partial", palette: "mist" });
    expect(t.palette.ink).toBe("#161b1d");
    expect(t.strokes.outline).toBe(4);
    expect(t.roughness).toBe(2);
  });

  it("maps every palette's roles onto the right shades", () => {
    const t = resolveTheme({ name: "m", palette: "mauve" });
    expect(t.palette.ink).toBe("#1d161e");
    expect(t.palette.surface).toBe("#fafafa");
    expect(t.palette.muted).toBe("#e7e4e7");
    expect(t.palette.border).toBe("#d7d0d7");
    expect(t.palette.subtle).toBe("#a89ea9");
    expect(t.palette.mutedText).toBe("#79697b");
    expect(t.palette.accent).toBe("#463947");
    expect(t.palette.accentText).toBe("#fafafa");
  });

  it("resolves each stroke ladder", () => {
    expect(resolveTheme({ name: "a", strokeWidth: "medium" }).strokes)
      .toEqual({ outline: 2, hairline: 1, shadow: 1 });
    expect(resolveTheme({ name: "b", strokeWidth: "thin" }).strokes)
      .toEqual({ outline: 1, hairline: 1, shadow: 1 });
  });

  it("resolves each sloppiness", () => {
    expect(resolveTheme({ name: "a", sloppiness: "architect" }).roughness).toBe(0);
    expect(resolveTheme({ name: "b", sloppiness: "artist" }).roughness).toBe(1);
    expect(resolveTheme({ name: "c", sloppiness: "cartoonist" }).roughness).toBe(2);
  });

  it("pins headings to Comic Shanns whatever the body face", () => {
    for (const font of ["comic-shanns", "excalifont", "nunito"] as const) {
      expect(resolveTheme({ name: "x", font }).fonts.heading).toBe(7);
    }
    expect(resolveTheme({ name: "n", font: "nunito" }).fonts.body).toBe(6);
    expect(resolveTheme({ name: "e", font: "excalifont" }).fonts.body).toBe(1);
  });

  it("carries the advance factor for the body face", () => {
    expect(resolveTheme({ name: "n", font: "nunito" }).advance).toBe(0.5);
    expect(resolveTheme({ name: "c", font: "comic-shanns" }).advance).toBe(0.55);
  });

  it("throws on an illegal value, naming the field and the legal set", () => {
    expect(() => resolveTheme({ name: "x", palette: "burgundy" as never }))
      .toThrow(/palette.*burgundy.*neutral/s);
    expect(() => resolveTheme({ name: "x", strokeWidth: "chunky" as never }))
      .toThrow(/strokeWidth.*chunky.*bold/s);
    expect(() => resolveTheme({ name: "x", edges: "bevelled" as never }))
      .toThrow(/edges.*bevelled.*sharp/s);
  });

  it("requires a name", () => {
    expect(() => resolveTheme({ name: "" })).toThrow(/name/);
  });
});

describe("paletteValues", () => {
  it("admits only the active palette, plus transparent and canvas", () => {
    const zincValues = paletteValues(resolveTheme({ name: "z", palette: "zinc" }));
    expect(zincValues.has("#18181b")).toBe(true);   // zinc-900
    expect(zincValues.has("transparent")).toBe(true);
    expect(zincValues.has("#ffffff")).toBe(true);
    expect(zincValues.has("#1d161e")).toBe(false);  // mauve-900 must NOT pass
  });

  it("is per-palette, so a wrong-palette hex is rejected", () => {
    const mist = paletteValues(resolveTheme({ name: "m", palette: "mist" }));
    expect(mist.has("#161b1d")).toBe(true);         // mist-900
    expect(mist.has("#18181b")).toBe(false);        // zinc-900
  });
});

describe("DEFAULT_PRESET", () => {
  it("describes today's look with every field set", () => {
    expect(DEFAULT_PRESET).toEqual({
      name: "default",
      strokeWidth: "bold",
      sloppiness: "cartoonist",
      edges: "round",
      font: "comic-shanns",
      palette: "zinc",
    });
  });
});
