import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadPreset, outDirFor, selectPresets } from "./build.js";
import { paletteValues, resolveTheme, type Theme } from "./theme.js";
import { SOURCE } from "./scene.js";

const REQUIRED_FIELDS = [
  "id", "type", "x", "y", "width", "height", "angle", "strokeColor",
  "backgroundColor", "fillStyle", "strokeWidth", "strokeStyle", "roughness",
  "opacity", "groupIds", "frameId", "index", "roundness", "seed", "version",
  "versionNonce", "isDeleted", "boundElements", "updated", "link", "locked",
];

const TEXT_FIELDS = [
  "text", "fontSize", "fontFamily", "textAlign", "verticalAlign",
  "containerId", "originalText", "autoResize", "lineHeight",
];

const LINE_FIELDS = [
  "points", "lastCommittedPoint", "startBinding", "endBinding",
  "startArrowhead", "endArrowhead",
];

type El = Record<string, unknown>;

function checkTypeFields(where: string, el: El, id: string, errors: string[]): void {
  if (el.type === "text") {
    for (const field of TEXT_FIELDS) {
      if (!(field in el)) errors.push(`${where}/${id}: missing text field "${field}"`);
    }
  }

  if (el.type === "line") {
    for (const field of LINE_FIELDS) {
      if (!(field in el)) errors.push(`${where}/${id}: missing line field "${field}"`);
    }

    const points = el.points;
    if (!Array.isArray(points) || points.length === 0) {
      errors.push(`${where}/${id}: "points" must be a non-empty array`);
    } else {
      for (const p of points) {
        if (!Array.isArray(p) || p.length !== 2 || typeof p[0] !== "number" || typeof p[1] !== "number") {
          errors.push(`${where}/${id}: "points" must contain [number, number] pairs`);
          break;
        }
      }
      const first = points[0];
      if (Array.isArray(first) && (first[0] !== 0 || first[1] !== 0)) {
        errors.push(`${where}/${id}: first point must be [0, 0]`);
      }

      // A line whose points all coincide is invisible: it passes every check above
      // (non-empty, pairs of numbers, first point [0, 0]) and still draws nothing.
      const pairs = points.filter((p): p is number[] => Array.isArray(p) && typeof p[0] === "number" && typeof p[1] === "number");
      if (pairs.length === points.length) {
        const xs = pairs.map((p) => p[0]!);
        const ys = pairs.map((p) => p[1]!);
        const spanX = Math.max(...xs) - Math.min(...xs);
        const spanY = Math.max(...ys) - Math.min(...ys);
        if (spanX === 0 && spanY === 0) {
          errors.push(`${where}/${id}: "points" span zero extent, so the line is invisible`);
        }
      }
    }
  }
}

interface ThemeChecks {
  allowed: ReadonlySet<string>;
  rungs: ReadonlySet<number>;
  fontIds: ReadonlySet<number>;
  roughness: number;
}

function checkElements(where: string, elements: El[], errors: string[], checks: ThemeChecks): void {
  if (!Array.isArray(elements)) {
    errors.push(`${where}: "elements" must be an array`);
    return;
  }

  const ids = new Set<string>();
  const groupIds = new Set<string>();
  let previousIndex = "";

  for (const el of elements) {
    const id = String(el.id ?? "");
    if (!id) errors.push(`${where}: element with empty id`);
    if (ids.has(id)) errors.push(`${where}: duplicate element id "${id}"`);
    ids.add(id);

    for (const field of REQUIRED_FIELDS) {
      if (!(field in el)) errors.push(`${where}/${id}: missing field "${field}"`);
    }

    checkTypeFields(where, el, id, errors);

    for (const field of ["x", "y", "width", "height"]) {
      const value = el[field];
      if (typeof value !== "number" || !Number.isFinite(value)) {
        errors.push(`${where}/${id}: "${field}" is not a finite number`);
      } else if ((field === "width" || field === "height") && value < 0) {
        // Excalidraw stores extents unsigned; a negative one flips the shape.
        errors.push(`${where}/${id}: "${field}" must not be negative`);
      }
    }

    for (const field of ["strokeColor", "backgroundColor"]) {
      const value = String(el[field]);
      if (!checks.allowed.has(value)) {
        errors.push(`${where}/${id}: "${field}" value "${value}" is not in the palette`);
      }
    }

    const width = Number(el.strokeWidth);
    if (!checks.rungs.has(width)) {
      errors.push(`${where}/${id}: strokeWidth "${el.strokeWidth}" is not a rung of the active ladder (${[...checks.rungs].join(", ")})`);
    }

    if (el.type === "text") {
      const family = Number(el.fontFamily);
      if (!checks.fontIds.has(family)) {
        errors.push(`${where}/${id}: fontFamily "${el.fontFamily}" is not one of the theme's (${[...checks.fontIds].join(", ")})`);
      }
    }

    if (Number(el.roughness) !== checks.roughness) {
      errors.push(`${where}/${id}: roughness "${el.roughness}" is not the theme's "${checks.roughness}"`);
    }

    const index = String(el.index ?? "");
    if (index <= previousIndex) {
      errors.push(`${where}/${id}: index "${index}" does not follow "${previousIndex}"`);
    }
    previousIndex = index;

    const groups = el.groupIds;
    if (!Array.isArray(groups) || groups.length !== 1) {
      errors.push(`${where}/${id}: expected exactly one groupId`);
    } else {
      groupIds.add(String(groups[0]));
    }

    if (el.containerId !== undefined && el.containerId !== null) {
      errors.push(`${where}/${id}: containerId must be null`);
    }
    if (el.boundElements !== null) {
      errors.push(`${where}/${id}: boundElements must be null`);
    }
    for (const field of ["startBinding", "endBinding"]) {
      if (el[field] !== undefined && el[field] !== null) {
        errors.push(`${where}/${id}: ${field} must be null`);
      }
    }
  }

  if (groupIds.size > 1) {
    errors.push(`${where}: expected one groupId, found ${[...groupIds].join(", ")}`);
  }
  if (elements.length === 0) {
    errors.push(`${where}: no elements`);
  }
}

function checkVariants(
  componentsDir: string,
  sheetFile: string,
  errors: string[],
  checks: ThemeChecks,
): void {
  const name = sheetFile.replace(/\.excalidraw$/, "");
  const dir = join(componentsDir, name);

  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".excalidraw")).sort();
  } catch {
    errors.push(`${name}: no variant directory`);
    return;
  }
  if (files.length === 0) {
    errors.push(`${name}: variant directory is empty`);
    return;
  }

  const seen: string[] = [];

  for (const file of files) {
    const where = `${name}/${file}`;
    const scene = JSON.parse(readFileSync(join(dir, file), "utf8")) as Record<string, unknown>;
    const elements = (scene.elements ?? []) as El[];

    checkElements(where, elements, errors, checks);

    const xs = elements.map((e) => Number(e.x));
    const ys = elements.map((e) => Number(e.y));
    if (elements.length > 0 && (Math.min(...xs) !== 0 || Math.min(...ys) !== 0)) {
      errors.push(`${where}: bounding box does not start at the origin`);
    }

    for (const el of elements) seen.push(String(el.id));
  }

  // The sheet is the union of the variants. Without this, a component can drop a
  // shape from one variant and nothing else notices.
  const sheet = JSON.parse(readFileSync(join(componentsDir, sheetFile), "utf8")) as Record<string, unknown>;
  const sheetElements = sheet.elements;
  // Malformed "elements" is already reported by checkElements(file, ...) in
  // validateAll; skip the partition check here rather than throwing on .map.
  if (Array.isArray(sheetElements)) {
    const sheetIds = (sheetElements as El[]).map((e) => String(e.id)).sort();
    if (seen.sort().join(",") !== sheetIds.join(",")) {
      errors.push(`${name}: variants do not partition the sheet`);
    }
  }
}

export function validateAll(theme: Theme, outDir: string = outDirFor(theme)): string[] {
  const errors: string[] = [];
  const componentsDir = join(outDir, "components");

  const checks: ThemeChecks = {
    allowed: paletteValues(theme),
    rungs: new Set(Object.values(theme.strokes)),
    fontIds: new Set(Object.values(theme.fonts)),
    roughness: theme.roughness,
  };

  const files = readdirSync(componentsDir).filter((f) => f.endsWith(".excalidraw"));
  if (files.length === 0) errors.push(`${componentsDir}: no .excalidraw files`);

  for (const file of files) {
    const scene = JSON.parse(readFileSync(join(componentsDir, file), "utf8")) as Record<string, unknown>;
    if (scene.type !== "excalidraw") errors.push(`${file}: type is not "excalidraw"`);
    if (scene.version !== 2) errors.push(`${file}: version is not 2`);
    if (scene.source !== SOURCE) errors.push(`${file}: unexpected source`);

    const appState = (scene.appState ?? {}) as Record<string, unknown>;
    const appStateKeys = Object.keys(appState).sort();
    if (appStateKeys.join(",") !== "gridSize,viewBackgroundColor") {
      errors.push(`${file}: appState must have exactly the keys "gridSize" and "viewBackgroundColor", found ${appStateKeys.join(", ")}`);
    }
    const bg = String(appState.viewBackgroundColor);
    if (!checks.allowed.has(bg)) {
      errors.push(`${file}: appState.viewBackgroundColor "${bg}" is not in the palette`);
    }

    checkElements(file, (scene.elements ?? []) as El[], errors, checks);
    checkVariants(componentsDir, file, errors, checks);
  }

  const lib = JSON.parse(
    readFileSync(join(outDir, "ui.excalidrawlib"), "utf8"),
  ) as Record<string, unknown>;
  if (lib.type !== "excalidrawlib") errors.push("library: type is not \"excalidrawlib\"");
  if (lib.version !== 2) errors.push("library: version is not 2");
  if (lib.source !== SOURCE) errors.push("library: unexpected source");
  const items = (lib.libraryItems ?? []) as Array<Record<string, unknown>>;
  if (items.length !== files.length) {
    errors.push(`library: has ${items.length} items but ${files.length} component files exist`);
  }
  for (const item of items) {
    checkElements(`library/${String(item.name)}`, (item.elements ?? []) as El[], errors, checks);
  }

  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // Same flags as build.ts, so `build -- --preset X` and `validate -- --preset X`
  // talk about the same output. Without this, validate only ever saw the default.
  const errors: string[] = [];
  for (const name of selectPresets(process.argv.slice(2))) {
    const theme = resolveTheme(loadPreset(name));
    for (const error of validateAll(theme, outDirFor(theme))) {
      errors.push(`${name}: ${error}`);
    }
  }

  if (errors.length > 0) {
    for (const error of errors) console.error(`ERROR ${error}`);
    console.error(`\n${errors.length} validation error(s)`);
    process.exit(1);
  }
  console.log("All generated files are valid.");
}
