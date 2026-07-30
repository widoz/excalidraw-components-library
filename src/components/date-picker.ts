import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { chevron, color, font, inkBox, inkCircle, label, size, stroke } from "../comic.js";

const W = 320;
const TRIGGER_H = 56;
const GLYPH_W = 22;
const GLYPH_H = 20;
const GLYPH_X = 18;
const POPOVER_W = 300;
const POPOVER_X = (W - POPOVER_W) / 2;
const POPOVER_Y = TRIGGER_H + 22;
const HEADER_H = 40;
const ROW_H = 40;
const COL_PITCH = 40;
const GRID_ORIGIN_X = POPOVER_X + (POPOVER_W - COL_PITCH * 7) / 2;
const CHEVRON_S = 8;
const SELECTED_DAY = 17;

/** Trigger with a calendar glyph and a compact three-week month popover below it. */
export default function datePicker(theme: Theme): ExcalidrawElement[] {
  const f = new Factory("date-picker", theme);
  const els: ExcalidrawElement[] = [];

  // Trigger.
  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: TRIGGER_H }));

  // Calendar glyph: a small box with two "binding" strokes above it.
  const glyphY = (TRIGGER_H - GLYPH_H) / 2;
  els.push(f.line({ x: GLYPH_X + 4, y: glyphY - 6, points: [[0, 0], [0, 6]], strokeWidth: stroke.hairline }));
  els.push(f.line({ x: GLYPH_X + GLYPH_W - 4, y: glyphY - 6, points: [[0, 0], [0, 6]], strokeWidth: stroke.hairline }));
  els.push(...inkBox(f, {
    x: GLYPH_X,
    y: glyphY,
    w: GLYPH_W,
    h: GLYPH_H,
    strokeWidth: stroke.hairline,
    shadow: false,
  }));

  els.push(...label(f, {
    x: GLYPH_X + GLYPH_W + 16,
    y: (TRIGGER_H - size.fontSm * 1.25) / 2,
    text: "17 July 2026",
    fontSize: size.fontSm,
  }));

  // Popover panel.
  const popoverH = HEADER_H + 3 * ROW_H;
  els.push(...inkBox(f, { x: POPOVER_X, y: POPOVER_Y, w: POPOVER_W, h: popoverH }));

  els.push(...chevron(f, {
    x: POPOVER_X + 12,
    y: POPOVER_Y + HEADER_H / 2 - CHEVRON_S,
    s: CHEVRON_S,
    dir: "left",
  }));
  els.push(...label(f, {
    x: POPOVER_X + POPOVER_W / 2,
    y: POPOVER_Y + (HEADER_H - size.fontMd * 1.25) / 2,
    text: "July 2026",
    fontSize: size.fontMd,
    fontFamily: font.heading,
    align: "center",
  }));
  els.push(...chevron(f, {
    x: POPOVER_X + POPOVER_W - 12 - CHEVRON_S * 0.7,
    y: POPOVER_Y + HEADER_H / 2 - CHEVRON_S,
    s: CHEVRON_S,
    dir: "right",
  }));

  const gridY = POPOVER_Y + HEADER_H;
  for (let day = 1; day <= 21; day++) {
    const row = Math.floor((day - 1) / 7);
    const col = (day - 1) % 7;
    const cx = GRID_ORIGIN_X + col * COL_PITCH + COL_PITCH / 2;
    const cy = gridY + row * ROW_H + ROW_H / 2;

    if (day === SELECTED_DAY) {
      els.push(...inkCircle(f, { cx, cy, r: 14, fill: color.accent, shadow: false }));
      els.push(...label(f, {
        x: cx,
        y: cy - (size.fontSm * 1.25) / 2,
        text: String(day),
        fontSize: size.fontSm,
        fontFamily: font.heading,
        stroke: color.accentText,
        align: "center",
      }));
    } else {
      els.push(...label(f, {
        x: cx,
        y: cy - (size.fontSm * 1.25) / 2,
        text: String(day),
        fontSize: size.fontSm,
        align: "center",
      }));
    }
  }

  return els;
}
