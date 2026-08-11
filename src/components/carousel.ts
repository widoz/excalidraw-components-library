import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { chevron, color, dots, font, inkBox, inkCircle, label, size } from "../style.js";
import { variants, type ComponentOutput } from "../variants.js";

const W = 360;
const H = 220;
const BTN_R = 24;
const CHEVRON_S = 14;
const DOT_R = 6;
const DOT_GAP = 22;
const DOT_COUNT = 3;

/** A slide with an index label, straddling prev/next buttons, and dot indicators below. */
export default function carousel(theme: Theme): ComponentOutput {
  const f = new Factory("carousel", theme);
  const els: ExcalidrawElement[] = [];

  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: H }));
  els.push(...label(f, {
    x: W / 2,
    y: (H - size.fontLg * 1.25) / 2,
    text: "1 / 3",
    fontSize: size.fontLg,
    fontFamily: font.heading,
    align: "center",
  }));

  // Prev/next buttons straddle the slide's vertical centre, overlapping the left
  // and right edges by half their own radius.
  const cy = H / 2;
  els.push(...inkCircle(f, { cx: 0, cy, r: BTN_R }));
  // "left"/"right" chevrons are s*0.7 wide by s*2 tall (see style.ts) and centred
  // on their own bbox, so offset x/y by half that box to centre inside the button.
  els.push(...chevron(f, { x: 0 - CHEVRON_S * 0.35, y: cy - CHEVRON_S, s: CHEVRON_S, dir: "left" }));

  els.push(...inkCircle(f, { cx: W, cy, r: BTN_R }));
  els.push(...chevron(f, { x: W - CHEVRON_S * 0.35, y: cy - CHEVRON_S, s: CHEVRON_S, dir: "right" }));

  // Dot indicators, centred under the slide: (count - 1) gaps plus one diameter wide.
  const dotsW = (DOT_COUNT - 1) * DOT_GAP + DOT_R * 2;
  const dotsX = (W - dotsW) / 2;
  const dotsY = H + 20;
  els.push(...dots(f, { x: dotsX, y: dotsY, count: 1, gap: DOT_GAP, r: DOT_R, fill: color.ink }));
  els.push(...dots(f, { x: dotsX + DOT_GAP, y: dotsY, count: 2, gap: DOT_GAP, r: DOT_R, fill: color.muted }));

  return variants([{ name: "default", elements: els }]);
}
