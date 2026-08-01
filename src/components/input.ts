import { Factory, estimateTextWidth, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, inkBox, label, size, stroke } from "../comic.js";
import { variants, type ComponentOutput } from "../variants.js";

const W = size.control;
const H = 56;
const PAD_X = 18;
const TYPED = "hello there";

/** Two fields: one with placeholder text, one focused with a doubled outline and caret. */
export default function input(theme: Theme): ComponentOutput {
  const f = new Factory("input", theme);

  // Resting field.
  const defaultEls: ExcalidrawElement[] = [];
  defaultEls.push(...inkBox(f, { x: 0, y: 0, w: W, h: H }));
  defaultEls.push(...label(f, {
    x: 18,
    y: (H - size.fontSm * 1.25) / 2,
    text: "your@email.com",
    fontSize: size.fontSm,
    stroke: color.subtle,
  }));

  // Focused field: a second, offset outline gives the sketchy "double stroke" focus ring.
  const focusedEls: ExcalidrawElement[] = [];
  const y2 = H + 40;
  focusedEls.push(...inkBox(f, { x: 0, y: y2, w: W, h: H }));
  focusedEls.push(f.rect({ x: -4, y: y2 - 4, w: W + 8, h: H + 8, fill: color.transparent }));
  focusedEls.push(...label(f, {
    x: PAD_X,
    y: y2 + (H - size.fontSm * 1.25) / 2,
    text: TYPED,
    fontSize: size.fontSm,
  }));
  // Caret, parked just past the end of the typed text.
  const caretX = PAD_X + estimateTextWidth(TYPED, size.fontSm, f.theme.advance) + 4;
  focusedEls.push(f.line({ x: caretX, y: y2 + 14, points: [[0, 0], [0, H - 28]], strokeWidth: stroke.hairline }));

  return variants([
    { name: "default", elements: defaultEls },
    { name: "focused", elements: focusedEls },
  ]);
}
