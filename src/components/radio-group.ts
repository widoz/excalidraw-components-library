import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, inkCircle, label, size } from "../style.js";
import { variants, type ComponentOutput } from "../variants.js";

const R = 18;
const ROW = 56;

/** Three stacked radios, the second one selected. */
export default function radioGroup(theme: Theme): ComponentOutput {
  const f = new Factory("radio-group", theme);
  const els: ExcalidrawElement[] = [];

  const rows = [
    { text: "Pencil", selected: false },
    { text: "Ink pen", selected: true },
    { text: "Marker", selected: false },
  ];

  rows.forEach((row, i) => {
    const cy = R + i * ROW;
    els.push(...inkCircle(f, { cx: R, cy, r: R }));
    if (row.selected) {
      els.push(f.ellipse({ x: R - 8, y: cy - 8, w: 16, h: 16, fill: color.accent }));
    }
    els.push(...label(f, {
      x: R * 2 + 22,
      y: cy - (size.fontMd * 1.25) / 2,
      text: row.text,
      fontSize: size.fontMd,
    }));
  });

  return variants([{ name: "default", elements: els }]);
}
