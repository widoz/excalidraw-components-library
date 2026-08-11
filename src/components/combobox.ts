import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { checkMark, chevron, color, fillBand, font, inkBox, label, rule, size } from "../style.js";
import { variants, type ComponentOutput } from "../variants.js";

const W = 320;
const TRIGGER_H = 56;
const CHEVRON_S = 12;
const SEARCH_H = 44;
const ITEM_H = 46;
const ITEMS = ["Excalifont", "Comic Shanns", "Nunito"];
const SELECTED = "Excalifont";

/** Trigger plus an open panel: a search row and three items, one selected with a check. */
export default function combobox(theme: Theme): ComponentOutput {
  const f = new Factory("combobox", theme);
  const els: ExcalidrawElement[] = [];

  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: TRIGGER_H }));
  els.push(...label(f, {
    x: 18,
    y: (TRIGGER_H - size.fontMd * 1.25) / 2,
    text: "Excalifont",
    fontSize: size.fontMd,
    fontFamily: font.heading,
  }));
  els.push(...chevron(f, { x: W - 42, y: TRIGGER_H / 2 - 5, s: CHEVRON_S, dir: "down" }));

  const panelY = TRIGGER_H + 22;
  const panelH = SEARCH_H + ITEMS.length * ITEM_H + 8;
  els.push(...inkBox(f, { x: 0, y: panelY, w: W, h: panelH }));

  els.push(...label(f, {
    x: 22,
    y: panelY + (SEARCH_H - size.fontSm * 1.25) / 2,
    text: "Search font...",
    fontSize: size.fontSm,
    stroke: color.subtle,
  }));
  els.push(...rule(f, { x: 12, y: panelY + SEARCH_H, w: W - 24, stroke: color.border }));

  const itemsY = panelY + SEARCH_H + 8;
  ITEMS.forEach((text, i) => {
    const y = itemsY + i * ITEM_H;
    const selected = text === SELECTED;
    if (selected) {
      els.push(...fillBand(f, { x: 8, y, w: W - 16, h: ITEM_H, fill: color.muted, rounded: false }));
    }
    els.push(...label(f, {
      x: 22,
      y: y + (ITEM_H - size.fontSm * 1.25) / 2,
      text,
      fontSize: size.fontSm,
    }));
    if (selected) {
      els.push(...checkMark(f, { x: W - 42, y: y + ITEM_H / 2 - 9, s: 18 }));
    }
  });

  return variants([{ name: "default", elements: els }]);
}
