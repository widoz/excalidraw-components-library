import { describe, expect, it } from "vitest";
import { color, font, size, style } from "../src/tokens.js";
import { zinc } from "../src/palettes.js";
import { DEFAULT_PRESET, paletteValues, resolveTheme } from "../src/theme.js";

const theme = resolveTheme(DEFAULT_PRESET);
const PALETTE_VALUES = paletteValues(theme);

describe("tokens", () => {
  it("names semantic colour roles, resolved against the default theme onto the zinc scale", () => {
    expect(color.ink).toBe("ink");
    expect(theme.palette.ink).toBe(zinc[900]);
    expect(theme.palette.surface).toBe(zinc[50]);
    expect(theme.palette.muted).toBe(zinc[200]);
    expect(theme.palette.accent).toBe(zinc[700]);
    expect(theme.palette.transparent).toBe("transparent");
  });

  // Membership of theme.palette's own values is true by construction (PALETTE_VALUES is
  // built from exactly them); the cross-palette check lives in tests/theme.test.ts.
  it("rejects a colour from outside the palette", () => {
    expect(PALETTE_VALUES.has("#ff0000")).toBe(false);
  });

  it("exposes the canvas background colour", () => {
    expect(color.canvas).toBe("canvas");
    expect(theme.palette.canvas).toBe("#ffffff");
    expect(PALETTE_VALUES.has(theme.palette.canvas)).toBe(true);
  });

  it("pins the comic style constants", () => {
    expect(style.shadowOffset).toBe(6);
    expect(font.body).toBe("body");
    expect(font.heading).toBe("heading");
    expect(size.control).toBe(320);
  });
});
