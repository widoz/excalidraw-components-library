import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { burst, color, font, inkBox, label, size } from "../comic.js";

const W = 340;
const H = 260;
const BTN_W = 150;
const BTN_H = 48;

/** A dashed empty-state frame: burst glyph, title, body copy and a call-to-action. */
export default function empty(theme: Theme): ExcalidrawElement[] {
  const f = new Factory("empty", theme);
  const els: ExcalidrawElement[] = [];

  // Dashed placeholder frame: no shadow, a solid hard shadow behind a dashed
  // outline reads badly (see aspect-ratio.ts).
  els.push(...inkBox(f, {
    x: 0,
    y: 0,
    w: W,
    h: H,
    fill: color.transparent,
    strokeStyle: "dashed",
    shadow: false,
  }));

  const cx = W / 2;
  const burstCy = 88;
  els.push(...burst(f, { cx, cy: burstCy, r: 34, fill: color.muted }));
  els.push(...label(f, {
    x: cx,
    y: burstCy - (size.fontLg * 1.25) / 2,
    text: "?",
    fontSize: size.fontLg,
    fontFamily: font.heading,
    align: "center",
  }));

  els.push(...label(f, {
    x: cx,
    y: 142,
    text: "Nothing here yet",
    fontSize: size.fontMd,
    fontFamily: font.heading,
    align: "center",
  }));
  els.push(...label(f, {
    x: cx,
    y: 176,
    text: "Draw something to get started.",
    fontSize: size.fontSm,
    stroke: color.mutedText,
    align: "center",
  }));

  const btnX = cx - BTN_W / 2;
  const btnY = 204;
  els.push(...inkBox(f, { x: btnX, y: btnY, w: BTN_W, h: BTN_H, fill: color.accent }));
  els.push(...label(f, {
    x: cx,
    y: btnY + (BTN_H - size.fontSm * 1.25) / 2,
    text: "New drawing",
    fontSize: size.fontSm,
    fontFamily: font.heading,
    stroke: color.accentText,
    align: "center",
  }));

  return els;
}
