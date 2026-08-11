import chalk from "chalk";
import { paletteGroups, palettes } from "./palettes.js";
import { DEFAULT_PRESET, type Preset } from "./theme.js";

/**
 * Every styled string the preset CLI writes. Keeping them here leaves `preset.ts` to
 * the questionnaire itself, and lets the styling be tested without a spawned process.
 *
 * chalk emits nothing when stdout is not a TTY, so a piped or redirected run produces
 * the same plain text it produced before colour existed. `NO_COLOR` and `FORCE_COLOR`
 * work for the same reason.
 */

/** The CLI's own accent (sky-400). It is fixed, so it never reads as a preset choice. */
const CUE = "#00bcff";

const cue = (text: string): string => chalk.hex(CUE)(text);

const SWATCH = "██";

/**
 * A shape cue for the two fields whose names describe a line rather than a value.
 * `sloppiness` shows how straight the stroke runs; `edges` shows the corner itself.
 */
const GLYPHS: Record<string, Record<string, string>> = {
  sloppiness: { architect: "─", artist: "~", cartoonist: "≈" },
  edges: { sharp: "┐", round: "╮" },
};

/** `strokeWidth` prints at the weight it names, so the ladder is visible in the list. */
const WEIGHTS: Record<string, (text: string) => string> = {
  bold: (text) => chalk.bold(text),
  medium: (text) => text,
  thin: (text) => chalk.dim(text),
};

function isPaletteField(field: string): boolean {
  return field === "palette" || field === "accent";
}

function scale(name: string): Record<number, string> | undefined {
  return (palettes as Record<string, Record<number, string>>)[name];
}

function choiceToken(field: string, choice: string, isDefault: boolean): string {
  const glyph = GLYPHS[field]?.[choice];
  const weight = field === "strokeWidth" ? WEIGHTS[choice] : undefined;
  let text = glyph ? `${glyph} ${choice}` : choice;
  if (weight) text = weight(text);
  return isDefault ? chalk.hex(CUE).underline(text) : text;
}

function paletteToken(name: string, isDefault: boolean): string {
  const shades = scale(name);
  if (!shades) return name;
  const paint = chalk.hex(shades[500]!);
  return `${paint(SWATCH)} ${paint(isDefault ? chalk.underline(name) : name)}`;
}

/**
 * 26 palette names on one bracketed line is unreadable, so the two palette fields print
 * their choices grouped over several lines, each name in its own scale. Every other
 * field keeps the one-line form.
 */
function paletteRows(fallback: string | undefined): string {
  const groups = Object.entries(paletteGroups) as [string, readonly string[]][];
  return groups
    .map(([group, names]) => {
      const tokens = names.map((name) => paletteToken(name, name === fallback)).join("  ");
      return `  ${chalk.dim(group.padEnd(8))}${tokens}`;
    })
    .join("\n");
}

export function header(): string {
  return [
    `${cue("◆")} ${chalk.bold("excalidraw-ui")} ${chalk.dim("· new style preset")}`,
    chalk.dim("  Enter accepts the value in (brackets)."),
    "",
  ].join("\n");
}

export function namePrompt(): string {
  return `${chalk.bold("name")} ${chalk.dim("(a-z, digits, dashes)")} ${cue("›")} `;
}

/** One question: the field, what it accepts, and what a blank answer means. */
export function fieldPrompt(
  field: string,
  choices: readonly string[],
  fallback: string | undefined,
): string {
  // `accent` has no default: blank leaves it unset, and the base palette stands in.
  const shown = field === "accent"
    ? chalk.dim("blank = same as base")
    : `(${String(fallback)})`;
  const head = chalk.bold(field);
  if (isPaletteField(field)) {
    // A blank `accent` follows whatever base palette the preset names, not the base
    // field's own default, so no swatch in that list is marked.
    const marked = field === "accent" ? undefined : fallback;
    return `${head}\n${paletteRows(marked)}\n${shown} ${cue("›")} `;
  }
  const tokens = choices
    .map((choice) => choiceToken(field, choice, choice === fallback))
    .join(chalk.dim(" | "));
  return `${head} ${chalk.dim("[")}${tokens}${chalk.dim("]")} ${shown} ${cue("›")} `;
}

/**
 * What the preset resolves to, with the palette fields shown in the colours they name.
 * A field the answer left out still appears, dim and marked: the file omits it, but the
 * build still gives it a value, and that value is what the reader wants to see.
 */
export function summary(preset: Preset): string {
  const answers = preset as unknown as Record<string, string | undefined>;
  return (Object.keys(DEFAULT_PRESET) as (keyof Preset)[])
    .map((field) => {
      const chosen = answers[field];
      // A blank accent follows the base palette, not DEFAULT_PRESET.accent.
      const inherited = field === "accent"
        ? answers["palette"] ?? DEFAULT_PRESET.palette
        : DEFAULT_PRESET[field];
      const value = chosen ?? inherited;
      const shades = isPaletteField(field) ? scale(value) : undefined;
      const swatch = shades ? `${chalk.hex(shades[500]!)(SWATCH)} ` : "";
      const shown = chosen ? value : chalk.dim(`${value}  (default)`);
      return `  ${chalk.dim(field.padEnd(12))}${swatch}${shown}`;
    })
    .join("\n");
}

export function ok(path: string, name: string): string {
  return [
    `${chalk.green("✔")} Wrote ${chalk.bold(path)}`,
    chalk.dim(`  Next: npm run build -- --preset ${name}`),
  ].join("\n");
}

export function fail(message: string): string {
  return `${chalk.red("✖")} ${message}`;
}
