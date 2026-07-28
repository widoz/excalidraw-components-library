import { Factory, type ExcalidrawElement } from "../element.js";
import { burst, color, font, inkBox, label, size } from "../comic.js";

const W = 380;
const H = 120;

/** Icon slot with a comic burst behind it, plus a title and body. */
export default function alert(): ExcalidrawElement[] {
  const f = new Factory("alert");
  const els: ExcalidrawElement[] = [];

  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: H, fill: color.surface }));

  // Burst sits behind the "!" glyph.
  els.push(...burst(f, { cx: 52, cy: H / 2, r: 30, spikes: 10, fill: color.muted }));
  els.push(...label(f, {
    x: 52,
    y: H / 2 - (size.fontLg * 1.25) / 2,
    text: "!",
    fontSize: size.fontLg,
    fontFamily: font.comic,
    align: "center",
  }));

  els.push(...label(f, {
    x: 100,
    y: 28,
    text: "Heads up!",
    fontSize: size.fontMd,
    fontFamily: font.comic,
  }));
  els.push(...label(f, {
    x: 100,
    y: 62,
    text: "Your drawing was not saved.",
    fontSize: size.fontSm,
    stroke: color.mutedText,
  }));

  return els;
}
