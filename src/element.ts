import { color, size } from "./tokens.js";
import type { ColorRole, FontRole, StrokeRung, Theme } from "./theme.js";

export type ExcalidrawElement = Record<string, unknown> & {
  id: string;
  type: string;
  index: string;
};

/** Small, fast, deterministic PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a. Turns a component name into a stable PRNG seed. */
export function seedFromString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Rough advance-width estimate. Good enough to size a box around a label.
 * `advance` is chars-per-em for the face in use (`f.theme.advance`; see
 * tokens.fontAdvance) and is required — a default here would let a caller silently
 * pin one face's metric across every preset.
 */
export function estimateTextWidth(text: string, fontSize: number, advance: number): number {
  return text.length * fontSize * advance;
}

export interface RectOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: StrokeRung;
  strokeStyle?: "solid" | "dashed" | "dotted";
  rounded?: boolean;
  opacity?: number;
}

export interface LineOptions {
  x: number;
  y: number;
  points: Array<[number, number]>;
  stroke?: string;
  strokeWidth?: StrokeRung;
  fill?: string;
  closed?: boolean;
}

export interface TextOptions {
  x: number;
  y: number;
  text: string;
  fontSize?: number;
  fontFamily?: FontRole;
  stroke?: string;
  align?: "left" | "center" | "right";
}

/**
 * Emits Excalidraw elements for one component. Every element it produces carries
 * the component's single groupId and an index that ascends in creation order.
 */
export class Factory {
  readonly groupId: string;
  readonly theme: Theme;
  private readonly rng: () => number;
  private counter = 0;

  constructor(componentName: string, theme: Theme) {
    this.rng = mulberry32(seedFromString(componentName));
    this.groupId = `${componentName}-group`;
    this.theme = theme;
  }

  /**
   * Role name → concrete hex for this theme.
   *
   * `Object.hasOwn`, not a bare index: inherited Object.prototype keys otherwise slip
   * past an `undefined` check. `fill: "constructor"` returned a function, threw nothing,
   * and serialised an element with a missing colour. Same for `weight` and `face`.
   */
  private paint(role: string): string {
    if (!Object.hasOwn(this.theme.palette, role)) {
      throw new Error(`Unknown colour role "${role}" — components must use tokens.color.*`);
    }
    return this.theme.palette[role as ColorRole];
  }

  /** Rung name → concrete px for this theme. */
  private weight(rung: string | undefined): number {
    const key = rung ?? "outline";
    if (!Object.hasOwn(this.theme.strokes, key)) {
      throw new Error(`Unknown stroke rung "${rung}" — use tokens.stroke.*`);
    }
    return this.theme.strokes[key as StrokeRung];
  }

  /** Role name → concrete font id for this theme. */
  private face(role: string | undefined): number {
    const key = role ?? "body";
    if (!Object.hasOwn(this.theme.fonts, key)) {
      throw new Error(`Unknown font role "${role}" — use tokens.font.*`);
    }
    return this.theme.fonts[key as FontRole];
  }

  /** Positive 31-bit integer from the seeded stream. */
  private int(): number {
    return Math.floor(this.rng() * 2 ** 31);
  }

  private nextId(): string {
    return `${this.groupId}-${this.counter.toString(36)}-${this.int().toString(36)}`;
  }

  /**
   * Fixed-width base-36 counter with a trailing non-zero char: fractional index
   * strings must not end in "0", and fixed width keeps string order == creation order.
   */
  private nextIndex(): string {
    return `a${this.counter.toString(36).padStart(5, "0")}V`;
  }

  private base(type: string, o: {
    x: number; y: number; w: number; h: number;
    fill: string; stroke: string; strokeWidth: number;
    strokeStyle: "solid" | "dashed" | "dotted";
    roundness: { type: number } | null;
    opacity: number;
  }): ExcalidrawElement {
    const el: ExcalidrawElement = {
      id: this.nextId(),
      type,
      x: o.x,
      y: o.y,
      width: o.w,
      height: o.h,
      angle: 0,
      strokeColor: this.paint(o.stroke),
      backgroundColor: this.paint(o.fill),
      fillStyle: "solid",
      strokeWidth: o.strokeWidth,
      strokeStyle: o.strokeStyle,
      roughness: this.theme.roughness,
      opacity: o.opacity,
      groupIds: [this.groupId],
      frameId: null,
      index: this.nextIndex(),
      roundness: o.roundness,
      seed: this.int(),
      version: 1,
      versionNonce: this.int(),
      isDeleted: false,
      boundElements: null,
      updated: 1,
      link: null,
      locked: false,
    };
    this.counter++;
    return el;
  }

  rect(o: RectOptions): ExcalidrawElement {
    return this.base("rectangle", {
      x: o.x,
      y: o.y,
      w: o.w,
      h: o.h,
      fill: o.fill ?? color.surface,
      stroke: o.stroke ?? color.ink,
      strokeWidth: this.weight(o.strokeWidth),
      strokeStyle: o.strokeStyle ?? "solid",
      roundness: this.theme.edges === "sharp"
        ? null
        : (o.rounded ?? true) ? { type: 3 } : null,
      opacity: o.opacity ?? 100,
    });
  }

  ellipse(o: RectOptions): ExcalidrawElement {
    return this.base("ellipse", {
      x: o.x,
      y: o.y,
      w: o.w,
      h: o.h,
      fill: o.fill ?? color.surface,
      stroke: o.stroke ?? color.ink,
      strokeWidth: this.weight(o.strokeWidth),
      strokeStyle: o.strokeStyle ?? "solid",
      roundness: null,
      opacity: o.opacity ?? 100,
    });
  }

  line(o: LineOptions): ExcalidrawElement {
    const points: Array<[number, number]> = o.closed
      ? [...o.points, [o.points[0]![0], o.points[0]![1]]]
      : [...o.points];
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const el = this.base("line", {
      x: o.x,
      y: o.y,
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
      fill: o.fill ?? color.transparent,
      stroke: o.stroke ?? color.ink,
      strokeWidth: this.weight(o.strokeWidth),
      strokeStyle: "solid",
      roundness: { type: 2 },
      opacity: 100,
    });
    el.points = points;
    el.lastCommittedPoint = null;
    el.startBinding = null;
    el.endBinding = null;
    el.startArrowhead = null;
    el.endArrowhead = null;
    return el;
  }

  text(o: TextOptions): ExcalidrawElement {
    const fontSize = o.fontSize ?? size.fontMd;
    const align = o.align ?? "left";
    const width = estimateTextWidth(o.text, fontSize, this.theme.advance);
    const height = fontSize * 1.25;
    const x = align === "center" ? o.x - width / 2 : align === "right" ? o.x - width : o.x;
    const el = this.base("text", {
      x,
      y: o.y,
      w: width,
      h: height,
      fill: color.transparent,
      stroke: o.stroke ?? color.ink,
      strokeWidth: this.weight("outline"),
      strokeStyle: "solid",
      roundness: null,
      opacity: 100,
    });
    el.text = o.text;
    el.originalText = o.text;
    el.fontSize = fontSize;
    el.fontFamily = this.face(o.fontFamily);
    el.textAlign = align;
    el.verticalAlign = "top";
    el.containerId = null;
    el.autoResize = true;
    el.lineHeight = 1.25;
    return el;
  }
}
