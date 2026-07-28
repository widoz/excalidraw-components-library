import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_OUT } from "./build.js";
import { PALETTE_VALUES } from "./tokens.js";
import { SOURCE } from "./scene.js";

const REQUIRED_FIELDS = [
  "id", "type", "x", "y", "width", "height", "angle", "strokeColor",
  "backgroundColor", "fillStyle", "strokeWidth", "strokeStyle", "roughness",
  "opacity", "groupIds", "frameId", "index", "roundness", "seed", "version",
  "versionNonce", "isDeleted", "boundElements", "updated", "link", "locked",
];

type El = Record<string, unknown>;

function checkElements(where: string, elements: El[], errors: string[]): void {
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

    for (const field of ["x", "y", "width", "height"]) {
      const value = el[field];
      if (typeof value !== "number" || !Number.isFinite(value)) {
        errors.push(`${where}/${id}: "${field}" is not a finite number`);
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
    checkElements(file, (scene.elements ?? []) as El[], errors);
  }

  const lib = JSON.parse(
    readFileSync(join(outDir, "comic-ui.excalidrawlib"), "utf8"),
  ) as Record<string, unknown>;
  if (lib.type !== "excalidrawlib") errors.push("library: type is not \"excalidrawlib\"");
  if (lib.version !== 2) errors.push("library: version is not 2");
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
