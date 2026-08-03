import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import { PRESETS_DIR } from "./build.js";
import { DEFAULT_PRESET, resolveTheme, type Preset } from "./theme.js";
import { fontFaces, sloppinessValues, strokeLadders } from "./tokens.js";
import { palettes } from "./palettes.js";

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
    // A following flag is never a value: `--name --force` used to yield name "--force".
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Flag ${flag} needs a value.`);
    }
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

const PROMPT_FIELDS = Object.entries(CHOICES);

/**
 * When a non-TTY stdin (a pipe, a redirected file, or anything an automated test
 * drives) already has several newline-terminated answers queued, Node's `readline`
 * splits the buffered chunk into `'line'` events and emits them all synchronously as
 * part of one flush. A `question()` call resumed via `await` only re-attaches its
 * listener on the next microtask — by then the flush has already moved past later
 * lines, and they're lost (no listener was attached when they fired), so every
 * `question()` after the first hangs forever. Chaining each `question()` call
 * synchronously from directly inside the previous one's callback closes that gap:
 * the next listener is attached within the same synchronous flush, so it does not
 * miss lines still queued behind the one just consumed. Plain `node:readline`
 * (not `/promises`) is used because its callback form is what makes that synchronous
 * chaining possible; it is still Node core, so this is still a zero-dependency prompt.
 */
function prompt(): Promise<Preset> {
  return new Promise((resolve, reject) => {
    const rl = createInterface({ input: stdin, output: stdout });
    let answered = false;
    // On EOF mid-questionnaire (truncated pipe, Ctrl-D at a TTY) the pending
    // `question()` never settles, so without this the promise was simply abandoned:
    // no file, no message, exit code 0. main()'s .catch prints and exits 1.
    rl.on("close", () => {
      if (!answered) reject(new Error("Aborted before every field was answered."));
    });
    rl.question("Preset name: ", (rawName) => {
      const preset: Preset = { name: rawName.trim() };
      const askField = (i: number): void => {
        if (i >= PROMPT_FIELDS.length) {
          answered = true;
          rl.close();
          resolve(preset);
          return;
        }
        const [field, choices] = PROMPT_FIELDS[i]!;
        const fallback = DEFAULT_PRESET[field as keyof Preset];
        rl.question(`${field} [${choices.join(" | ")}] (${fallback}): `, (raw) => {
          const answer = raw.trim();
          if (answer) (preset as unknown as Record<string, string>)[field] = answer;
          askField(i + 1);
        });
      };
      askField(0);
    });
  });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const { force, ...fields } = args;
  const preset = fields.name ? (fields as Preset) : await prompt();
  console.log(`Wrote ${writePreset(preset, force)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
