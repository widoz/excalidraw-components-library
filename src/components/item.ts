import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { chevron, color, font, inkBox, inkCircle, label, size } from "../style.js";
import { variants, type ComponentOutput } from "../variants.js";

const W = 340;
const H = 76;
const PAD = 18;
const ICON_R = 22;
const CHEVRON_S = 10;

/** A single list row: leading icon, stacked title/subtitle, trailing chevron. */
export default function item(theme: Theme): ComponentOutput {
  const f = new Factory("item", theme);
  const els: ExcalidrawElement[] = [];

  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: H }));

  const cx = PAD + ICON_R;
  const cy = H / 2;
  els.push(...inkCircle(f, { cx, cy, r: ICON_R, fill: color.muted, shadow: false }));
  els.push(...label(f, {
    x: cx,
    y: cy - (size.fontMd * 1.25) / 2,
    text: "★",
    fontSize: size.fontMd,
    fontFamily: font.heading,
    align: "center",
  }));

  const textX = cx + ICON_R + 16;
  els.push(...label(f, {
    x: textX,
    y: 18,
    text: "Sketch Kit",
    fontSize: size.fontMd,
    fontFamily: font.heading,
  }));
  els.push(...label(f, {
    x: textX,
    y: 18 + size.fontMd * 1.25 + 4,
    text: "20 components",
    fontSize: size.fontSm,
    stroke: color.mutedText,
  }));

  els.push(...chevron(f, {
    x: W - PAD - CHEVRON_S * 0.7,
    y: cy - CHEVRON_S,
    s: CHEVRON_S,
    dir: "right",
  }));

  return variants([{ name: "default", elements: els }]);
}
