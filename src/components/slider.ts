import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { bubble, color, fillBand, font, inkBox, inkCircle, label, size } from "../comic.js";

const W = size.control;
const TRACK_H = 16;
const VALUE = 64;
const BUBBLE_W = 76;
const BUBBLE_H = 48;

/** Track, filled portion, knob, and a value bubble above the knob. */
export default function slider(theme: Theme): ExcalidrawElement[] {
  const f = new Factory("slider", theme);
  const els: ExcalidrawElement[] = [];

  const trackY = 90;
  const knobX = (W * VALUE) / 100;

  els.push(...inkBox(f, { x: 0, y: trackY, w: W, h: TRACK_H, fill: color.muted }));
  els.push(...fillBand(f, {
    x: 4,
    y: trackY + 4,
    w: knobX - 4,
    h: TRACK_H - 8,
    fill: color.accent,
    rounded: false,
  }));
  els.push(...inkCircle(f, { cx: knobX, cy: trackY + TRACK_H / 2, r: 20 }));

  // Value bubble, tail pointing down at the knob.
  const bubbleX = knobX - BUBBLE_W / 2;
  els.push(...bubble(f, {
    x: bubbleX,
    y: trackY - BUBBLE_H - 42,
    w: BUBBLE_W,
    h: BUBBLE_H,
    tailAt: "bottom",
    // Apex lands on the knob centre, which is the bubble's own centre.
    apexX: BUBBLE_W / 2,
  }));
  els.push(...label(f, {
    x: knobX,
    y: trackY - BUBBLE_H - 42 + (BUBBLE_H - size.fontMd * 1.25) / 2,
    text: String(VALUE),
    fontSize: size.fontMd,
    fontFamily: font.heading,
    align: "center",
  }));

  return els;
}
