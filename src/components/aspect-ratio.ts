import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, font, inkBox, label, size, stroke } from "../comic.js";
import { variants, type ComponentOutput } from "../variants.js";

const W = 320;
const H = 180;

/** A dashed placeholder frame with crossed diagonals and a ratio label. */
export default function aspectRatio(theme: Theme): ComponentOutput {
  const f = new Factory("aspect-ratio", theme);
  const els: ExcalidrawElement[] = [];

  els.push(...inkBox(f, {
    x: 0,
    y: 0,
    w: W,
    h: H,
    fill: color.transparent,
    strokeStyle: "dashed",
    shadow: false,
  }));

  els.push(f.line({
    x: 0,
    y: 0,
    points: [[0, 0], [W, H]],
    stroke: color.border,
    strokeWidth: stroke.hairline,
  }));
  els.push(f.line({
    x: 0,
    y: H,
    points: [[0, 0], [W, -H]],
    stroke: color.border,
    strokeWidth: stroke.hairline,
  }));

  els.push(...label(f, {
    x: W / 2,
    y: (H - size.fontMd * 1.25) / 2,
    text: "16 : 9",
    fontSize: size.fontMd,
    fontFamily: font.heading,
    align: "center",
  }));

  return variants([{ name: "default", elements: els }]);
}
