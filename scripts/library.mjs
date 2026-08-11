import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { textSlots } from "./text.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const PLUGIN_ROOT = join(HERE, "..");
export const CONFIG_PATH = join(homedir(), ".claude", "excalidraw-lib.json");

const MARKER = join("dist", "default", "ui.excalidrawlib");

function isLibrary(dir) {
  return typeof dir === "string" && existsSync(join(dir, MARKER));
}

function candidates() {
  return [process.cwd(), homedir(), join(homedir(), "Dev")]
    .flatMap((base) => {
      if (isLibrary(base)) return [base];
      try {
        return readdirSync(base, { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => join(base, e.name))
          .filter(isLibrary);
      } catch {
        return [];
      }
    });
}

/**
 * 1. the config file, 2. the plugin's own root (dist/ is committed for every preset,
 * so composing needs no setup), 3. fail with the exact fix.
 *
 * A config file that exists but is unusable (bad JSON, or a path that is not a
 * library) is an error, not a silent fallback: the user asked for a specific
 * library and using a different one without saying so is worse than stopping.
 */
export function resolveRoot({ configPath = CONFIG_PATH, pluginRoot = PLUGIN_ROOT } = {}) {
  if (existsSync(configPath)) {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(configPath, "utf8"));
    } catch (err) {
      throw new Error(
        `Could not parse ${configPath} as JSON (${err.message}). Fix its contents, or delete the file ` +
        `to use the plugin's own build.`,
      );
    }
    const configured = parsed.path;
    if (!isLibrary(configured)) {
      throw new Error(
        `${configPath} points at "${configured}", which is not a component library (no ${MARKER} there). ` +
        `Fix "path" in ${configPath} to point at a real clone, or delete the file to use the plugin's own build.`,
      );
    }
    return configured;
  }
  if (isLibrary(pluginRoot)) return pluginRoot;

  const found = candidates();
  const hint = found.length > 0 ? ` Found a candidate at ${found[0]}.` : "";
  throw new Error(
    `No component library found. Write {"path": "/path/to/excalidraw-components-library"} ` +
    `to ${CONFIG_PATH}, or run npm run build in a clone.${hint}`,
  );
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`))));
  });
}

/**
 * Preflight for both skills. Installing is only ever done in a directory whose
 * package name matches the plugin's own — derived, never hardcoded — which carries
 * the library's source and output, and which is a git clone (never an extracted
 * copy or the installed plugin directory itself).
 *
 * @param {{ needsToolchain?: boolean, configPath?: string, pluginRoot?: string }} [options]
 * @returns {Promise<string>}
 */
export async function ensureLibrary({ needsToolchain = false, configPath = undefined, pluginRoot = PLUGIN_ROOT } = {}) {
  const root = resolveRoot({ configPath, pluginRoot });
  if (!needsToolchain) return root;

  const expected = JSON.parse(readFileSync(join(pluginRoot, "package.json"), "utf8")).name;
  const pkgPath = join(root, "package.json");
  let found;
  if (existsSync(pkgPath)) {
    try {
      found = JSON.parse(readFileSync(pkgPath, "utf8")).name;
    } catch (err) {
      throw new Error(`Could not parse ${pkgPath} as JSON (${err.message}). Fix its contents to verify the clone.`);
    }
  }
  if (found !== expected || !existsSync(join(root, "src", "build.ts"))) {
    throw new Error(`${root} is not an ${expected} clone, so it cannot build presets.`);
  }
  if (!existsSync(join(root, ".git"))) {
    throw new Error(
      root === pluginRoot
        ? `${root} is the installed plugin copy. Preset output belongs in a clone you can commit; ` +
          `point ${CONFIG_PATH} at one.`
        : `${root} has no .git directory, so it cannot be verified as a clone. Point ${CONFIG_PATH} at ` +
          `a git clone of ${expected} you can commit.`,
    );
  }
  if (!existsSync(join(root, "node_modules"))) {
    await run("npm", ["install"], { cwd: root });
  }
  return root;
}

export function componentsDir(root, preset) {
  return join(root, "dist", preset ?? "default", "components");
}

export function measure(elements) {
  const xs = elements.map((e) => e.x);
  const ys = elements.map((e) => e.y);
  const right = elements.map((e) => e.x + (e.width ?? 0));
  const bottom = elements.map((e) => e.y + (e.height ?? 0));
  return { width: Math.max(...right) - Math.min(...xs), height: Math.max(...bottom) - Math.min(...ys) };
}

function near(name, available) {
  const close = available.filter((a) => a.startsWith(name.slice(0, 3)) || name.startsWith(a.slice(0, 3)));
  return (close.length > 0 ? close : available).slice(0, 5).join(", ");
}

function buildCommand(preset) {
  return `npm run build -- --preset ${preset ?? "default"}`;
}

export function loadVariant(root, preset, component, variant = "default") {
  const dir = componentsDir(root, preset);
  if (!existsSync(dir)) {
    throw new Error(`No build at ${dir}. Run: ${buildCommand(preset)}`);
  }

  const componentDir = join(dir, component);
  if (!existsSync(componentDir)) {
    const available = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
    throw new Error(`Unknown component "${component}". Closest: ${near(component, available)}`);
  }

  const file = join(componentDir, `${variant}.excalidraw`);
  if (!existsSync(file)) {
    const available = readdirSync(componentDir).map((f) => f.replace(/\.excalidraw$/, ""));
    throw new Error(`Unknown variant "${variant}" for "${component}". Available: ${available.join(", ")}`);
  }

  const scene = JSON.parse(readFileSync(file, "utf8"));
  return { elements: scene.elements, appState: scene.appState };
}

export function listComponents(root, preset) {
  const dir = componentsDir(root, preset);
  if (!existsSync(dir)) {
    throw new Error(`No build at ${dir}. Run: ${buildCommand(preset)}`);
  }
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .map((name) => ({
      name,
      variants: readdirSync(join(dir, name))
        .filter((f) => f.endsWith(".excalidraw"))
        .map((f) => f.replace(/\.excalidraw$/, ""))
        .sort()
        .map((variant) => {
          const { elements } = loadVariant(root, preset, name, variant);
          return { name: variant, ...measure(elements), texts: textSlots(elements).map((e) => e.text) };
        }),
    }));
}
