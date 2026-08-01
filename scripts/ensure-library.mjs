import { ensureLibrary } from "./library.mjs";

const needsToolchain = process.argv.includes("--toolchain");

try {
  console.log(await ensureLibrary({ needsToolchain }));
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
