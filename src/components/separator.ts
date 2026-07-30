import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, font, label, rule, size, stroke } from "../comic.js";

const W = 320;

/** Two demonstrations: a titled section divided by a horizontal rule, and words divided by vertical rules. */
export default function separator(theme: Theme): ExcalidrawElement[] {
  const f = new Factory("separator", theme);
  const els: ExcalidrawElement[] = [];

  els.push(...label(f, {
    x: 0,
    y: 0,
    text: "Radix Primitives",
    fontSize: size.fontLg,
    fontFamily: font.comic,
  }));
  els.push(...label(f, {
    x: 0,
    y: 42,
    text: "An open-source UI component library.",
    fontSize: size.fontSm,
    stroke: color.mutedText,
  }));
  els.push(...rule(f, { x: 0, y: 74, w: W, stroke: color.ink, strokeWidth: stroke.outline }));

  const wordY = 110;
  const words = ["Blog", "Docs", "Source"];
  words.forEach((text, i) => {
    els.push(...label(f, { x: i * 90, y: wordY, text, fontSize: size.fontSm }));
  });

  // Vertical dividers between the words. rule() only emits horizontal lines, so
  // these go through f.line directly, centred between each pair of words.
  const lineH = 28;
  const lineY = wordY + (size.fontSm * 1.25 - lineH) / 2;
  for (const x of [60, 150]) {
    els.push(f.line({
      x,
      y: lineY,
      points: [[0, 0], [0, lineH]],
      stroke: color.border,
      strokeWidth: stroke.hairline,
    }));
  }

  return els;
}
