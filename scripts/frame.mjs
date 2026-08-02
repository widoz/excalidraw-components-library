import { advanceOf } from "./text.mjs";

export const DEFAULT_PADDING = 16;
const LINE_HEIGHT = 1.25;
const FRAME_KEYS = new Set(["padding", "label"]);

/**
 * Used only when a layout somehow contains no component to sample from. Values match
 * the default preset so a frame never looks foreign.
 */
const FALLBACK = {
  strokeColor: "#18181b",
  strokeWidth: 1,
  roughness: 2,
  roundness: { type: 3 },
  fillStyle: "solid",
  fontFamily: 7,
  fontSize: 20,
  textColor: "#18181b",
  advance: 0.55,
};

export function checkFrame(frame) {
  if (frame === null || typeof frame !== "object" || Array.isArray(frame)) {
    throw new Error(`"frame" must be an object, e.g. {"padding": 16, "label": "Settings"}.`);
  }
  for (const key of Object.keys(frame)) {
    if (!FRAME_KEYS.has(key)) {
      throw new Error(`Unknown key "${key}" on a frame. Use padding, label.`);
    }
  }
  if (frame.padding !== undefined && (typeof frame.padding !== "number" || !Number.isFinite(frame.padding) || frame.padding < 0)) {
    throw new Error(`Frame padding must be a number >= 0, got ${JSON.stringify(frame.padding)}.`);
  }
  if (frame.label !== undefined && typeof frame.label !== "string") {
    throw new Error(`Frame label must be a string, got ${JSON.stringify(frame.label)}.`);
  }
}

/**
 * Frames are styled from the components they contain, never hardcoded, so a frame in a
 * blueprint-preset scene comes out thin-stroked and sharp-cornered for free. Rect and
 * text styling are sampled independently: separator/horizontal has no rectangle, so
 * "the first component" cannot be assumed to supply both.
 *
 * Within the first component that has any rectangle, the rect with the LARGEST
 * strokeWidth is sampled, not the first one. Most components draw a drop-shadow rect
 * first (thin) and the body rect second (thick); sampling the first would give frames a
 * hairline border against components with a much heavier one. First-component-wins
 * still holds: a later component's rectangles never override an earlier sample.
 */
export function sampleStyle() {
  let box;
  let type;

  return {
    sample(elements) {
      if (box === undefined) {
        const rects = elements.filter((e) => e.type === "rectangle");
        if (rects.length > 0) {
          box = rects.reduce((widest, r) => (r.strokeWidth > widest.strokeWidth ? r : widest));
        }
      }
      type ??= elements.find((e) => e.type === "text");
    },
    get() {
      return {
        strokeColor: box?.strokeColor ?? FALLBACK.strokeColor,
        strokeWidth: box?.strokeWidth ?? FALLBACK.strokeWidth,
        roughness: box?.roughness ?? FALLBACK.roughness,
        roundness: box === undefined ? FALLBACK.roundness : box.roundness,
        fillStyle: box?.fillStyle ?? FALLBACK.fillStyle,
        fontFamily: type?.fontFamily ?? FALLBACK.fontFamily,
        fontSize: type?.fontSize ?? FALLBACK.fontSize,
        // The panel is an outline; its title should be the same ink as the outline, not
        // the (often light-on-dark) ink of a label sampled from inside a filled component.
        textColor: box?.strokeColor ?? type?.strokeColor ?? FALLBACK.textColor,
        advance: type === undefined ? FALLBACK.advance : advanceOf(type),
      };
    },
  };
}

/** An empty-string label is treated as no label: no band, no width contribution. */
function hasLabel(frame) {
  return frame.label !== undefined && frame.label !== "";
}

export function frameInsets(frame, style) {
  const padding = frame.padding ?? DEFAULT_PADDING;
  const band = hasLabel(frame) ? style.fontSize * LINE_HEIGHT + padding : 0;
  return { padding, band };
}

/**
 * The minimum panel width needed for the label itself to fit inside the padding, so a
 * long label never overhangs a panel sized only from its children. 0 when there is no
 * label.
 */
export function frameMinWidth(frame, style) {
  if (!hasLabel(frame)) return 0;
  const padding = frame.padding ?? DEFAULT_PADDING;
  return 2 * padding + frame.label.length * style.fontSize * style.advance;
}

/**
 * Ids and groupIds are placeholders: compose() suffixes every placement with a unique
 * instance tag, so two frames never collide and each selects as one unit.
 */
function element(type, index, extra) {
  return {
    id: `frame-${index}`,
    type,
    angle: 0,
    fillStyle: "solid",
    strokeStyle: "solid",
    opacity: 100,
    groupIds: ["frame-group"],
    frameId: null,
    index: `a${index.toString(36).padStart(5, "0")}V`,
    seed: 1,
    version: 1,
    versionNonce: 1,
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
    ...extra,
  };
}

export function frameElements(frame, width, height, style) {
  const { padding } = frameInsets(frame, style);

  const elements = [element("rectangle", 0, {
    x: 0,
    y: 0,
    width,
    height,
    strokeColor: style.strokeColor,
    backgroundColor: "transparent",
    fillStyle: style.fillStyle,
    strokeWidth: style.strokeWidth,
    roughness: style.roughness,
    roundness: style.roundness,
  })];

  if (hasLabel(frame)) {
    elements.push(element("text", 1, {
      x: padding,
      y: padding,
      width: frame.label.length * style.fontSize * style.advance,
      height: style.fontSize * LINE_HEIGHT,
      strokeColor: style.textColor,
      backgroundColor: "transparent",
      strokeWidth: style.strokeWidth,
      roughness: style.roughness,
      roundness: null,
      text: frame.label,
      originalText: frame.label,
      fontSize: style.fontSize,
      fontFamily: style.fontFamily,
      textAlign: "left",
      verticalAlign: "top",
      containerId: null,
      autoResize: true,
      lineHeight: LINE_HEIGHT,
    }));
  }

  return elements;
}
