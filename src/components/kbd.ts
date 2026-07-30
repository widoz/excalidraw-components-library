import { Factory, estimateTextWidth, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, font, inkBox, label, size } from "../comic.js";

const CAP_H = 52;
// Small default gap: used around the "+" glyph and between the two trailing caps,
// since the brief only pins the 28px gap before "Shift".
const GAP = 12;
const SHIFT_GAP = 28;
const PLUS_FONT = size.fontMd;

const CAP0_W = 56; // "⌘"
const CAP1_W = 56; // "K"
const CAP2_W = 100; // "Shift"
const CAP3_W = 56; // "↵"

/** A row of key caps: "⌘ + K", a gap, then "Shift" and "↵". */
export default function kbd(theme: Theme): ExcalidrawElement[] {
  const f = new Factory("kbd", theme);
  const els: ExcalidrawElement[] = [];

  const plusW = estimateTextWidth("+", PLUS_FONT);
  const cap0X = 0;
  const cap1X = cap0X + CAP0_W + GAP + plusW + GAP;
  const cap2X = cap1X + CAP1_W + SHIFT_GAP;
  const cap3X = cap2X + CAP2_W + GAP;

  const caps = [
    { x: cap0X, w: CAP0_W, text: "⌘" },
    { x: cap1X, w: CAP1_W, text: "K" },
    { x: cap2X, w: CAP2_W, text: "Shift" },
    { x: cap3X, w: CAP3_W, text: "↵" },
  ];

  for (const cap of caps) {
    els.push(...inkBox(f, { x: cap.x, y: 0, w: cap.w, h: CAP_H, rounded: false }));
    els.push(...label(f, {
      x: cap.x + cap.w / 2,
      y: (CAP_H - size.fontMd * 1.25) / 2,
      text: cap.text,
      fontSize: size.fontMd,
      fontFamily: font.heading,
      align: "center",
    }));
  }

  // "+" sits in the gap between the first two caps, vertically matched to the
  // cap labels' own centring formula.
  els.push(...label(f, {
    x: (cap0X + CAP0_W + cap1X) / 2,
    y: (CAP_H - PLUS_FONT * 1.25) / 2,
    text: "+",
    fontSize: PLUS_FONT,
    stroke: color.mutedText,
    align: "center",
  }));

  return els;
}
