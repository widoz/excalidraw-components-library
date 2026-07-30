import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { burst, color, font, inkBox, label, rule, size, stroke } from "../comic.js";

const W = 420;
const H = 250;
const BTN_W = 130;
const BTN_H = 50;

/** Comic panel frame that forces a choice: no close X, two footer buttons. */
export default function alertDialog(theme: Theme): ExcalidrawElement[] {
  const f = new Factory("alert-dialog", theme);
  const els: ExcalidrawElement[] = [];

  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: H, rounded: false }));
  els.push(f.rect({
    x: 10,
    y: 10,
    w: W - 20,
    h: H - 20,
    fill: color.transparent,
    strokeWidth: stroke.hairline,
    rounded: false,
  }));

  els.push(...burst(f, { cx: 46, cy: 44, r: 24, fill: color.muted }));
  els.push(...label(f, {
    x: 46,
    y: 44 - (size.fontMd * 1.25) / 2,
    text: "!",
    fontSize: size.fontMd,
    fontFamily: font.heading,
    align: "center",
  }));

  els.push(...label(f, {
    x: 84,
    y: 30,
    text: "Delete everything?",
    fontSize: size.fontLg,
    fontFamily: font.heading,
  }));

  els.push(...rule(f, { x: 30, y: 92, w: W - 120, stroke: color.muted }));
  els.push(...rule(f, { x: 30, y: 116, w: W - 200, stroke: color.muted }));

  const btnY = H - BTN_H - 26;
  const buttons = [
    { text: "Cancel", x: W - BTN_W * 2 - 44, fill: color.surface, ink: color.ink },
    { text: "Yes, delete", x: W - BTN_W - 30, fill: color.accent, ink: color.accentText },
  ];
  for (const b of buttons) {
    els.push(...inkBox(f, { x: b.x, y: btnY, w: BTN_W, h: BTN_H, fill: b.fill }));
    els.push(...label(f, {
      x: b.x + BTN_W / 2,
      y: btnY + (BTN_H - size.fontSm * 1.25) / 2,
      text: b.text,
      fontSize: size.fontSm,
      fontFamily: font.heading,
      stroke: b.ink,
      align: "center",
    }));
  }

  return els;
}
