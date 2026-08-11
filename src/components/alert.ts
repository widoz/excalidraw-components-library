import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { burst, color, font, inkBox, label, size } from "../style.js";
import { variants, type ComponentOutput } from "../variants.js";

const W = 380;
const H = 120;

/** Icon slot with an ink burst behind it, plus a title and body. */
export default function alert(theme: Theme): ComponentOutput {
  const f = new Factory("alert", theme);
  const els: ExcalidrawElement[] = [];

  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: H, fill: color.surface }));

  // Burst sits behind the "!" glyph.
  els.push(...burst(f, { cx: 52, cy: H / 2, r: 30, fill: color.muted }));
  els.push(...label(f, {
    x: 52,
    y: H / 2 - (size.fontLg * 1.25) / 2,
    text: "!",
    fontSize: size.fontLg,
    fontFamily: font.heading,
    align: "center",
  }));

  els.push(...label(f, {
    x: 100,
    y: 28,
    text: "Heads up!",
    fontSize: size.fontMd,
    fontFamily: font.heading,
  }));
  els.push(...label(f, {
    x: 100,
    y: 62,
    text: "Your drawing was not saved.",
    fontSize: size.fontSm,
    stroke: color.mutedText,
  }));

  return variants([{ name: "default", elements: els }]);
}
