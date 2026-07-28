import { Factory, type ExcalidrawElement } from "../element.js";
import { color, font, inkBox, label, size } from "../comic.js";

const TAB_W = 120;
const TAB_H = 48;
const W = TAB_W * 3;
const PANEL_H = 150;

/** Three tab headers with the first active, plus the panel below. */
export default function tabs(): ExcalidrawElement[] {
  const f = new Factory("tabs");
  const els: ExcalidrawElement[] = [];

  // Panel first, so the active tab's outline overlaps it.
  const panelY = TAB_H;
  els.push(...inkBox(f, { x: 0, y: panelY, w: W, h: PANEL_H }));

  const titles = ["Preview", "Code", "Notes"];
  titles.forEach((title, i) => {
    const active = i === 0;
    const x = i * TAB_W;
    els.push(f.rect({
      x,
      y: 0,
      w: TAB_W,
      h: TAB_H,
      fill: active ? color.accent : color.muted,
    }));
    els.push(...label(f, {
      x: x + TAB_W / 2,
      y: (TAB_H - size.fontSm * 1.25) / 2,
      text: title,
      fontSize: size.fontSm,
      fontFamily: font.comic,
      stroke: active ? color.accentText : color.mutedText,
      align: "center",
    }));
  });

  els.push(...label(f, {
    x: 24,
    y: panelY + 32,
    text: "Panel content lives here.",
    fontSize: size.fontSm,
    stroke: color.mutedText,
  }));

  return els;
}
