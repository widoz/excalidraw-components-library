import { Factory } from "../element.js";
import type { Theme } from "../theme.js";
import { color, inkBox, inkCircle, label, size } from "../comic.js";
import { variants, type ComponentOutput } from "../variants.js";

const TRACK_W = 88;
const TRACK_H = 44;
const KNOB_R = 15;
const ROW = 72;

/** Two switches: off (knob left, muted track) and on (knob right, accent track). */
export default function switchComponent(theme: Theme): ComponentOutput {
  const f = new Factory("switch", theme);

  const specs = [
    { name: "off", text: "Notifications", on: false },
    { name: "on", text: "Sloppy mode", on: true },
  ];

  return variants(specs.map((row, i) => {
    const y = i * ROW;
    const cx = row.on ? TRACK_W - KNOB_R - 7 : KNOB_R + 7;
    return {
      name: row.name,
      elements: [
        ...inkBox(f, {
          x: 0,
          y,
          w: TRACK_W,
          h: TRACK_H,
          fill: row.on ? color.accent : color.muted,
        }),
        ...inkCircle(f, { cx, cy: y + TRACK_H / 2, r: KNOB_R, shadow: false }),
        ...label(f, {
          x: TRACK_W + 24,
          y: y + (TRACK_H - size.fontMd * 1.25) / 2,
          text: row.text,
          fontSize: size.fontMd,
        }),
      ],
    };
  }));
}
