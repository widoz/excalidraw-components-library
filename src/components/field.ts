import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, font, inkBox, label, size } from "../style.js";
import { variants, type ComponentOutput } from "../variants.js";

const W = size.control;
const INPUT_H = 56;
const GROUP_GAP = 130;

/**
 * Two stacked form fields: one valid, one in error. The palette is grayscale,
 * so the error group signals with weight (a doubled outline, `font.heading`
 * text) rather than a colour that doesn't exist in the token set.
 */
export default function field(theme: Theme): ComponentOutput {
  const f = new Factory("field", theme);

  // Group 1: valid.
  const defaultEls: ExcalidrawElement[] = [];
  defaultEls.push(...label(f, { x: 0, y: 0, text: "Email", fontSize: size.fontSm }));
  const input1Y = 24;
  defaultEls.push(...inkBox(f, { x: 0, y: input1Y, w: W, h: INPUT_H }));
  defaultEls.push(...label(f, {
    x: 18,
    y: input1Y + (INPUT_H - size.fontSm * 1.25) / 2,
    text: "ada@example.com",
    fontSize: size.fontSm,
  }));
  defaultEls.push(...label(f, {
    x: 0,
    y: input1Y + INPUT_H + 10,
    text: "We'll never share it.",
    fontSize: size.fontSm,
    stroke: color.mutedText,
  }));

  // Group 2: error.
  const errorEls: ExcalidrawElement[] = [];
  const g2Y = GROUP_GAP;
  errorEls.push(...label(f, { x: 0, y: g2Y, text: "Password", fontSize: size.fontSm }));
  const input2Y = g2Y + 24;
  errorEls.push(...inkBox(f, { x: 0, y: input2Y, w: W, h: INPUT_H }));
  // Doubled outline: a second, offset outline signals the error state, the
  // same sketchy double-stroke idiom input.ts uses for focus.
  errorEls.push(f.rect({ x: -4, y: input2Y - 4, w: W + 8, h: INPUT_H + 8, fill: color.transparent }));
  errorEls.push(...label(f, {
    x: 18,
    y: input2Y + (INPUT_H - size.fontSm * 1.25) / 2,
    text: "•••",
    fontSize: size.fontSm,
  }));
  errorEls.push(...label(f, {
    x: 0,
    y: input2Y + INPUT_H + 10,
    text: "Too short.",
    fontSize: size.fontSm,
    fontFamily: font.heading,
    stroke: color.ink,
  }));

  return variants([
    { name: "default", elements: defaultEls },
    { name: "error", elements: errorEls },
  ]);
}
