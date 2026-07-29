import { Factory, estimateTextWidth, type ExcalidrawElement } from "../element.js";
import { color, fillBand, font, inkBox, label, rule, size } from "../comic.js";

const W = 420;
const BAR_H = 52;
const PITCH = 100;
const PAD_X = 20;
const ITEM_H = 40;
const MENU_W = 200;
/** Symmetric breathing room around the open title's label. */
const BAND_PAD_X = 12;

/** A menu bar with four titles; "Edit" is open below it. */
export default function menubar(): ExcalidrawElement[] {
  const f = new Factory("menubar");
  const els: ExcalidrawElement[] = [];

  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: BAR_H, rounded: false }));

  const titles = ["File", "Edit", "View", "Help"];
  const bandH = 36;
  let editX = 0;
  titles.forEach((title, i) => {
    const x = PAD_X + i * PITCH;
    if (title === "Edit") {
      editX = x;
      // The band is sized off the label's measured advance width plus symmetric
      // padding, so it cannot overhang the title it highlights.
      // Band paints before the label, or it would cover the title.
      els.push(...fillBand(f, {
        x: x - BAND_PAD_X,
        y: (BAR_H - bandH) / 2,
        w: estimateTextWidth(title, size.fontMd) + BAND_PAD_X * 2,
        h: bandH,
        fill: color.muted,
        rounded: false,
      }));
    }
    els.push(...label(f, {
      x,
      y: (BAR_H - size.fontMd * 1.25) / 2,
      text: title,
      fontSize: size.fontMd,
      fontFamily: font.comic,
    }));
  });

  // The open menu hangs from Edit's highlighted band, so it shares the band's left edge.
  const menuX = editX - BAND_PAD_X;
  const menuY = BAR_H + 16;
  const items = ["Undo", "Redo", "Preferences"];
  // 3 rows, 16px padding top/bottom, plus a 12px separator gap before the last row.
  const menuH = items.length * ITEM_H + 16 + 12;
  els.push(...inkBox(f, { x: menuX, y: menuY, w: MENU_W, h: menuH }));

  items.forEach((text, i) => {
    const y = menuY + 8 + i * ITEM_H + (i === items.length - 1 ? 12 : 0);
    if (i === items.length - 1) {
      els.push(...rule(f, { x: menuX + 12, y: y - 6, w: MENU_W - 24, stroke: color.border }));
    }
    els.push(...label(f, {
      x: menuX + 22,
      y: y + (ITEM_H - size.fontSm * 1.25) / 2,
      text,
      fontSize: size.fontSm,
    }));
  });

  return els;
}
