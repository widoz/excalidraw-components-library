import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, font, inkBox, label, size, stroke, xMark } from "../style.js";
import { variants, type ComponentOutput } from "../variants.js";

const W = 360;
const H = 110;
const BTN_W = 80;
const BTN_H = 40;

/** A floating save-confirmation toast: heavier shadow, dismiss X, and an undo button. */
export default function toast(theme: Theme): ComponentOutput {
  const f = new Factory("toast", theme);
  const els: ExcalidrawElement[] = [];

  // inkBox always offsets its shadow by the default 6px, but a toast needs to read as
  // floating well above the page, so its shadow is drawn by hand at +10, +10 instead.
  els.push(f.rect({ x: 10, y: 10, w: W, h: H, fill: color.ink, stroke: color.ink, strokeWidth: stroke.shadow }));
  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: H, shadow: false }));

  els.push(...label(f, {
    x: 24,
    y: 20,
    text: "Drawing saved",
    fontSize: size.fontMd,
    fontFamily: font.heading,
  }));
  els.push(...label(f, {
    x: 24,
    y: 20 + size.fontMd * 1.25 + 8,
    text: "Your changes are on disk.",
    fontSize: size.fontSm,
    stroke: color.mutedText,
  }));

  els.push(...xMark(f, { x: W - 40, y: 16, s: 16, strokeWidth: stroke.hairline }));

  const btnX = W - BTN_W - 20;
  const btnY = (H - BTN_H) / 2;
  els.push(...inkBox(f, { x: btnX, y: btnY, w: BTN_W, h: BTN_H, fill: color.surface }));
  els.push(...label(f, {
    x: btnX + BTN_W / 2,
    y: btnY + (BTN_H - size.fontSm * 1.25) / 2,
    text: "Undo",
    fontSize: size.fontSm,
    fontFamily: font.heading,
    align: "center",
  }));

  return variants([{ name: "default", elements: els }]);
}
