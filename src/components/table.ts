import { Factory, type ExcalidrawElement } from "../element.js";
import { color, font, inkBox, label, rule, size } from "../comic.js";

const W = 380;
const ROW_H = 50;
const COL_X = [20, 200];

/** Header row plus three body rows with alternating stripes. */
export default function table(): ExcalidrawElement[] {
  const f = new Factory("table");
  const els: ExcalidrawElement[] = [];

  const rows = [
    ["Ada", "Engineer"],
    ["Grace", "Admiral"],
    ["Alan", "Theorist"],
  ];
  const H = ROW_H * (rows.length + 1);

  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: H }));

  // Header band, inset so it stays inside the ink outline and follows its rounded corners.
  els.push(f.rect({ x: 5, y: 5, w: W - 10, h: ROW_H - 5, fill: color.muted, rounded: true }));
  ["Name", "Role"].forEach((text, c) => {
    els.push(...label(f, {
      x: COL_X[c]!,
      y: (ROW_H - size.fontSm * 1.25) / 2,
      text,
      fontSize: size.fontSm,
      fontFamily: font.comic,
    }));
  });

  rows.forEach((row, r) => {
    const y = ROW_H * (r + 1);
    // Stripe every other body row.
    if (r % 2 === 1) {
      els.push(f.rect({ x: 5, y, w: W - 10, h: ROW_H, fill: color.muted, rounded: false, opacity: 60 }));
    }
    els.push(...rule(f, { x: 5, y, w: W - 10, stroke: color.border }));
    row.forEach((cell, c) => {
      els.push(...label(f, {
        x: COL_X[c]!,
        y: y + (ROW_H - size.fontSm * 1.25) / 2,
        text: cell,
        fontSize: size.fontSm,
      }));
    });
  });

  return els;
}
