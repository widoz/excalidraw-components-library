import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { arc, color, label, size, stroke } from "../style.js";
import { variants, type ComponentOutput } from "../variants.js";

const PITCH = 90;
const R = 26;

/** Three spinners at increasing sweep, suggesting rotation, over a "Loading..." caption. */
export default function spinner(theme: Theme): ComponentOutput {
  const f = new Factory("spinner", theme);
  const els: ExcalidrawElement[] = [];

  // 90, then 180, then 270 degrees of sweep, each starting further round the circle:
  // the growing gap reads as a progression, which three near-identical arcs did not.
  const sweeps = [
    { startDeg: 0, endDeg: 90 },
    { startDeg: 100, endDeg: 280 },
    // Wraps past 360 rather than running backwards from 200 to 110.
    { startDeg: 200, endDeg: 470 },
  ];

  sweeps.forEach((s, i) => {
    els.push(...arc(f, {
      cx: i * PITCH + R,
      cy: R,
      r: R,
      startDeg: s.startDeg,
      endDeg: s.endDeg,
      stroke: color.ink,
      strokeWidth: stroke.outline,
    }));
  });

  const totalW = (sweeps.length - 1) * PITCH + R * 2;
  els.push(...label(f, {
    x: totalW / 2,
    y: R * 2 + 16,
    text: "Loading...",
    fontSize: size.fontSm,
    stroke: color.mutedText,
    align: "center",
  }));

  return variants([{ name: "default", elements: els }]);
}
