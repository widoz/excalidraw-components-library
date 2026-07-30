import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, inkBox, label, rule, size, stroke } from "../comic.js";

const W = size.control;
const H = 180;

/** Multi-line box with ruled placeholder lines and a corner resize grip. */
export default function textarea(theme: Theme): ExcalidrawElement[] {
  const f = new Factory("textarea", theme);
  const els: ExcalidrawElement[] = [];

  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: H }));
  els.push(...label(f, {
    x: 18,
    y: 16,
    text: "Tell us your story...",
    fontSize: size.fontSm,
    stroke: color.subtle,
  }));

  // Ruled lines suggesting wrapped text.
  const widths = [W - 52, W - 36, W - 90, W - 140];
  widths.forEach((w, i) => {
    els.push(...rule(f, { x: 18, y: 62 + i * 24, w, stroke: color.muted, strokeWidth: stroke.hairline }));
  });

  // Resize grip: three short diagonals in the bottom-right corner.
  for (let i = 0; i < 3; i++) {
    // Starts at 16 so the shortest diagonal already has 8px of length; an offset
    // of 8 would make the first stroke a zero-length, invisible line.
    const offset = 16 + i * 8;
    els.push(f.line({
      x: W - offset,
      y: H - 8,
      points: [[0, 0], [offset - 8, -(offset - 8)]],
      stroke: color.subtle,
      strokeWidth: stroke.hairline,
    }));
  }

  return els;
}
