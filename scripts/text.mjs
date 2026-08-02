/**
 * Text replacement for composed components.
 *
 * Two properties of the built scenes make this possible without touching src/ or
 * rebuilding dist/. Text elements are standalone (Factory.text sets containerId: null),
 * so there is never a bound-container refit. And the build sized every text element as
 * `len * fontSize * advance`, so the font metric can be divided back out per element —
 * which means presets with different faces work with no extra plumbing.
 */

export const FALLBACK_ADVANCE = 0.55;

/** Recover the chars-per-em metric the build used for this element. */
export function advanceOf(element) {
  const length = String(element.text ?? "").length;
  const fontSize = element.fontSize ?? 0;
  if (length === 0 || fontSize === 0) return FALLBACK_ADVANCE;
  return element.width / (length * fontSize);
}

/** The component's text elements, in the order the build emitted them. */
export function textSlots(elements) {
  return elements.filter((e) => e.type === "text");
}

function quote(texts) {
  return texts.map((t) => JSON.stringify(t.text)).join(", ");
}

/**
 * Validate a leaf's `text` and return it as an array aligned with the slots.
 * `label` is "<component>/<variant>", used so every message says which leaf is wrong.
 */
export function normalizeText(spec, texts, label) {
  const current = texts.length > 0 ? ` Current: ${quote(texts)}` : "";

  if (typeof spec === "string") {
    if (texts.length !== 1) {
      throw new Error(
        `${label} has ${texts.length} text elements; pass an array, not a string.${current}`,
      );
    }
    return [spec];
  }

  if (!Array.isArray(spec)) {
    throw new Error(`${label} "text" must be a string or an array of strings, got ${JSON.stringify(spec)}.`);
  }

  if (spec.length > texts.length) {
    throw new Error(
      `${label} has ${texts.length} text elements but ${spec.length} replacements were given.${current}`,
    );
  }

  for (const entry of spec) {
    if (entry === null || entry === undefined) continue;
    if (typeof entry !== "string") {
      throw new Error(`Replacement text must be a string or null, got ${JSON.stringify(entry)}.`);
    }
    if (entry.includes("\n")) {
      throw new Error(`Replacement text must be a single line; ${JSON.stringify(entry)} contains a newline.`);
    }
  }

  return spec;
}

/**
 * Widening: `delta` px of blank space are inserted at `cut`, the replaced text's old
 * right edge. Because the insertion point is the text's own right edge and the box
 * around it grows by the same amount, the text keeps its distance to both box edges —
 * so centred and right-aligned labels stay put without any containing-rect detection.
 */
function insertSpace(element, cut, delta) {
  const width = element.width ?? 0;
  if (element.x + width <= cut) return element;
  if (element.x >= cut) return { ...element, x: element.x + delta };

  if (element.type === "rectangle" || element.type === "ellipse") {
    return { ...element, width: width + delta };
  }
  if (element.type === "line" && width > 0) {
    const scale = (width + delta) / width;
    return {
      ...element,
      width: width * scale,
      points: element.points.map(([px, py]) => [px * scale, py]),
    };
  }
  return element;
}

/** Narrowing: the box is untouched; only the text moves, by its own alignment. */
function reanchor(element, width) {
  const shrink = element.width - width;
  const x = element.textAlign === "center" ? element.x + shrink / 2
    : element.textAlign === "right" ? element.x + shrink
    : element.x;
  return { ...element, x, width };
}

function replaceOne(elements, index, next) {
  const target = elements[index];
  const width = next.length * target.fontSize * advanceOf(target);
  const delta = width - target.width;
  const written = { text: next, originalText: next };

  if (delta <= 0) {
    return elements.map((e, i) => (i === index ? { ...reanchor(e, width), ...written } : e));
  }

  const cut = target.x + target.width;
  return elements.map((e, i) => (
    i === index ? { ...e, ...written, width } : insertSpace(e, cut, delta)
  ));
}

/**
 * Apply a leaf's `text` to a component's elements. Returns a new array; the input is
 * never mutated, because the caller's elements come straight from the loaded scene and
 * may be reused by another instance of the same component.
 */
export function applyText(elements, spec, label) {
  const replacements = normalizeText(spec, textSlots(elements), label);

  const slots = [];
  elements.forEach((e, i) => { if (e.type === "text") slots.push(i); });

  let out = elements;
  replacements.forEach((next, slot) => {
    if (next === null || next === undefined) return;
    out = replaceOne(out, slots[slot], next);
  });
  return out;
}
