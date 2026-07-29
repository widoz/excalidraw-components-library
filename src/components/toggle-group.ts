import { Factory, type ExcalidrawElement } from "../element.js";
import { color, rule, style } from "../comic.js";

const CELL_W = 70;
const CELL_H = 60;
const W = CELL_W * 3;
const PAD = 8;
/** The library's incidental-stroke weight. 4 / 2 / 1 are the only widths in use. */
const MARK_STROKE = 2;
const WIDTHS = [30, 20, 26];
const MARK_YS = [16, 28, 40];

/** Three joined square toggles, one pressed, marked with alignment-icon strokes. */
export default function toggleGroup(): ExcalidrawElement[] {
  const f = new Factory("toggle-group");
  const els: ExcalidrawElement[] = [];

  // One shadow behind the whole group, seam-clean like button-group.
  els.push(f.rect({
    x: style.shadowOffset,
    y: style.shadowOffset,
    w: W,
    h: CELL_H,
    fill: color.ink,
    stroke: color.ink,
    strokeWidth: 1,
    rounded: false,
  }));

  const cells: Array<{ pressed: boolean; align: "left" | "center" | "right" }> = [
    { pressed: false, align: "left" },
    { pressed: true, align: "center" },
    { pressed: false, align: "right" },
  ];

  cells.forEach((cell, i) => {
    const cellX = i * CELL_W;
    els.push(f.rect({
      x: cellX,
      y: 0,
      w: CELL_W,
      h: CELL_H,
      fill: cell.pressed ? color.accent : color.surface,
      rounded: false,
    }));

    const fg = cell.pressed ? color.accentText : color.ink;
    WIDTHS.forEach((w, j) => {
      const markX = cell.align === "left"
        ? cellX + PAD
        : cell.align === "right"
          ? cellX + CELL_W - PAD - w
          : cellX + (CELL_W - w) / 2;
      els.push(...rule(f, {
        x: markX,
        y: MARK_YS[j]!,
        w,
        stroke: fg,
        strokeWidth: MARK_STROKE,
      }));
    });
  });

  return els;
}
