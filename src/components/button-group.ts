import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, font, label, size, stroke, style } from "../style.js";
import { variants, type ComponentOutput } from "../variants.js";

const CELL_W = 110;
const CELL_H = 56;
const W = CELL_W * 3;

/** Three square-cornered buttons joined edge to edge, sharing one hard shadow. */
export default function buttonGroup(theme: Theme): ComponentOutput {
  const f = new Factory("button-group", theme);
  const els: ExcalidrawElement[] = [];

  // One shadow behind the whole group, not one per cell — the seams must stay clean.
  els.push(f.rect({
    x: style.shadowOffset,
    y: style.shadowOffset,
    w: W,
    h: CELL_H,
    fill: color.ink,
    stroke: color.ink,
    strokeWidth: stroke.shadow,
    rounded: false,
  }));

  const buttons = [
    { text: "Day", pressed: false },
    { text: "Week", pressed: true },
    { text: "Month", pressed: false },
  ];

  buttons.forEach((b, i) => {
    const x = i * CELL_W;
    els.push(f.rect({
      x,
      y: 0,
      w: CELL_W,
      h: CELL_H,
      fill: b.pressed ? color.accent : color.surface,
      rounded: false,
    }));
    els.push(...label(f, {
      x: x + CELL_W / 2,
      y: (CELL_H - size.fontMd * 1.25) / 2,
      text: b.text,
      fontSize: size.fontMd,
      fontFamily: font.heading,
      stroke: b.pressed ? color.accentText : color.ink,
      align: "center",
    }));
  });

  return variants([{ name: "default", elements: els }]);
}
