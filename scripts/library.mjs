import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
export const PLUGIN_ROOT = join(HERE, "..");
export const CONFIG_PATH = join(homedir(), ".claude", "excalidraw-lib.json");

const MARKER = join("dist", "comic-ui.excalidrawlib");

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
 * 1. the config file, 2. the plugin's own root (dist/ is committed, so composing
 * needs no setup), 3. fail with the exact fix.
 */
export function resolveRoot({ configPath = CONFIG_PATH, pluginRoot = PLUGIN_ROOT } = {}) {
  if (existsSync(configPath)) {
    const configured = JSON.parse(readFileSync(configPath, "utf8")).path;
    if (isLibrary(configured)) return configured;
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
 * package name matches the plugin's own — derived, never hardcoded — and which
 * carries the library's source and output.
 */
export async function ensureLibrary({ needsToolchain = false, configPath, pluginRoot = PLUGIN_ROOT } = {}) {
  const root = resolveRoot({ configPath, pluginRoot });
  if (!needsToolchain) return root;

  const expected = JSON.parse(readFileSync(join(pluginRoot, "package.json"), "utf8")).name;
  const pkgPath = join(root, "package.json");
  const found = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, "utf8")).name : undefined;
  if (found !== expected || !existsSync(join(root, "src", "build.ts"))) {
    throw new Error(`${root} is not an ${expected} clone, so it cannot build presets.`);
  }
  if (root === pluginRoot && !existsSync(join(root, ".git"))) {
    throw new Error(
      `${root} is the installed plugin copy. Preset output belongs in a clone you can commit; ` +
      `point ${CONFIG_PATH} at one.`,
    );
  }
  if (!existsSync(join(root, "node_modules"))) {
    await run("npm", ["install"], { cwd: root });
  }
  return root;
}

export function componentsDir(root, preset) {
  return preset === undefined || preset === "default"
    ? join(root, "dist", "components")
    : join(root, "dist", preset, "components");
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

export function loadVariant(root, preset, component, variant = "default") {
  const dir = componentsDir(root, preset);
  if (!existsSync(dir)) {
    throw new Error(`No build at ${dir}. Run: npm run build -- --preset ${preset}`);
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
    throw new Error(`No build at ${dir}. Run: npm run build -- --preset ${preset}`);
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
        .map((variant) => ({ name: variant, ...measure(loadVariant(root, preset, name, variant).elements) })),
    }));
}
