import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { registry } from "./registry.js";
import { toLibrary, toScene, type LibraryItemInput } from "./scene.js";
import { DEFAULT_PRESET, resolveTheme } from "./theme.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_OUT = join(ROOT, "dist");

export function buildAll(outDir: string = DEFAULT_OUT): void {
  const componentsDir = join(outDir, "components");
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(componentsDir, { recursive: true });

  const theme = resolveTheme(DEFAULT_PRESET);
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
  buildAll();
}
