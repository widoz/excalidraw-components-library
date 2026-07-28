import { Factory, type ExcalidrawElement } from "../element.js";
import { color, font, inkBox, label, rule, size, xMark } from "../comic.js";

const W = 420;
const H = 250;
const BTN_W = 130;
const BTN_H = 50;

/** Comic panel frame: title, body lines, close X, and two footer buttons. */
export default function dialog(): ExcalidrawElement[] {
  const f = new Factory("dialog");
  const els: ExcalidrawElement[] = [];

  // Sharp corners read as a comic panel rather than a soft modal.
  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: H, rounded: false }));
  // Inner panel line, the classic comic double frame.
  els.push(f.rect({
    x: 10,
    y: 10,
    w: W - 20,
    h: H - 20,
    fill: color.transparent,
    strokeWidth: 2,
    rounded: false,
  }));

  els.push(...label(f, {
    x: 30,
    y: 30,
    text: "Delete drawing?",
    fontSize: size.fontLg,
    fontFamily: font.comic,
  }));

  els.push(...rule(f, { x: 30, y: 92, w: W - 120, stroke: color.muted }));
  els.push(...rule(f, { x: 30, y: 116, w: W - 200, stroke: color.muted }));

  els.push(...xMark(f, { x: W - 44, y: 26, s: 18 }));

  const btnY = H - BTN_H - 26;
  const buttons = [
    { text: "Cancel", x: W - BTN_W * 2 - 44, fill: color.surface, ink: color.ink },
    { text: "Delete", x: W - BTN_W - 30, fill: color.accent, ink: color.accentText },
  ];
  for (const b of buttons) {
    els.push(...inkBox(f, { x: b.x, y: btnY, w: BTN_W, h: BTN_H, fill: b.fill }));
    els.push(...label(f, {
      x: b.x + BTN_W / 2,
      y: btnY + (BTN_H - size.fontSm * 1.25) / 2,
      text: b.text,
      fontSize: size.fontSm,
      fontFamily: font.comic,
      stroke: b.ink,
      align: "center",
    }));
  }

  return els;
}
