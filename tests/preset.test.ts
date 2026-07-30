import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PRESETS_DIR } from "../src/build.js";
import { parseArgs, writePreset } from "../src/preset.js";

const REPO_ROOT = join(PRESETS_DIR, "..");

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

// The CLI's `main()` writes to the real PRESETS_DIR (writePreset's `dir` default), so
// these spawn the actual `npm run preset` entry point end to end and clean up the file
// they write, the same way `tests/build.test.ts`'s "preset CLI" suite drives `build.ts`.
describe("interactive prompt (piped, non-TTY stdin)", () => {
  const name = "cli-interactive-test";
  const path = join(PRESETS_DIR, `${name}.json`);

  afterEach(() => {
    rmSync(path, { force: true });
  });

  it("writes every prompted field from piped answers and exits 0", () => {
    const stdout = execFileSync("npx", ["tsx", "src/preset.ts"], {
      cwd: REPO_ROOT,
      input: `${name}\nthin\narchitect\nsharp\nnunito\nmist\n`,
      encoding: "utf8",
    });
    expect(stdout).toContain("Wrote");
    expect(existsSync(path)).toBe(true);
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({
      name,
      strokeWidth: "thin",
      sloppiness: "architect",
      edges: "sharp",
      font: "nunito",
      palette: "mist",
    });
  });

  it("prints the readable validation error (not a stack trace) and exits non-zero on a bad answer", () => {
    expect(() =>
      execFileSync("npx", ["tsx", "src/preset.ts"], {
        cwd: REPO_ROOT,
        input: `${name}\nthin\narchitect\nsharp\nnunito\nburgundy\n`,
        encoding: "utf8",
      }),
    ).toThrowError(/Preset field "palette" has illegal value "burgundy"/);
    expect(existsSync(path)).toBe(false);
  });
});
