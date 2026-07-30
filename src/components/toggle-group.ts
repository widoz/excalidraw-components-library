import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, rule, stroke, style } from "../comic.js";

const CELL_W = 70;
const CELL_H = 60;
const W = CELL_W * 3;
const PAD = 8;
const WIDTHS = [30, 20, 26];
const MARK_YS = [16, 28, 40];

/** Three joined square toggles, one pressed, marked with alignment-icon strokes. */
export default function toggleGroup(theme: Theme): ExcalidrawElement[] {
  const f = new Factory("toggle-group", theme);
  const els: ExcalidrawElement[] = [];

  // One shadow behind the whole group, seam-clean like button-group.
  els.push(f.rect({
    x: style.shadowOffset,
    y: style.shadowOffset,
    w: W,
    h: CELL_H,
    fill: color.ink,
    stroke: color.ink,
    strokeWidth: stroke.shadow,
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
        strokeWidth: stroke.hairline,
      }));
    });
  });

  return els;
}
