import { describe, expect, it } from "vitest";
import { color, font, size, style, zinc } from "../src/tokens.js";
import { DEFAULT_PRESET, PALETTE_VALUES, resolveTheme } from "../src/theme.js";

const theme = resolveTheme(DEFAULT_PRESET);

describe("tokens", () => {
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

  it("names semantic colour roles, resolved against the default theme onto the zinc scale", () => {
    expect(color.ink).toBe("ink");
    expect(theme.palette.ink).toBe(zinc[900]);
    expect(theme.palette.surface).toBe(zinc[50]);
    expect(theme.palette.muted).toBe(zinc[200]);
    expect(theme.palette.accent).toBe(zinc[700]);
    expect(theme.palette.transparent).toBe("transparent");
  });

  it("lists every legal output colour in PALETTE_VALUES", () => {
    for (const value of Object.values(theme.palette)) {
      expect(PALETTE_VALUES.has(value)).toBe(true);
    }
    expect(PALETTE_VALUES.has("#ff0000")).toBe(false);
  });

  it("exposes the canvas background colour", () => {
    expect(color.canvas).toBe("canvas");
    expect(theme.palette.canvas).toBe("#ffffff");
    expect(PALETTE_VALUES.has(theme.palette.canvas)).toBe(true);
  });

  it("pins the comic style constants", () => {
    expect(style.roughness).toBe(2);
    expect(style.strokeWidth).toBe(4);
    expect(style.shadowOffset).toBe(6);
    expect(font.body).toBe("body");
    expect(font.heading).toBe("heading");
    expect(size.control).toBe(320);
  });
});
