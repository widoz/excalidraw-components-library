import { Factory, type ExcalidrawElement } from "../element.js";
import { color, inkBox, label, size } from "../comic.js";

const W = size.control;
const H = 56;

/** Two fields: one with placeholder text, one focused with a doubled outline and caret. */
export default function input(): ExcalidrawElement[] {
  const f = new Factory("input");
  const els: ExcalidrawElement[] = [];

  // Resting field.
  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: H }));
  els.push(...label(f, {
    x: 18,
    y: (H - size.fontSm * 1.25) / 2,
    text: "your@email.com",
    fontSize: size.fontSm,
    stroke: color.subtle,
  }));

  // Focused field: a second, offset outline gives the sketchy "double stroke" focus ring.
  const y2 = H + 40;
  els.push(...inkBox(f, { x: 0, y: y2, w: W, h: H }));
  els.push(f.rect({ x: -4, y: y2 - 4, w: W + 8, h: H + 8, fill: color.transparent }));
  els.push(...label(f, {
    x: 18,
    y: y2 + (H - size.fontSm * 1.25) / 2,
    text: "hello there",
    fontSize: size.fontSm,
  }));
  // Caret.
  els.push(f.line({ x: 132, y: y2 + 14, points: [[0, 0], [0, H - 28]], strokeWidth: 2 }));

  return els;
}
