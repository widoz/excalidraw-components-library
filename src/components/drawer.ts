import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, fillBand, font, inkBox, label, rule, size } from "../comic.js";

const W = 360;
const H = 260;
const GRABBER_W = 60;
const GRABBER_H = 8;
const BTN_H = 56;
const INSET = 20;

/**
 * Bottom-sheet panel. Excalidraw can't round only the top two corners, so the
 * panel itself is drawn square (`rounded: false`) and a rounded grabber bar
 * stands in for the "sheet" affordance instead.
 */
export default function drawer(theme: Theme): ExcalidrawElement[] {
  const f = new Factory("drawer", theme);
  const els: ExcalidrawElement[] = [];

  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: H, rounded: false }));

  els.push(...fillBand(f, {
    x: (W - GRABBER_W) / 2,
    y: 14,
    w: GRABBER_W,
    h: GRABBER_H,
    fill: color.border,
    rounded: true,
  }));

  els.push(...label(f, {
    x: 24,
    y: 40,
    text: "Share drawing",
    fontSize: size.fontMd,
    fontFamily: font.comic,
  }));

  els.push(...rule(f, { x: 24, y: 92, w: W - 48, stroke: color.muted }));
  els.push(...rule(f, { x: 24, y: 114, w: W - 96, stroke: color.muted }));

  const btnY = H - BTN_H - INSET;
  els.push(...inkBox(f, { x: INSET, y: btnY, w: W - INSET * 2, h: BTN_H, fill: color.accent }));
  els.push(...label(f, {
    x: W / 2,
    y: btnY + (BTN_H - size.fontSm * 1.25) / 2,
    text: "Copy link",
    fontSize: size.fontSm,
    fontFamily: font.comic,
    stroke: color.accentText,
    align: "center",
  }));

  return els;
}
