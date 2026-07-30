import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseArgs, writePreset } from "../src/preset.js";

describe("parseArgs", () => {
  it("reads every field from flags", () => {
    expect(parseArgs([
      "--name", "soft", "--stroke", "medium", "--sloppiness", "artist",
      "--edges", "sharp", "--font", "nunito", "--palette", "stone",
    ])).toEqual({
      name: "soft", strokeWidth: "medium", sloppiness: "artist",
      edges: "sharp", font: "nunito", palette: "stone", force: false,
    });
  });

  it("defaults force to false and omits unsupplied fields", () => {
    expect(parseArgs(["--name", "x"])).toEqual({ name: "x", force: false });
  });

  it("reads --force", () => {
    expect(parseArgs(["--name", "x", "--force"]).force).toBe(true);
  });

  it("throws on a flag with no value", () => {
    expect(() => parseArgs(["--name"])).toThrow(/--name/);
  });

  it("throws on an unknown flag", () => {
    expect(() => parseArgs(["--colour", "red"])).toThrow(/--colour/);
  });
});

describe("writePreset", () => {
  it("writes a preset and returns its path", () => {
    const dir = mkdtempSync(join(tmpdir(), "presets-"));
    const path = writePreset({ name: "soft", palette: "stone" }, false, dir);
    expect(existsSync(path)).toBe(true);
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({ name: "soft", palette: "stone" });
    rmSync(dir, { recursive: true, force: true });
  });

  it("refuses to overwrite without --force", () => {
    const dir = mkdtempSync(join(tmpdir(), "presets-"));
    writeFileSync(join(dir, "soft.json"), "{}");
    expect(() => writePreset({ name: "soft" }, false, dir)).toThrow(/--force/);
    rmSync(dir, { recursive: true, force: true });
  });

  it("overwrites with --force", () => {
    const dir = mkdtempSync(join(tmpdir(), "presets-"));
    writeFileSync(join(dir, "soft.json"), "{}");
    const path = writePreset({ name: "soft", palette: "mist" }, true, dir);
    expect(JSON.parse(readFileSync(path, "utf8")).palette).toBe("mist");
    rmSync(dir, { recursive: true, force: true });
  });

  it("rejects a preset that does not resolve", () => {
    const dir = mkdtempSync(join(tmpdir(), "presets-"));
    expect(() => writePreset({ name: "bad", palette: "burgundy" as never }, false, dir))
      .toThrow(/palette/);
    rmSync(dir, { recursive: true, force: true });
  });
});
