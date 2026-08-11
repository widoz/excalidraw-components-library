import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { checkMark, color, font, inkBox, label, size } from "../style.js";
import { variants, type ComponentOutput } from "../variants.js";

const W = 320;
const INPUT_H = 56;
const BOX = 34;

/** The two pairings a label has: above an input, and beside a checkbox. */
export default function labelComponent(theme: Theme): ComponentOutput {
  const f = new Factory("label", theme);

  const defaultEls: ExcalidrawElement[] = [];
  const labelH = size.fontSm * 1.25;
  const gap = 8;
  defaultEls.push(...label(f, {
    x: 0,
    y: 0,
    text: "Email address",
    fontSize: size.fontSm,
    fontFamily: font.heading,
  }));

  const inputY = labelH + gap;
  defaultEls.push(...inkBox(f, { x: 0, y: inputY, w: W, h: INPUT_H }));
  defaultEls.push(...label(f, {
    x: 16,
    y: inputY + (INPUT_H - size.fontSm * 1.25) / 2,
    text: "ada@example.com",
    fontSize: size.fontSm,
  }));

  const checkboxEls: ExcalidrawElement[] = [];
  const boxY = inputY + INPUT_H + 40;
  checkboxEls.push(...inkBox(f, { x: 0, y: boxY, w: BOX, h: BOX, fill: color.accent }));
  checkboxEls.push(...checkMark(f, { x: 8, y: boxY + 9, s: 18, stroke: color.accentText }));
  checkboxEls.push(...label(f, {
    x: BOX + 22,
    y: boxY + (BOX - size.fontMd * 1.25) / 2,
    text: "Accept terms",
    fontSize: size.fontMd,
  }));

  return variants([
    { name: "default", elements: defaultEls },
    { name: "checkbox", elements: checkboxEls },
  ]);
}
