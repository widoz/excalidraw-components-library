import { Factory, type ExcalidrawElement } from "../element.js";
import { arc, color, label, size } from "../comic.js";

const PITCH = 90;
const R = 26;

/** Three spinners at increasing sweep, suggesting rotation, over a "Loading..." caption. */
export default function spinner(): ExcalidrawElement[] {
  const f = new Factory("spinner");
  const els: ExcalidrawElement[] = [];

  const sweeps = [
    { startDeg: 0, endDeg: 270 },
    { startDeg: 90, endDeg: 330 },
    // Wraps past 360 rather than running backwards from 200 to 100.
    { startDeg: 200, endDeg: 460 },
  ];

  sweeps.forEach((s, i) => {
    els.push(...arc(f, {
      cx: i * PITCH + R,
      cy: R,
      r: R,
      startDeg: s.startDeg,
      endDeg: s.endDeg,
      stroke: color.ink,
      strokeWidth: 4,
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

  return els;
}
