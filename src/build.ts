import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { registry } from "./registry.js";
import { toLibrary, toScene, type LibraryItemInput } from "./scene.js";
import { DEFAULT_PRESET, resolveTheme, type Preset, type Theme } from "./theme.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_OUT = join(ROOT, "dist");
export const PRESETS_DIR = join(ROOT, "presets");

export function loadPreset(name: string): Preset {
  const path = join(PRESETS_DIR, `${name}.json`);

  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new Error(`No preset at presets/${name}.json. Available: ${listPresets().join(", ")}`);
  }

  try {
    return JSON.parse(raw) as Preset;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Preset at presets/${name}.json is not valid JSON: ${reason}`);
  }
}

export function listPresets(): string[] {
  return readdirSync(PRESETS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}

/**
 * Second layer under `resolveTheme`'s name check: whatever a preset name ends up being,
 * the directory `buildAll` deletes and rewrites must sit inside `dist/`. Living in
 * `outDirFor` rather than in `buildAll` is deliberate — `outDirFor` is the only place a
 * *derived* (theme-controlled) output path is produced, so guarding it covers every
 * caller of the destructive default, while `buildAll`'s explicit `outDir` argument
 * (which tests point at temp dirs, by design) stays free.
 */
function assertInsideDist(dir: string): string {
  const rel = relative(DEFAULT_OUT, dir);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`Refusing to build into "${dir}": it escapes ${DEFAULT_OUT}.`);
  }
  return dir;
}

export function outDirFor(theme: Theme): string {
  return assertInsideDist(
    theme.name === DEFAULT_PRESET.name ? DEFAULT_OUT : join(DEFAULT_OUT, theme.name),
  );
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

  let names: string[];
  if (all) {
    names = listPresets();
  } else if (presetFlag === -1) {
    names = [DEFAULT_PRESET.name];
  } else {
    const presetName = args[presetFlag + 1];
    if (presetName === undefined) {
      throw new Error("--preset requires a preset name.");
    }
    names = [presetName];
  }

  for (const name of names) {
    buildAll(resolveTheme(loadPreset(name)));
  }
}
