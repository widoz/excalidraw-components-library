import { estimateTextWidth, Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, font, inkBox, label, size } from "../comic.js";

const H = 38;
const GAP = 16;
const PAD = 18;

/** Row of four badges: default, secondary, outline, dark. */
export default function badge(theme: Theme): ExcalidrawElement[] {
  const f = new Factory("badge", theme);
  const els: ExcalidrawElement[] = [];

  const variants = [
    { text: "New", fill: color.accent, ink: color.accentText },
    { text: "Beta", fill: color.muted, ink: color.ink },
    { text: "Draft", fill: color.transparent, ink: color.ink },
    { text: "Hot", fill: color.ink, ink: color.accentText },
  ];

  let x = 0;
  for (const v of variants) {
    const w = estimateTextWidth(v.text, size.fontSm) + PAD * 2;
    els.push(...inkBox(f, { x, y: 0, w, h: H, fill: v.fill, shadow: false }));
    els.push(...label(f, {
      x: x + w / 2,
      y: (H - size.fontSm * 1.25) / 2,
      text: v.text,
      fontSize: size.fontSm,
      fontFamily: font.heading,
      stroke: v.ink,
      align: "center",
    }));
    x += w + GAP;
  }

  return els;
}
