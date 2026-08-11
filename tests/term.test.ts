import chalk from "chalk";
import { beforeEach, describe, expect, it } from "vitest";
import { palettes } from "../src/palettes.js";
import { fail, fieldPrompt, header, namePrompt, ok, summary } from "../src/term.js";

// chalk turns itself off when stdout is not a TTY, which is how the CLI's output
// reaches a pipe (and how tests/preset.test.ts reads it). Level 0 is therefore the
// mode every plain-text assertion below runs in; `coloured` raises it for the few
// tests that are about the styling itself.
beforeEach(() => {
  chalk.level = 0;
});

function coloured<T>(run: () => T): T {
  chalk.level = 3;
  try {
    return run();
  } finally {
    chalk.level = 0;
  }
}

describe("fieldPrompt", () => {
  it("names the field, every choice and the default", () => {
    const line = fieldPrompt("font", ["excalifont", "comic-shanns", "nunito"], "excalifont");
    expect(line).toContain("font");
    expect(line).toContain("excalifont");
    expect(line).toContain("comic-shanns");
    expect(line).toContain("nunito");
    expect(line).toContain("(excalifont)");
  });

  it("writes no escape codes when colour is off, so a piped answer file stays readable", () => {
    const line = fieldPrompt("edges", ["sharp", "round"], "round");
    expect(line).not.toContain("[");
  });

  it("marks the default choice with the cue colour", () => {
    const line = coloured(() => fieldPrompt("edges", ["sharp", "round"], "round"));
    const cued = coloured(() => chalk.hex("#00bcff").underline("╮ round"));
    expect(line).toContain(cued);
  });

  it("gives sloppiness and edges a shape cue, so the choice is legible before it is typed", () => {
    expect(fieldPrompt("sloppiness", ["architect", "artist", "cartoonist"], "cartoonist"))
      .toContain("≈ cartoonist");
    expect(fieldPrompt("edges", ["sharp", "round"], "round")).toContain("┐ sharp");
  });

  it("renders the stroke widths at their own weight", () => {
    const line = coloured(() => fieldPrompt("strokeWidth", ["bold", "medium", "thin"], "bold"));
    expect(line).toContain(coloured(() => chalk.dim("thin")));
    expect(line).toContain(coloured(() => chalk.bold("bold")));
  });

  it("lists the palettes by group rather than on one bracketed line", () => {
    const line = fieldPrompt("palette", Object.keys(palettes), "zinc");
    expect(line).not.toContain("|");
    for (const group of ["neutral", "warm", "green", "cool", "purple", "shadcn"]) {
      expect(line).toContain(group);
    }
    for (const name of Object.keys(palettes)) {
      expect(line).toContain(name);
    }
  });

  it("paints every palette name in its own scale", () => {
    const line = coloured(() => fieldPrompt("palette", Object.keys(palettes), "zinc"));
    for (const [name, scale] of Object.entries(palettes)) {
      expect(line, name).toContain(coloured(() => chalk.hex(scale[500])("██")));
    }
  });

  it("tells the accent field that a blank answer falls back to the base palette", () => {
    expect(fieldPrompt("accent", Object.keys(palettes), undefined))
      .toContain("blank = same as base");
  });

  it("marks no accent swatch as the default, because a blank one follows the base palette", () => {
    const line = coloured(() => fieldPrompt("accent", Object.keys(palettes), "zinc"));
    expect(line).not.toContain(coloured(() => chalk.underline("zinc")));
  });
});

describe("chrome", () => {
  it("heads the questionnaire with the tool name and how to accept a default", () => {
    expect(header()).toContain("excalidraw-ui");
    expect(header()).toContain("Enter");
  });

  it("asks for a name", () => {
    expect(namePrompt()).toContain("name");
  });
});

describe("summary", () => {
  it("lists every field the preset carries", () => {
    const text = summary({ name: "soft", palette: "stone", accent: "blue", edges: "sharp" });
    for (const token of ["name", "soft", "palette", "stone", "accent", "blue", "edges", "sharp"]) {
      expect(text).toContain(token);
    }
  });

  it("swatches the two palette fields and leaves the rest plain", () => {
    const text = coloured(() => summary({ name: "soft", palette: "stone", accent: "blue" }));
    expect(text).toContain(coloured(() => chalk.hex(palettes.stone[500])("██")));
    expect(text).toContain(coloured(() => chalk.hex(palettes.blue[500])("██")));
  });
});

describe("outcome lines", () => {
  // tests/preset.test.ts asserts on this exact word through a pipe.
  it("reports the written path with the word the CLI test reads", () => {
    const line = ok("presets/soft.json", "soft");
    expect(line).toContain("Wrote presets/soft.json");
    expect(line).toContain("npm run build -- --preset soft");
  });

  it("keeps the error message intact so the caller still matches on it", () => {
    expect(fail("Aborted before every field was answered."))
      .toContain("Aborted before every field was answered.");
  });

  it("marks success green and failure red", () => {
    expect(coloured(() => ok("presets/soft.json", "soft"))).toContain(coloured(() => chalk.green("✔")));
    expect(coloured(() => fail("nope"))).toContain(coloured(() => chalk.red("✖")));
  });
});
