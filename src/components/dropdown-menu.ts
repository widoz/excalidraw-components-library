import { Factory, type ExcalidrawElement } from "../element.js";
import { color, font, inkBox, label, rule, size } from "../comic.js";

const W = 260;
const TRIGGER_W = 150;
const TRIGGER_H = 52;
const ITEM_H = 46;

/** Trigger plus an open menu: four items, one hovered, one separator before the last. */
export default function dropdownMenu(): ExcalidrawElement[] {
  const f = new Factory("dropdown-menu");
  const els: ExcalidrawElement[] = [];

  els.push(...inkBox(f, { x: 0, y: 0, w: TRIGGER_W, h: TRIGGER_H }));
  els.push(...label(f, {
    x: TRIGGER_W / 2,
    y: (TRIGGER_H - size.fontMd * 1.25) / 2,
    text: "Actions",
    fontSize: size.fontMd,
    fontFamily: font.comic,
    align: "center",
  }));

  const items = [
    { text: "Edit", hovered: false },
    { text: "Duplicate", hovered: true },
    { text: "Share", hovered: false },
    { text: "Delete", hovered: false, danger: true },
  ];

  const menuY = TRIGGER_H + 22;
  // Room for four rows, 16px of padding and a separator gap.
  const menuH = items.length * ITEM_H + 16 + 12;
  els.push(...inkBox(f, { x: 0, y: menuY, w: W, h: menuH }));

  items.forEach((item, i) => {
    // The last item sits below the separator, so it gets pushed down.
    const y = menuY + 8 + i * ITEM_H + (i === items.length - 1 ? 12 : 0);
    if (i === items.length - 1) {
      els.push(...rule(f, { x: 12, y: y - 6, w: W - 24, stroke: color.border }));
    }
    if (item.hovered) {
      els.push(f.rect({ x: 8, y, w: W - 16, h: ITEM_H, fill: color.muted }));
    }
    els.push(...label(f, {
      x: 22,
      y: y + (ITEM_H - size.fontSm * 1.25) / 2,
      text: item.text,
      fontSize: size.fontSm,
      stroke: item.danger ? color.mutedText : color.ink,
    }));
  });

  return els;
}
