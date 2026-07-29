import { Factory, type ExcalidrawElement } from "../element.js";
import { chevron, color, fillBand, inkBox, label, size } from "../comic.js";

const W = size.control;
const TRIGGER_H = 56;
const ITEM_H = 46;

/** Closed trigger with a chevron, plus the open menu with one highlighted item. */
export default function select(): ExcalidrawElement[] {
  const f = new Factory("select");
  const els: ExcalidrawElement[] = [];

  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: TRIGGER_H }));
  els.push(...label(f, {
    x: 18,
    y: (TRIGGER_H - size.fontMd * 1.25) / 2,
    text: "Pick a style",
    fontSize: size.fontMd,
  }));
  els.push(...chevron(f, { x: W - 42, y: TRIGGER_H / 2 - 5, s: 12, dir: "down" }));

  // Open menu.
  const items = ["Sketchy", "Comic", "Clean"];
  const menuY = TRIGGER_H + 22;
  const menuH = items.length * ITEM_H + 16;
  els.push(...inkBox(f, { x: 0, y: menuY, w: W, h: menuH }));

  items.forEach((text, i) => {
    const y = menuY + 8 + i * ITEM_H;
    const highlighted = text === "Comic";
    if (highlighted) {
      els.push(...fillBand(f, { x: 8, y, w: W - 16, h: ITEM_H, fill: color.accent, rounded: false }));
    }
    els.push(...label(f, {
      x: 22,
      y: y + (ITEM_H - size.fontSm * 1.25) / 2,
      text,
      fontSize: size.fontSm,
      stroke: highlighted ? color.accentText : color.ink,
    }));
  });

  return els;
}
