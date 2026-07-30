import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, fillBand, font, inkBox, label, rule, size } from "../comic.js";

const W = 380;
const ROW_H = 50;
const COL_X = [20, 200];
/**
 * Inner bands and rules sit this far in from the frame. The frame is rounded, and
 * Excalidraw's adaptive corner radius is min(w, h) * 0.25 capped at 32 — 32 here.
 * A square band's corner at (d, d) is inside that arc only while d >= 32 - 32/sqrt(2)
 * = 9.37, so 10 is the smallest tidy inset that cannot poke through the frame.
 */
const INSET = 10;

/** Header row plus three body rows with alternating stripes. */
export default function table(theme: Theme): ExcalidrawElement[] {
  const f = new Factory("table", theme);
  const els: ExcalidrawElement[] = [];

  const rows = [
    ["Ada", "Engineer"],
    ["Grace", "Admiral"],
    ["Alan", "Theorist"],
  ];
  const H = ROW_H * (rows.length + 1);

  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: H }));

  // Header band: square, so no adaptive-radius mismatch with the rounded frame is
  // possible. Its bottom edge lands exactly on the first rule.
  els.push(...fillBand(f, {
    x: INSET,
    y: INSET,
    w: W - INSET * 2,
    h: ROW_H - INSET,
    fill: color.muted,
    rounded: false,
  }));
  ["Name", "Role"].forEach((text, c) => {
    els.push(...label(f, {
      x: COL_X[c]!,
      y: (ROW_H - size.fontSm * 1.25) / 2,
      text,
      fontSize: size.fontSm,
      fontFamily: font.heading,
    }));
  });

  rows.forEach((row, r) => {
    const y = ROW_H * (r + 1);
    // Stripe every other body row.
    if (r % 2 === 1) {
      els.push(...fillBand(f, {
        x: INSET,
        y,
        w: W - INSET * 2,
        h: ROW_H,
        fill: color.muted,
        rounded: false,
        opacity: 60,
      }));
    }
    els.push(...rule(f, { x: INSET, y, w: W - INSET * 2, stroke: color.border }));
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
