import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, font, inkBox, label, size } from "../comic.js";

const W = 200;
const H = 56;
const GAP = 28;

/** Three buttons: default (accent), secondary (surface), disabled (muted, flat). */
export default function button(theme: Theme): ExcalidrawElement[] {
  const f = new Factory("button", theme);
  const els: ExcalidrawElement[] = [];

  const variants = [
    { text: "Click me!", fill: color.accent, ink: color.accentText, shadow: true },
    { text: "Secondary", fill: color.surface, ink: color.ink, shadow: true },
    { text: "Disabled", fill: color.muted, ink: color.mutedText, shadow: false },
  ];

  variants.forEach((v, i) => {
    const y = i * (H + GAP);
    els.push(...inkBox(f, { x: 0, y, w: W, h: H, fill: v.fill, shadow: v.shadow }));
    els.push(...label(f, {
      x: W / 2,
      y: y + (H - size.fontMd * 1.25) / 2,
      text: v.text,
      fontSize: size.fontMd,
      fontFamily: font.heading,
      stroke: v.ink,
      align: "center",
    }));
  });

  return els;
}
