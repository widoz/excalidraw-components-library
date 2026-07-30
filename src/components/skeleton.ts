import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, fillBand, stroke } from "../comic.js";

const R = 28;
const CX = R;
const CY = 80;
const BAR_X = 80;
const BAR_H = 16;
const BAR_PITCH = 28;
const BAR_WIDTHS = [200, 170, 120];

/** A bare loading placeholder: no frame, no text, just an avatar circle and stacked bars. */
export default function skeleton(theme: Theme): ExcalidrawElement[] {
  const f = new Factory("skeleton", theme);
  const els: ExcalidrawElement[] = [];

  // Drawn directly via f.ellipse, not inkCircle: skeletons carry no drop shadow,
  // and the brief calls for a thinner border stroke than inkCircle's default.
  els.push(f.ellipse({
    x: CX - R,
    y: CY - R,
    w: R * 2,
    h: R * 2,
    fill: color.muted,
    stroke: color.border,
    strokeWidth: stroke.hairline,
  }));

  const barsTop = CY - ((BAR_WIDTHS.length - 1) * BAR_PITCH + BAR_H) / 2;
  BAR_WIDTHS.forEach((w, i) => {
    els.push(...fillBand(f, {
      x: BAR_X,
      y: barsTop + i * BAR_PITCH,
      w,
      h: BAR_H,
      fill: color.muted,
      rounded: true,
    }));
  });

  return els;
}
