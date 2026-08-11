import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, font, inkBox, label, rule, size } from "../style.js";
import { variants, type ComponentOutput } from "../variants.js";

const W = 340;
const H = 230;

/** Title, description lines, and a footer button. */
export default function card(theme: Theme): ComponentOutput {
  const f = new Factory("card", theme);
  const els: ExcalidrawElement[] = [];

  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: H }));

  els.push(...label(f, {
    x: 24,
    y: 24,
    text: "Sketch Kit",
    fontSize: size.fontLg,
    fontFamily: font.heading,
  }));
  els.push(...label(f, {
    x: 24,
    y: 66,
    text: "Hand-drawn UI parts",
    fontSize: size.fontSm,
    stroke: color.mutedText,
  }));

  // Two ruled lines standing in for body copy.
  els.push(...rule(f, { x: 24, y: 108, w: W - 48, stroke: color.muted }));
  els.push(...rule(f, { x: 24, y: 130, w: W - 110, stroke: color.muted }));

  // Footer button.
  const btnW = 120;
  const btnH = 48;
  const btnY = H - btnH - 24;
  els.push(...inkBox(f, { x: 24, y: btnY, w: btnW, h: btnH, fill: color.accent }));
  els.push(...label(f, {
    x: 24 + btnW / 2,
    y: btnY + (btnH - size.fontSm * 1.25) / 2,
    text: "Get it",
    fontSize: size.fontSm,
    fontFamily: font.heading,
    stroke: color.accentText,
    align: "center",
  }));

  return variants([{ name: "default", elements: els }]);
}
