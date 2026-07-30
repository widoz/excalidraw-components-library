import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { registry } from "./registry.js";
import { toLibrary, toScene, type LibraryItemInput } from "./scene.js";
import { DEFAULT_PRESET, resolveTheme, type Preset, type Theme } from "./theme.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_OUT = join(ROOT, "dist");
export const PRESETS_DIR = join(ROOT, "presets");

export function loadPreset(name: string): Preset {
  const path = join(PRESETS_DIR, `${name}.json`);
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Preset;
  } catch {
    throw new Error(`No preset at presets/${name}.json. Available: ${listPresets().join(", ")}`);
  }
}

export function listPresets(): string[] {
  return readdirSync(PRESETS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}

export function outDirFor(theme: Theme): string {
  return theme.name === DEFAULT_PRESET.name ? DEFAULT_OUT : join(DEFAULT_OUT, theme.name);
}

export function buildAll(theme: Theme, outDir: string = outDirFor(theme)): void {
  const componentsDir = join(outDir, "components");
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(componentsDir, { recursive: true });

  const items: LibraryItemInput[] = [];

  for (const [name, entry] of Object.entries(registry)) {
    const elements = entry.build(theme);
    writeFileSync(
      join(componentsDir, `${name}.excalidraw`),
      `${JSON.stringify(toScene(elements, theme), null, 2)}\n`,
    );
    items.push({ name: entry.title, elements });
  }

  writeFileSync(
    join(outDir, "comic-ui.excalidrawlib"),
    `${JSON.stringify(toLibrary(items), null, 2)}\n`,
  );

  console.log(`Wrote ${items.length} components to ${outDir}`);
}

// Only run when executed directly, not when imported by validate.ts or a test.
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const all = args.includes("--all");
  const presetFlag = args.indexOf("--preset");
  const names = all
    ? listPresets()
    : [presetFlag === -1 ? DEFAULT_PRESET.name : args[presetFlag + 1]!];

  for (const name of names) {
    buildAll(resolveTheme(loadPreset(name)));
  }
}
