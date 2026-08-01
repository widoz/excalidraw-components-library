import type { ExcalidrawElement } from "./element.js";

export interface Variant {
  /** Slug used as the variant's filename. */
  name: string;
  elements: ExcalidrawElement[];
}

export interface ComponentOutput {
  /** Every element, in declaration order. This is what the sheet file and library item use. */
  elements: ExcalidrawElement[];
  variants: Variant[];
}

const NAME = /^[a-z0-9][a-z0-9-]*$/;

/** Declares a component's variants. The concatenation is the sheet. */
export function variants(parts: Variant[]): ComponentOutput {
  if (parts.length === 0) {
    throw new Error("A component must declare at least one variant.");
  }

  const seen = new Set<string>();
  for (const part of parts) {
    if (!NAME.test(part.name)) {
      throw new Error(`Variant name "${part.name}" must match ${NAME.source}.`);
    }
    if (seen.has(part.name)) {
      throw new Error(`Duplicate variant name "${part.name}".`);
    }
    seen.add(part.name);
    if (part.elements.length === 0) {
      throw new Error(`Variant "${part.name}" has no elements.`);
    }
  }

  return { elements: parts.flatMap((part) => part.elements), variants: parts };
}

/**
 * Bridge for components not yet migrated: a bare element array becomes one
 * variant named "default". Removed in the task that tightens the builder type.
 */
export function toOutput(result: ExcalidrawElement[] | ComponentOutput): ComponentOutput {
  return Array.isArray(result)
    ? { elements: result, variants: [{ name: "default", elements: result }] }
    : result;
}

/**
 * Shifts elements so their bounding box starts at (0, 0). Required, not cosmetic:
 * `input`'s focus ring starts at x=-4, and a composer that trusts raw coordinates
 * misaligns every row. Line `points` are relative to x/y, so translation is safe.
 */
export function normalize(elements: ExcalidrawElement[]): ExcalidrawElement[] {
  const minX = Math.min(...elements.map((e) => e.x));
  const minY = Math.min(...elements.map((e) => e.y));
  return elements.map((e) => ({ ...e, x: e.x - minX, y: e.y - minY }));
}
