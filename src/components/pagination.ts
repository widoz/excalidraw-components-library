import { Factory, type ExcalidrawElement } from "../element.js";
import { chevron, color, font, inkBox, label, size } from "../comic.js";

const CELL = 48;
const GAP = 12;
const ACTIVE = 2;

/** Prev arrow, pages 1-5 with page 2 active, next arrow. */
export default function pagination(): ExcalidrawElement[] {
  const f = new Factory("pagination");
  const els: ExcalidrawElement[] = [];

  const pages = [1, 2, 3, 4, 5];
  const startX = CELL + GAP;

  // Prev chevron: points left, since it moves you backward through the pages.
  els.push(...chevron(f, { x: 14, y: CELL / 2 - 8, s: 8, dir: "left", stroke: color.mutedText }));

  pages.forEach((page, i) => {
    const x = startX + i * (CELL + GAP);
    const active = page === ACTIVE;
    els.push(...inkBox(f, {
      x,
      y: 0,
      w: CELL,
      h: CELL,
      fill: active ? color.accent : color.surface,
      shadow: active,
    }));
    els.push(...label(f, {
      x: x + CELL / 2,
      y: (CELL - size.fontSm * 1.25) / 2,
      text: String(page),
      fontSize: size.fontSm,
      fontFamily: font.comic,
      stroke: active ? color.accentText : color.ink,
      align: "center",
    }));
  });

  // Next chevron.
  const endX = startX + pages.length * (CELL + GAP) + 6;
  els.push(...chevron(f, { x: endX, y: CELL / 2 - 8, s: 8, dir: "right", stroke: color.mutedText }));

  return els;
}
