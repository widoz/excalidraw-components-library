import { Factory, type ExcalidrawElement } from "../element.js";
import { checkMark, color, font, inkBox, label, size } from "../comic.js";

const W = 320;
const INPUT_H = 56;
const BOX = 34;

/** The two pairings a label has: above an input, and beside a checkbox. */
export default function labelComponent(): ExcalidrawElement[] {
  const f = new Factory("label");
  const els: ExcalidrawElement[] = [];

  const labelH = size.fontSm * 1.25;
  const gap = 8;
  els.push(...label(f, {
    x: 0,
    y: 0,
    text: "Email address",
    fontSize: size.fontSm,
    fontFamily: font.comic,
  }));

  const inputY = labelH + gap;
  els.push(...inkBox(f, { x: 0, y: inputY, w: W, h: INPUT_H }));
  els.push(...label(f, {
    x: 16,
    y: inputY + (INPUT_H - size.fontSm * 1.25) / 2,
    text: "ada@example.com",
    fontSize: size.fontSm,
  }));

  const boxY = inputY + INPUT_H + 40;
  els.push(...inkBox(f, { x: 0, y: boxY, w: BOX, h: BOX, fill: color.accent }));
  els.push(...checkMark(f, { x: 8, y: boxY + 9, s: 18, stroke: color.accentText }));
  els.push(...label(f, {
    x: BOX + 22,
    y: boxY + (BOX - size.fontMd * 1.25) / 2,
    text: "Accept terms",
    fontSize: size.fontMd,
  }));

  return els;
}
