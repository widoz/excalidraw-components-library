import { Factory, type ExcalidrawElement } from "../element.js";
import { color, fillBand, inkBox, label, size } from "../comic.js";

const W = size.control;
const H = 32;
const ROW = 76;

/** Two bars at 35% and 80%. */
export default function progress(): ExcalidrawElement[] {
  const f = new Factory("progress");
  const els: ExcalidrawElement[] = [];

  [35, 80].forEach((pct, i) => {
    const y = i * ROW;
    els.push(...inkBox(f, { x: 0, y, w: W, h: H, fill: color.muted }));
    // Inset by 5px so the fill sits inside the wobbly outline.
    els.push(...fillBand(f, {
      x: 5,
      y: y + 5,
      w: ((W - 10) * pct) / 100,
      h: H - 10,
      fill: color.accent,
      rounded: false,
    }));
    els.push(...label(f, {
      x: W + 20,
      y: y + (H - size.fontSm * 1.25) / 2,
      text: `${pct}%`,
      fontSize: size.fontSm,
      stroke: color.mutedText,
    }));
  });

  return els;
}
