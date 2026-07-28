import { Factory, type ExcalidrawElement } from "../element.js";
import { checkMark, color, inkBox, label, size } from "../comic.js";

const BOX = 34;
const ROW = 56;

/** Three stacked checkboxes: checked, unchecked, checked. */
export default function checkboxGroup(): ExcalidrawElement[] {
  const f = new Factory("checkbox-group");
  const els: ExcalidrawElement[] = [];

  const rows = [
    { text: "Ship it", checked: true },
    { text: "Sleep on it", checked: false },
    { text: "Draw it first", checked: true },
  ];

  rows.forEach((row, i) => {
    const y = i * ROW;
    els.push(...inkBox(f, {
      x: 0,
      y,
      w: BOX,
      h: BOX,
      fill: row.checked ? color.accent : color.surface,
    }));
    if (row.checked) {
      els.push(...checkMark(f, { x: 8, y: y + 9, s: 18, stroke: color.accentText }));
    }
    els.push(...label(f, {
      x: BOX + 22,
      y: y + (BOX - size.fontMd * 1.25) / 2,
      text: row.text,
      fontSize: size.fontMd,
    }));
  });

  return els;
}
