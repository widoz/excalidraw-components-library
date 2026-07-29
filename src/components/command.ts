import { Factory, type ExcalidrawElement } from "../element.js";
import { color, fillBand, font, inkBox, inkCircle, label, rule, size } from "../comic.js";

const W = 340;
const PANEL_H = 300;
const SEARCH_H = 50;
const ITEM_H = 46;
const KEY_W = 34;
const KEY_H = 26;
const ROWS = [
  { text: "New drawing", key: "N", highlighted: true },
  { text: "Open library", key: "L", highlighted: false },
  { text: "Export as PNG", key: "E", highlighted: false },
];

/** Search row with a magnifier glyph, a "Suggestions" heading, and three key-hinted rows. */
export default function command(): ExcalidrawElement[] {
  const f = new Factory("command");
  const els: ExcalidrawElement[] = [];

  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: PANEL_H }));

  // Magnifier: an outline circle with a short 45-degree handle starting exactly on
  // the circle's edge (cos45 == sin45 == r * 0.7071) and extending further out.
  const glassCx = 34;
  const glassCy = SEARCH_H / 2;
  const glassR = 8;
  els.push(...inkCircle(f, { cx: glassCx, cy: glassCy, r: glassR, fill: color.transparent, shadow: false }));
  const k = Math.SQRT1_2;
  const handleLen = 8;
  els.push(f.line({
    x: glassCx + glassR * k,
    y: glassCy + glassR * k,
    points: [[0, 0], [handleLen * k, handleLen * k]],
    stroke: color.ink,
  }));

  els.push(...label(f, {
    x: 54,
    y: (SEARCH_H - size.fontMd * 1.25) / 2,
    text: "Type a command...",
    fontSize: size.fontMd,
    stroke: color.subtle,
  }));
  els.push(...rule(f, { x: 0, y: SEARCH_H, w: W, stroke: color.border }));

  els.push(...label(f, {
    x: 20,
    y: SEARCH_H + 16,
    text: "Suggestions",
    fontSize: size.fontSm,
    stroke: color.mutedText,
  }));

  const rowsY = SEARCH_H + 44;
  ROWS.forEach((row, i) => {
    const y = rowsY + i * ITEM_H;
    if (row.highlighted) {
      els.push(...fillBand(f, { x: 8, y, w: W - 16, h: ITEM_H, fill: color.muted, rounded: false }));
    }
    els.push(...label(f, {
      x: 24,
      y: y + (ITEM_H - size.fontSm * 1.25) / 2,
      text: row.text,
      fontSize: size.fontSm,
    }));

    const keyX = W - 24 - KEY_W;
    const keyY = y + (ITEM_H - KEY_H) / 2;
    els.push(...inkBox(f, { x: keyX, y: keyY, w: KEY_W, h: KEY_H, strokeWidth: 2, shadow: false }));
    els.push(...label(f, {
      x: keyX + KEY_W / 2,
      y: keyY + (KEY_H - size.fontSm * 1.25) / 2,
      text: row.key,
      fontSize: size.fontSm,
      fontFamily: font.comic,
      align: "center",
    }));
  });

  return els;
}
