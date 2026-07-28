import { describe, expect, it } from "vitest";
import { PALETTE_VALUES, color, font, size, style, zinc } from "../src/tokens.js";

describe("tokens", () => {
  it("exposes the shadcn zinc scale", () => {
    expect(zinc[50]).toBe("#fafafa");
    expect(zinc[200]).toBe("#e4e4e7");
    expect(zinc[700]).toBe("#3f3f46");
    expect(zinc[900]).toBe("#18181b");
    expect(Object.keys(zinc)).toHaveLength(11);
  });

  it("maps semantic colours onto the zinc scale", () => {
    expect(color.ink).toBe(zinc[900]);
    expect(color.surface).toBe(zinc[50]);
    expect(color.muted).toBe(zinc[200]);
    expect(color.accent).toBe(zinc[700]);
    expect(color.transparent).toBe("transparent");
  });

  it("lists every legal output colour in PALETTE_VALUES", () => {
    for (const value of Object.values(color)) {
      expect(PALETTE_VALUES.has(value)).toBe(true);
    }
    expect(PALETTE_VALUES.has("#ff0000")).toBe(false);
  });

  it("exposes the canvas background colour", () => {
    expect(color.canvas).toBe("#ffffff");
    expect(PALETTE_VALUES.has(color.canvas)).toBe(true);
  });

  it("pins the comic style constants", () => {
    expect(style.roughness).toBe(2);
    expect(style.strokeWidth).toBe(4);
    expect(style.shadowOffset).toBe(6);
    expect(font.hand).toBe(1);
    expect(font.comic).toBe(7);
    expect(size.control).toBe(320);
  });
});
