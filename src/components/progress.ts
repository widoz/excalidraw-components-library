import { Factory } from "../element.js";
import type { Theme } from "../theme.js";
import { color, fillBand, inkBox, label, size } from "../style.js";
import { variants, type ComponentOutput } from "../variants.js";

const W = size.control;
const H = 32;
const ROW = 76;

/** Two bars at 35% and 80%. */
export default function progress(theme: Theme): ComponentOutput {
  const f = new Factory("progress", theme);

  const specs = [
    { name: "default", pct: 35 },
    { name: "high", pct: 80 },
  ];

  return variants(specs.map((v, i) => {
    const y = i * ROW;
    return {
      name: v.name,
      elements: [
        ...inkBox(f, { x: 0, y, w: W, h: H, fill: color.muted }),
        // Inset by 5px so the fill sits inside the wobbly outline.
        ...fillBand(f, {
          x: 5,
          y: y + 5,
          w: ((W - 10) * v.pct) / 100,
          h: H - 10,
          fill: color.accent,
          rounded: false,
        }),
        ...label(f, {
          x: W + 20,
          y: y + (H - size.fontSm * 1.25) / 2,
          text: `${v.pct}%`,
          fontSize: size.fontSm,
          stroke: color.mutedText,
        }),
      ],
    };
  }));
}
