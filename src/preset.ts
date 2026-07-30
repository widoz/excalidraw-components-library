import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { PRESETS_DIR } from "./build.js";
import { DEFAULT_PRESET, resolveTheme, type Preset } from "./theme.js";
import { fontFaces, palettes, sloppinessValues, strokeLadders } from "./tokens.js";

const FLAGS: Record<string, keyof Preset> = {
  "--name": "name",
  "--stroke": "strokeWidth",
  "--sloppiness": "sloppiness",
  "--edges": "edges",
  "--font": "font",
  "--palette": "palette",
};

export function parseArgs(argv: string[]): Partial<Preset> & { force: boolean } {
  const out: Partial<Preset> & { force: boolean } = { force: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]!;
    if (flag === "--force") { out.force = true; continue; }
    const field = FLAGS[flag];
    if (!field) throw new Error(`Unknown flag ${flag}. Known: ${Object.keys(FLAGS).join(", ")}, --force`);
    const value = argv[++i];
    if (value === undefined) throw new Error(`Flag ${flag} needs a value.`);
    (out as unknown as Record<string, string>)[field] = value;
  }
  return out;
}

/** Writes presets/<name>.json. Throws rather than clobbering unless `force`. */
export function writePreset(preset: Preset, force: boolean, dir: string = PRESETS_DIR): string {
  resolveTheme(preset); // fail loudly on an illegal field before writing anything
  const path = join(dir, `${preset.name}.json`);
  if (existsSync(path) && !force) {
    throw new Error(`presets/${preset.name}.json already exists. Pass --force to overwrite.`);
  }
  writeFileSync(path, `${JSON.stringify(preset, null, 2)}\n`);
  return path;
}

const CHOICES: Record<string, readonly string[]> = {
  strokeWidth: Object.keys(strokeLadders),
  sloppiness: Object.keys(sloppinessValues),
  edges: ["sharp", "round"],
  font: Object.keys(fontFaces),
  palette: Object.keys(palettes),
};

async function prompt(): Promise<Preset> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const name = (await rl.question("Preset name: ")).trim();
    const preset: Preset = { name };
    for (const [field, choices] of Object.entries(CHOICES)) {
      const fallback = DEFAULT_PRESET[field as keyof Preset];
      const answer = (await rl.question(
        `${field} [${choices.join(" | ")}] (${fallback}): `,
      )).trim();
      if (answer) (preset as unknown as Record<string, string>)[field] = answer;
    }
    return preset;
  } finally {
    rl.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));
  const { force, ...fields } = args;
  const preset = fields.name ? (fields as Preset) : await prompt();
  console.log(`Wrote ${writePreset(preset, force)}`);
}
