import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, font, inkBox, label, rule, size } from "../comic.js";

const W = 340;
const BAR_W = 44;
const BAR_GAP = 20;
const BASELINE_Y = 180;
const AXIS_X = 30;
const AXIS_TOP_Y = 20;
const BARS = [
  { month: "Mar", h: 60 },
  { month: "Apr", h: 110 },
  { month: "May", h: 85 },
  { month: "Jun", h: 150 },
  { month: "Jul", h: 120 },
];
const TALLEST_INDEX = 3;

/** Five bars on a shared baseline with an accent tallest bar, gridlines, and month labels. */
export default function chart(theme: Theme): ExcalidrawElement[] {
  const f = new Factory("chart", theme);
  const els: ExcalidrawElement[] = [];

  // Gridlines first, so the bars drawn afterwards sit on top of them.
  const gridYs = [60, 100, 140];
  for (const y of gridYs) {
    els.push(...rule(f, { x: AXIS_X, y, w: W - AXIS_X, stroke: color.border }));
  }

  const startX = AXIS_X + 10;
  BARS.forEach((bar, i) => {
    const x = startX + i * (BAR_W + BAR_GAP);
    const y = BASELINE_Y - bar.h;
    // Bars carry the house 4px ink outline like every other filled shape in the
    // library, so they are inkBoxes rather than outline-less fill bands. The drop
    // shadow is off: five shadowed bars sitting on one baseline would read as a
    // second, offset row of bars.
    els.push(...inkBox(f, {
      x,
      y,
      w: BAR_W,
      h: bar.h,
      fill: i === TALLEST_INDEX ? color.accent : color.muted,
      rounded: false,
      shadow: false,
    }));
    els.push(...label(f, {
      x: x + BAR_W / 2,
      y: BASELINE_Y + 10,
      text: bar.month,
      fontSize: size.fontSm,
      fontFamily: font.hand,
      align: "center",
    }));
  });

  els.push(...rule(f, { x: 0, y: BASELINE_Y, w: W, stroke: color.ink, strokeWidth: 4 }));
  els.push(f.line({
    x: AXIS_X,
    y: AXIS_TOP_Y,
    points: [[0, 0], [0, BASELINE_Y - AXIS_TOP_Y]],
    stroke: color.ink,
    strokeWidth: 4,
  }));

  return els;
}
