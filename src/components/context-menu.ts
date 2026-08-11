import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, fillBand, font, inkBox, label, rule, size } from "../style.js";
import { variants, type ComponentOutput } from "../variants.js";

const DASH_W = 300;
const DASH_H = 160;
const MENU_W = 220;
const ITEM_H = 44;
const MENU_X = 120;
const MENU_Y = 60;

/**
 * A dashed drop target with an open context menu overlapping its centre and
 * spilling past its bottom-right corner — the menu is drawn last so it paints
 * on top of the dashed area.
 */
export default function contextMenu(theme: Theme): ComponentOutput {
  const f = new Factory("context-menu", theme);
  const els: ExcalidrawElement[] = [];

  // Dashed drop target, drawn first so the menu paints over it.
  els.push(...inkBox(f, {
    x: 0,
    y: 0,
    w: DASH_W,
    h: DASH_H,
    fill: color.transparent,
    strokeStyle: "dashed",
    shadow: false,
  }));
  // The caption sits in the dashed area's top-left corner, clear of the menu that is
  // drawn over it later: the menu occupies x >= MENU_X and y >= MENU_Y, so a caption
  // ending well before MENU_Y stays fully readable. Centring it would have put
  // "Right-click here" at x 79.6..220.4, of which the menu would have hidden all but
  // the first four characters.
  els.push(...label(f, {
    x: 16,
    y: 16,
    text: "Right-click here",
    fontSize: size.fontSm,
    stroke: color.subtle,
  }));

  const items = ["Back", "Reload", "Inspect"];
  const menuH = items.length * ITEM_H + 16 + 12;
  els.push(...inkBox(f, { x: MENU_X, y: MENU_Y, w: MENU_W, h: menuH }));

  items.forEach((text, i) => {
    // The last item sits below the separator, so it gets pushed down.
    const y = MENU_Y + 8 + i * ITEM_H + (i === items.length - 1 ? 12 : 0);
    if (i === items.length - 1) {
      els.push(...rule(f, { x: MENU_X + 12, y: y - 6, w: MENU_W - 24, stroke: color.border }));
    }
    if (text === "Reload") {
      els.push(...fillBand(f, { x: MENU_X + 8, y, w: MENU_W - 16, h: ITEM_H, fill: color.muted, rounded: false }));
    }
    els.push(...label(f, {
      x: MENU_X + 22,
      y: y + (ITEM_H - size.fontSm * 1.25) / 2,
      text,
      fontSize: size.fontSm,
      fontFamily: font.body,
    }));
  });

  return variants([{ name: "default", elements: els }]);
}
