import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, dots, fillBand, inkBox, label, size, stroke } from "../style.js";
import { variants, type ComponentOutput } from "../variants.js";

const LEFT_W = 180;
const HANDLE_W = 20;
const RIGHT_W = 200;
const H = 220;

/** Two side-by-side panels split by a draggable handle with a vertical grip. */
export default function resizable(theme: Theme): ComponentOutput {
  const f = new Factory("resizable", theme);
  const els: ExcalidrawElement[] = [];

  els.push(...inkBox(f, { x: 0, y: 0, w: LEFT_W, h: H, rounded: false }));
  els.push(...label(f, {
    x: 24,
    y: H / 2 - (size.fontMd * 1.25) / 2,
    text: "Left",
    fontSize: size.fontMd,
  }));

  const handleX = LEFT_W;
  els.push(...fillBand(f, { x: handleX, y: 0, w: HANDLE_W, h: H, fill: color.muted, rounded: false }));
  // `rule()` is horizontal only; these flanking strokes are vertical, so they go
  // through `f.line` directly rather than the rule() helper.
  els.push(f.line({ x: handleX, y: 0, points: [[0, 0], [0, H]], strokeWidth: stroke.outline }));
  els.push(f.line({ x: handleX + HANDLE_W, y: 0, points: [[0, 0], [0, H]], strokeWidth: stroke.outline }));

  // Grip: three dots stacked vertically. `dots()` only spaces horizontally, so it is
  // called three times with count: 1 and a manually incremented y, reusing the helper's
  // ellipse styling instead of duplicating its body with raw f.ellipse calls.
  const r = 3;
  const cx = handleX + HANDLE_W / 2 - r;
  const cy = H / 2 - r;
  const gapV = r * 2 + 6;
  for (let i = 0; i < 3; i++) {
    els.push(...dots(f, { x: cx, y: cy + (i - 1) * gapV, count: 1, gap: 0, r }));
  }

  const rightX = handleX + HANDLE_W;
  els.push(...inkBox(f, { x: rightX, y: 0, w: RIGHT_W, h: H, rounded: false }));
  els.push(...label(f, {
    x: rightX + 24,
    y: H / 2 - (size.fontMd * 1.25) / 2,
    text: "Right",
    fontSize: size.fontMd,
  }));

  return variants([{ name: "default", elements: els }]);
}
