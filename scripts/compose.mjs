import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { componentsDir, listComponents, loadVariant, measure, resolveRoot } from "./library.mjs";

const LEAF_KEYS = new Set(["component", "variant"]);
const CONTAINER_KEYS = new Set(["type", "gap", "align", "children"]);
const ALIGNS = new Set(["start", "center", "end"]);

function check(node) {
  if (node === null || typeof node !== "object" || Array.isArray(node)) {
    throw new Error(`Layout node must be an object, got ${JSON.stringify(node)}`);
  }

  if ("component" in node) {
    for (const key of Object.keys(node)) {
      if (!LEAF_KEYS.has(key)) throw new Error(`Unknown key "${key}" on a component node.`);
    }
    return;
  }

  if (node.type !== "row" && node.type !== "column") {
    throw new Error(`Node must have "component", or "type" of "row" or "column". Got ${JSON.stringify(node)}`);
  }
  for (const key of Object.keys(node)) {
    if (!CONTAINER_KEYS.has(key)) throw new Error(`Unknown key "${key}" on a ${node.type} node.`);
  }
  if (node.align !== undefined && !ALIGNS.has(node.align)) {
    throw new Error(`Unknown align "${node.align}". Use start, center or end.`);
  }
  if (!Array.isArray(node.children) || node.children.length === 0) {
    throw new Error(`A ${node.type} needs at least one child.`);
  }
  node.children.forEach(check);
}

/**
 * Resolve which variant a leaf resolves to. A leaf that names a variant gets that
 * variant, unknown or not — loadVariant reports unknown ones. A leaf that omits
 * variant defaults to "default", but only for components that have one; a component
 * with no "default" variant (accordion, collapsible, separator, switch, toggle) must
 * force the caller to choose, rather than silently picking one.
 */
function resolveVariant(root, preset, component, variant) {
  if (variant !== undefined) return variant;

  // Mirror loadVariant's own directory resolution so an unknown component or
  // missing build still surfaces loadVariant's usual error, from loadVariant itself,
  // once we call it below with "default".
  const componentDir = join(componentsDir(root, preset), component);
  if (!existsSync(componentDir)) return "default";

  const names = readdirSync(componentDir).map((f) => f.replace(/\.excalidraw$/, "")).sort();
  if (!names.includes("default")) {
    throw new Error(`${component} has no default variant; pick one of: ${names.join(", ")}`);
  }
  return "default";
}

/** Bottom-up sizing. Returns a tree mirroring the layout with sizes attached. */
function size(node, load) {
  if ("component" in node) {
    const { elements } = load(node.component, node.variant);
    return { node, elements, ...measure(elements) };
  }

  const gap = node.gap ?? 24;
  const children = node.children.map((child) => size(child, load));
  const along = children.reduce((sum, c) => sum + (node.type === "row" ? c.width : c.height), 0)
    + gap * (children.length - 1);
  const across = Math.max(...children.map((c) => (node.type === "row" ? c.height : c.width)));

  return node.type === "row"
    ? { node, children, gap, width: along, height: across }
    : { node, children, gap, width: across, height: along };
}

/** Top-down placement. Returns [{ elements, x, y }] for every leaf. */
function place(sized, x, y, out) {
  if (sized.elements) {
    out.push({ elements: sized.elements, x, y });
    return out;
  }

  const align = sized.node.align ?? "start";
  const offset = (childExtent, containerExtent) =>
    align === "center" ? (containerExtent - childExtent) / 2
    : align === "end" ? containerExtent - childExtent
    : 0;

  let cursor = 0;
  for (const child of sized.children) {
    if (sized.node.type === "row") {
      place(child, x + cursor, y + offset(child.height, sized.height), out);
      cursor += child.width + sized.gap;
    } else {
      place(child, x + offset(child.width, sized.width), y + cursor, out);
      cursor += child.height + sized.gap;
    }
  }
  return out;
}

const suffix = (n) => n.toString(36).padStart(4, "0");
const indexAt = (n) => `a${n.toString(36).padStart(5, "0")}V`;

export function compose(layout, { root = resolveRoot(), preset } = {}) {
  check(layout);

  /** @type {any} */
  let appState;
  const load = (component, variant) => {
    const resolved = resolveVariant(root, preset, component, variant);
    const loaded = loadVariant(root, preset, component, resolved);
    appState ??= loaded.appState;
    return loaded;
  };

  const placements = place(size(layout, load), 0, 0, []);
  const elements = [];

  placements.forEach((placement, instance) => {
    const tag = suffix(instance);
    for (const element of placement.elements) {
      elements.push({
        ...element,
        // Per-instance suffix on both id and group: two buttons must stay two groups,
        // not merge into one selection.
        id: `${element.id}-${tag}`,
        groupIds: element.groupIds.map((group) => `${group}-${tag}`),
        x: element.x + placement.x,
        y: element.y + placement.y,
        index: indexAt(elements.length),
      });
    }
  });

  return {
    type: "excalidraw",
    version: 2,
    source: "excalidraw-comic-components",
    elements,
    appState,
    files: {},
  };
}

export function parseArgs(argv) {
  const preset = argv.includes("--preset") ? argv[argv.indexOf("--preset") + 1] : undefined;
  if (argv.includes("--preset") && (preset === undefined || preset.startsWith("--"))) {
    throw new Error("--preset requires a preset name.");
  }

  if (argv[0] === "list") return { command: "list", preset };

  const layoutPath = argv[0];
  if (layoutPath === undefined || layoutPath.startsWith("-")) {
    throw new Error("Usage: compose.mjs <layout.json> -o <out.excalidraw> [--preset <name>]");
  }

  const flag = argv.indexOf("-o");
  const outPath = flag === -1 ? undefined : argv[flag + 1];
  if (outPath === undefined) throw new Error("An output path is required: -o <out.excalidraw>");

  return { command: "compose", layoutPath, outPath, preset };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const root = resolveRoot();

    if (args.command === "list") {
      for (const component of listComponents(root, args.preset)) {
        const variants = component.variants.map((v) => `${v.name} (${v.width}x${v.height})`).join(", ");
        console.log(`${component.name}: ${variants}`);
      }
    } else {
      const layout = JSON.parse(readFileSync(args.layoutPath, "utf8"));
      const scene = compose(layout, { root, preset: args.preset });
      mkdirSync(dirname(args.outPath), { recursive: true });
      writeFileSync(args.outPath, `${JSON.stringify(scene, null, 2)}\n`);
      console.log(`Wrote ${scene.elements.length} elements to ${args.outPath}`);
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
