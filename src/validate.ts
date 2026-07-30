import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_OUT } from "./build.js";
import { PALETTE_VALUES } from "./theme.js";
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

function checkElements(where: string, elements: El[], errors: string[]): void {
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
      if (!PALETTE_VALUES.has(value)) {
        errors.push(`${where}/${id}: "${field}" value "${value}" is not in the palette`);
      }
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

export function validateAll(outDir: string = DEFAULT_OUT): string[] {
  const errors: string[] = [];
  const componentsDir = join(outDir, "components");

  const files = readdirSync(componentsDir).filter((f) => f.endsWith(".excalidraw"));
  if (files.length === 0) errors.push("dist/components: no .excalidraw files");

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
    if (!PALETTE_VALUES.has(bg)) {
      errors.push(`${file}: appState.viewBackgroundColor "${bg}" is not in the palette`);
    }

    checkElements(file, (scene.elements ?? []) as El[], errors);
  }

  const lib = JSON.parse(
    readFileSync(join(outDir, "comic-ui.excalidrawlib"), "utf8"),
  ) as Record<string, unknown>;
  if (lib.type !== "excalidrawlib") errors.push("library: type is not \"excalidrawlib\"");
  if (lib.version !== 2) errors.push("library: version is not 2");
  if (lib.source !== SOURCE) errors.push("library: unexpected source");
  const items = (lib.libraryItems ?? []) as Array<Record<string, unknown>>;
  if (items.length !== files.length) {
    errors.push(`library: has ${items.length} items but ${files.length} component files exist`);
  }
  for (const item of items) {
    checkElements(`library/${String(item.name)}`, (item.elements ?? []) as El[], errors);
  }

  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const errors = validateAll();
  if (errors.length > 0) {
    for (const error of errors) console.error(`ERROR ${error}`);
    console.error(`\n${errors.length} validation error(s)`);
    process.exit(1);
  }
  console.log("All generated files are valid.");
}
