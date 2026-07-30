import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { chevron, color, font, inkBox, label, size } from "../comic.js";

const CELL = 48;
const GAP = 12;
const ACTIVE = 2;
const ICON_S = 8;
/** A "left"/"right" chevron of size s is s * 0.7 wide. */
const ICON_W = ICON_S * 0.7;
/** Space between a chevron and the nearest page cell, the same on both sides. */
const ICON_GAP = 18;

/** Prev arrow, pages 1-5 with page 2 active, next arrow. */
export default function pagination(theme: Theme): ExcalidrawElement[] {
  const f = new Factory("pagination", theme);
  const els: ExcalidrawElement[] = [];

  const pages = [1, 2, 3, 4, 5];
  const startX = CELL + GAP;

  // Prev chevron: points left, since it moves you backward through the pages.
  els.push(...chevron(f, {
    x: startX - ICON_GAP - ICON_W,
    y: CELL / 2 - 8,
    s: ICON_S,
    dir: "left",
    stroke: color.mutedText,
  }));

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
      fontFamily: font.heading,
      stroke: active ? color.accentText : color.ink,
      align: "center",
    }));
  });

  // Next chevron, the same distance from the last cell as the prev one is from the first.
  const lastCellEnd = startX + (pages.length - 1) * (CELL + GAP) + CELL;
  els.push(...chevron(f, {
    x: lastCellEnd + ICON_GAP,
    y: CELL / 2 - 8,
    s: ICON_S,
    dir: "right",
    stroke: color.mutedText,
  }));

  return els;
}
