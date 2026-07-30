import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, font, inkBox, label, size, stroke, style, xMark } from "../comic.js";

const W = 320;
const H = 420;
const ROW_PITCH = 90;
const FIELD_X = 30;
const FIELD_W = 260;
const BTN_H = 50;

/**
 * A right-docked panel: its hard shadow reads as cast inward (to the left), which is
 * the opposite of `inkBox`'s fixed +6,+6 offset, so the panel surface is built by
 * hand instead of via `inkBox`. The shadow rect is emitted first, at x - 6, y + 6,
 * so it sits behind the surface that is drawn right after it.
 */
export default function sheet(theme: Theme): ExcalidrawElement[] {
  const f = new Factory("sheet", theme);
  const els: ExcalidrawElement[] = [];

  els.push(f.rect({
    x: -style.shadowOffset,
    y: style.shadowOffset,
    w: W,
    h: H,
    fill: color.ink,
    stroke: color.ink,
    strokeWidth: stroke.shadow,
    rounded: false,
  }));
  els.push(f.rect({
    x: 0,
    y: 0,
    w: W,
    h: H,
    fill: color.surface,
    stroke: color.ink,
    strokeWidth: stroke.outline,
    rounded: false,
  }));

  els.push(...xMark(f, { x: W - 44, y: 26, s: 18 }));

  els.push(...label(f, {
    x: FIELD_X,
    y: 30,
    text: "Edit drawing",
    fontSize: size.fontLg,
    fontFamily: font.comic,
  }));

  const fields = ["Name", "Tags", "Notes"];
  fields.forEach((text, i) => {
    const y = 90 + i * ROW_PITCH;
    els.push(...label(f, { x: FIELD_X, y, text, fontSize: size.fontSm, stroke: color.mutedText }));
    els.push(...inkBox(f, { x: FIELD_X, y: y + 26, w: FIELD_W, h: 44, rounded: false }));
  });

  const btnY = H - BTN_H - 24;
  els.push(...inkBox(f, {
    x: FIELD_X - 6,
    y: btnY,
    w: FIELD_W + 12,
    h: BTN_H,
    fill: color.accent,
    rounded: false,
  }));
  els.push(...label(f, {
    x: FIELD_X - 6 + (FIELD_W + 12) / 2,
    y: btnY + (BTN_H - size.fontSm * 1.25) / 2,
    text: "Save changes",
    fontSize: size.fontSm,
    fontFamily: font.comic,
    stroke: color.accentText,
    align: "center",
  }));

  return els;
}
