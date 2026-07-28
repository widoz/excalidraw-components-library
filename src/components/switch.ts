import { Factory, type ExcalidrawElement } from "../element.js";
import { color, inkBox, inkCircle, label, size } from "../comic.js";

const TRACK_W = 88;
const TRACK_H = 44;
const KNOB_R = 15;
const ROW = 72;

/** Two switches: off (knob left, muted track) and on (knob right, accent track). */
export default function switchComponent(): ExcalidrawElement[] {
  const f = new Factory("switch");
  const els: ExcalidrawElement[] = [];

  const rows = [
    { text: "Notifications", on: false },
    { text: "Sloppy mode", on: true },
  ];

  rows.forEach((row, i) => {
    const y = i * ROW;
    els.push(...inkBox(f, {
      x: 0,
      y,
      w: TRACK_W,
      h: TRACK_H,
      fill: row.on ? color.accent : color.muted,
    }));
    const cx = row.on ? TRACK_W - KNOB_R - 7 : KNOB_R + 7;
    els.push(...inkCircle(f, { cx, cy: y + TRACK_H / 2, r: KNOB_R, shadow: false }));
    els.push(...label(f, {
      x: TRACK_W + 24,
      y: y + (TRACK_H - size.fontMd * 1.25) / 2,
      text: row.text,
      fontSize: size.fontMd,
    }));
  });

  return els;
}
