import { Factory, type ExcalidrawElement } from "../element.js";
import { bubble, color, font, inkBox, label, size } from "../comic.js";

const BTN_W = 140;
const BTN_H = 52;
const BUBBLE_W = 220;
const BUBBLE_H = 60;

/** A trigger button with a comic speech bubble pointing down at it. */
export default function tooltip(): ExcalidrawElement[] {
  const f = new Factory("tooltip");
  const els: ExcalidrawElement[] = [];

  const btnY = BUBBLE_H + 60;

  els.push(...bubble(f, {
    x: 0,
    y: 0,
    w: BUBBLE_W,
    h: BUBBLE_H,
    tailAt: "bottom",
    // Apex sits 22px along the tail base, so aim the base so apex = button centre.
    tailX: BTN_W / 2 - 22,
  }));
  els.push(...label(f, {
    x: BUBBLE_W / 2,
    y: (BUBBLE_H - size.fontSm * 1.25) / 2,
    text: "Save your work!",
    fontSize: size.fontSm,
    fontFamily: font.comic,
    align: "center",
  }));

  els.push(...inkBox(f, { x: 0, y: btnY, w: BTN_W, h: BTN_H, fill: color.accent }));
  els.push(...label(f, {
    x: BTN_W / 2,
    y: btnY + (BTN_H - size.fontSm * 1.25) / 2,
    text: "Save",
    fontSize: size.fontSm,
    fontFamily: font.comic,
    stroke: color.accentText,
    align: "center",
  }));

  return els;
}
