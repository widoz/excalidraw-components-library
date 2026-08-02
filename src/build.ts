import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, type Dirent } from "node:fs";
import { dirname, isAbsolute, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { registry } from "./registry.js";
import { toLibrary, toScene, type LibraryItemInput } from "./scene.js";
import { resolveTheme, type Preset, type Theme } from "./theme.js";
import { normalize } from "./variants.js";

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
  return assertInsideDist(join(DEFAULT_OUT, theme.name));
}

/**
 * Removes output directories with no backing preset file. Every preset's dist/ is
 * committed, so deleting presets/<name>.json without this would leave dist/<name>/
 * tracked in git forever, describing a style that no longer exists.
 *
 * Only immediate directories are considered, and only a full build calls this — a
 * `--preset X` build must never reach a sibling. Loose files are left alone.
 */
export function pruneOrphans(distDir: string = DEFAULT_OUT): string[] {
  const keep = new Set(listPresets());

  let entries: Dirent[];
  try {
    entries = readdirSync(distDir, { withFileTypes: true });
  } catch {
    return []; // nothing built yet
  }

  const removed: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || keep.has(entry.name)) continue;
    rmSync(join(distDir, entry.name), { recursive: true, force: true });
    removed.push(entry.name);
  }
  return removed.sort();
}

export function buildAll(theme: Theme, outDir: string = outDirFor(theme)): void {
  const componentsDir = join(outDir, "components");
  // Every output directory is now a dist/<name>/ holding nothing but this preset's
  // output, so removing it wholesale leaves no stale file behind and cannot reach a
  // sibling preset. (It could when the default preset's output dir *was* dist/.)
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(componentsDir, { recursive: true });

  const items: LibraryItemInput[] = [];

  for (const [name, entry] of Object.entries(registry)) {
    const output = entry.build(theme);

    writeFileSync(
      join(componentsDir, `${name}.excalidraw`),
      `${JSON.stringify(toScene(output.elements, theme), null, 2)}\n`,
    );

    // Variants are written under the component's own directory. The whole of
    // componentsDir is removed above, so a renamed variant leaves nothing stale.
    const variantDir = join(componentsDir, name);
    mkdirSync(variantDir, { recursive: true });
    for (const variant of output.variants) {
      writeFileSync(
        join(variantDir, `${variant.name}.excalidraw`),
        `${JSON.stringify(toScene(normalize(variant.elements), theme), null, 2)}\n`,
      );
    }

    items.push({ name: entry.title, elements: output.elements });
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
 *
 * A bare invocation means every preset. No preset is privileged, and since every
 * preset's output is committed, a bare build that meant "default only" left the
 * others stale in git. `--all` stays accepted as an alias for that same full build.
 */
export function selectPresets(args: string[]): string[] {
  const presetFlag = args.indexOf("--preset");
  if (presetFlag === -1) return listPresets();

  const presetName = args[presetFlag + 1];
  if (presetName === undefined || presetName.startsWith("--")) {
    throw new Error("--preset requires a preset name.");
  }
  return [presetName];
}

// Only run when executed directly, not when imported by validate.ts or a test.
if (import.meta.url === `file://${process.argv[1]}`) {
  const selected = selectPresets(process.argv.slice(2));
  for (const name of selected) {
    buildAll(resolveTheme(loadPreset(name)));
  }

  // Only a full build prunes: a narrowed one was not asked about its siblings.
  if (!process.argv.includes("--preset")) {
    const removed = pruneOrphans();
    if (removed.length > 0) console.log(`Pruned orphaned output: ${removed.join(", ")}`);
  }
}
