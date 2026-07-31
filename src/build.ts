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

  let preset: Preset;
  try {
    preset = JSON.parse(raw) as Preset;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Preset at presets/${name}.json is not valid JSON: ${reason}`);
  }

  // The filename is what `--preset` selects; the `name` field is what picks the output
  // directory. If they disagree, `presets/foo.json` builds into `dist/bar` and neither
  // the CLI argument nor the listing tells you so.
  if (preset.name !== name) {
    throw new Error(
      `Preset at presets/${name}.json declares name "${String(preset.name)}". ` +
      `A preset's filename and its "name" field must match.`,
    );
  }

  return preset;
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
  // Narrowed to exactly what this function writes — components/ and the library file —
  // rather than the whole output directory. The default preset's output dir *is* dist/,
  // so a wide rmSync there deleted every other preset's dist/<name>/ subdirectory:
  // `--all` destroyed each preset that sorts before "default", and a plain default build
  // silently removed any preset output built earlier. Nothing else is ever written here,
  // so removing the components directory wholesale still leaves no stale files behind.
  rmSync(componentsDir, { recursive: true, force: true });
  rmSync(join(outDir, "comic-ui.excalidrawlib"), { force: true });
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

/**
 * Which presets a `--preset <name>` / `--all` / bare invocation selects. Shared so
 * `validate.ts` answers the same question the same way: before this existed, only
 * `build.ts` understood the flags and `npm run validate` always checked the default.
 */
export function selectPresets(args: string[]): string[] {
  if (args.includes("--all")) return listPresets();

  const presetFlag = args.indexOf("--preset");
  if (presetFlag === -1) return [DEFAULT_PRESET.name];

  const presetName = args[presetFlag + 1];
  if (presetName === undefined || presetName.startsWith("--")) {
    throw new Error("--preset requires a preset name.");
  }
  return [presetName];
}

// Only run when executed directly, not when imported by validate.ts or a test.
if (import.meta.url === `file://${process.argv[1]}`) {
  for (const name of selectPresets(process.argv.slice(2))) {
    buildAll(resolveTheme(loadPreset(name)));
  }
}
