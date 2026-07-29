import type { ExcalidrawElement, Factory } from "./element.js";
import { color, font, size, style } from "./tokens.js";

/** A filled box with a bold ink outline and a hard offset shadow. */
export function inkBox(
  f: Factory,
  o: {
    x: number; y: number; w: number; h: number;
    fill?: string; stroke?: string; rounded?: boolean;
    shadow?: boolean; strokeWidth?: number;
  },
): ExcalidrawElement[] {
  const out: ExcalidrawElement[] = [];
  if (o.shadow ?? true) {
    out.push(f.rect({
      x: o.x + style.shadowOffset,
      y: o.y + style.shadowOffset,
      w: o.w,
      h: o.h,
      fill: color.ink,
      stroke: color.ink,
      strokeWidth: 1,
      rounded: o.rounded,
    }));
  }
  out.push(f.rect({
    x: o.x,
    y: o.y,
    w: o.w,
    h: o.h,
    fill: o.fill ?? color.surface,
    stroke: o.stroke ?? color.ink,
    strokeWidth: o.strokeWidth,
    rounded: o.rounded,
  }));
  return out;
}

/**
 * A rectangle that exists only to carry a fill — a progress bar's accent portion,
 * a table stripe, a hovered menu row. It gets no outline of its own: `Factory.rect`
 * would otherwise centre a 4px ink stroke on its path and eat the band from both
 * sides. `rounded` is explicit because a band inside a rounded container must
 * usually be square, so its corners cannot poke through the container's fill path.
 */
export function fillBand(
  f: Factory,
  o: {
    x: number; y: number; w: number; h: number;
    fill: string; rounded: boolean; opacity?: number;
  },
): ExcalidrawElement[] {
  return [f.rect({
    x: o.x,
    y: o.y,
    w: o.w,
    h: o.h,
    fill: o.fill,
    stroke: color.transparent,
    strokeWidth: 1,
    rounded: o.rounded,
    opacity: o.opacity,
  })];
}

/** Circular counterpart of inkBox, positioned by its centre. */
export function inkCircle(
  f: Factory,
  o: { cx: number; cy: number; r: number; fill?: string; stroke?: string; shadow?: boolean },
): ExcalidrawElement[] {
  const out: ExcalidrawElement[] = [];
  const d = o.r * 2;
  if (o.shadow ?? true) {
    out.push(f.ellipse({
      x: o.cx - o.r + style.shadowOffset,
      y: o.cy - o.r + style.shadowOffset,
      w: d,
      h: d,
      fill: color.ink,
      stroke: color.ink,
      strokeWidth: 1,
    }));
  }
  out.push(f.ellipse({
    x: o.cx - o.r,
    y: o.cy - o.r,
    w: d,
    h: d,
    fill: o.fill ?? color.surface,
    stroke: o.stroke ?? color.ink,
  }));
  return out;
}

export function label(
  f: Factory,
  o: {
    x: number; y: number; text: string;
    fontSize?: number; fontFamily?: number;
    stroke?: string; align?: "left" | "center" | "right";
  },
): ExcalidrawElement[] {
  return [f.text(o)];
}

export function rule(
  f: Factory,
  o: { x: number; y: number; w: number; stroke?: string; strokeWidth?: number },
): ExcalidrawElement[] {
  return [f.line({
    x: o.x,
    y: o.y,
    points: [[0, 0], [o.w, 0]],
    stroke: o.stroke ?? color.border,
    strokeWidth: o.strokeWidth ?? 2,
  })];
}

/** A tick, drawn from the top-left of an `s` by `s` box. */
export function checkMark(
  f: Factory,
  o: { x: number; y: number; s: number; stroke?: string },
): ExcalidrawElement[] {
  const s = o.s;
  // Points are re-origined so the first is [0, 0], as the factory expects;
  // x/y absorb the original first point's offset to keep the same absolute placement.
  return [f.line({
    x: o.x,
    y: o.y + s * 0.55,
    points: [[0, 0], [s * 0.38, s * 0.45], [s, -s * 0.55]],
    stroke: o.stroke ?? color.ink,
  })];
}

export function chevron(
  f: Factory,
  o: { x: number; y: number; s: number; dir: "down" | "right" | "left"; stroke?: string },
): ExcalidrawElement[] {
  const s = o.s;
  if (o.dir === "down") {
    return [f.line({ x: o.x, y: o.y, points: [[0, 0], [s, s * 0.7], [s * 2, 0]], stroke: o.stroke ?? color.ink })];
  }
  if (o.dir === "left") {
    // Mirror the "right" points ([0,0],[s*0.7,s],[0,s*2]) horizontally about x = s*0.7:
    // mirrored x' = s*0.7 - x, giving (s*0.7,0), (0,s), (s*0.7,s*2). Factory.line requires
    // the first point to be [0,0], so shift the origin right by s*0.7 and subtract that
    // from every mirrored x: (0,0), (-s*0.7,s), (0,s*2). The drawn bounding box is then
    // [x, x+s*0.7] — identical to a "right" chevron at the same x, just mirrored.
    return [f.line({
      x: o.x + s * 0.7,
      y: o.y,
      points: [[0, 0], [-s * 0.7, s], [0, s * 2]],
      stroke: o.stroke ?? color.ink,
    })];
  }
  return [f.line({ x: o.x, y: o.y, points: [[0, 0], [s * 0.7, s], [0, s * 2]], stroke: o.stroke ?? color.ink })];
}

/** Speech bubble: box plus a closed triangular tail. */
export function bubble(
  f: Factory,
  o: { x: number; y: number; w: number; h: number; tailAt: "bottom" | "top"; tailX: number; fill?: string },
): ExcalidrawElement[] {
  const out = inkBox(f, { x: o.x, y: o.y, w: o.w, h: o.h, fill: o.fill ?? color.surface });
  const tailY = o.tailAt === "bottom" ? o.y + o.h : o.y;
  const dy = o.tailAt === "bottom" ? 26 : -26;
  out.push(f.line({
    x: o.x + o.tailX,
    y: tailY,
    points: [[0, 0], [22, dy], [40, 0]],
    closed: true,
    fill: o.fill ?? color.surface,
  }));
  return out;
}

/** Comic action starburst. */
export function burst(
  f: Factory,
  o: { cx: number; cy: number; r: number; spikes?: number; fill?: string; stroke?: string },
): ExcalidrawElement[] {
  const spikes = o.spikes ?? 10;
  const inner = o.r * 0.55;
  const points: Array<[number, number]> = [];
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? o.r : inner;
    const angle = (Math.PI * i) / spikes - Math.PI / 2;
    points.push([
      Math.round(Math.cos(angle) * radius * 100) / 100,
      Math.round(Math.sin(angle) * radius * 100) / 100,
    ]);
  }
  // Re-origin so the first point is [0, 0], as the factory expects.
  const [ox, oy] = points[0]!;
  const rel = points.map(([px, py]) => [px - ox, py - oy] as [number, number]);
  return [f.line({
    x: o.cx + ox,
    y: o.cy + oy,
    points: rel,
    closed: true,
    fill: o.fill ?? color.muted,
    stroke: o.stroke ?? color.ink,
  })];
}

/** Close icon: two crossing strokes in an `s` by `s` box. */
export function xMark(
  f: Factory,
  o: { x: number; y: number; s: number; stroke?: string },
): ExcalidrawElement[] {
  const stroke = o.stroke ?? color.ink;
  return [
    f.line({ x: o.x, y: o.y, points: [[0, 0], [o.s, o.s]], stroke }),
    f.line({ x: o.x + o.s, y: o.y, points: [[0, 0], [-o.s, o.s]], stroke }),
  ];
}

/** Re-exported so component files import layout constants from one place. */
export { color, font, size, style };
