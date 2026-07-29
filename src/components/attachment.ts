import { Factory, type ExcalidrawElement } from "../element.js";
import { color, fillBand, font, inkBox, label, size, xMark } from "../comic.js";

const W = 300;
const H = 72;
const BAND_X = 16;
const BAND_Y = 12;
const BAND_W = 40;
const BAND_H = 48;
const FOLD = 14;

/** A file chip: a folded-corner thumbnail, filename, size, and a remove X. */
export default function attachment(): ExcalidrawElement[] {
  const f = new Factory("attachment");
  const els: ExcalidrawElement[] = [];

  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: H }));

  els.push(...fillBand(f, { x: BAND_X, y: BAND_Y, w: BAND_W, h: BAND_H, fill: color.muted, rounded: false }));

  // Folded corner: an outer crease and a smaller inner one, top-right of the band.
  const cornerX = BAND_X + BAND_W;
  els.push(f.line({
    x: cornerX - FOLD,
    y: BAND_Y,
    points: [[0, 0], [FOLD, FOLD]],
    stroke: color.ink,
    strokeWidth: 2,
  }));
  els.push(f.line({
    x: cornerX - FOLD + 5,
    y: BAND_Y + 5,
    points: [[0, 0], [FOLD - 5, FOLD - 5]],
    stroke: color.ink,
    strokeWidth: 2,
  }));

  const textX = BAND_X + BAND_W + 16;
  els.push(...label(f, {
    x: textX,
    y: 18,
    text: "sketch-kit.excalidraw",
    fontSize: size.fontSm,
    fontFamily: font.comic,
  }));
  els.push(...label(f, {
    x: textX,
    y: 42,
    text: "48 KB",
    fontSize: size.fontSm,
    stroke: color.mutedText,
  }));

  els.push(...xMark(f, { x: W - 32, y: (H - 16) / 2, s: 16, stroke: color.ink }));

  return els;
}
