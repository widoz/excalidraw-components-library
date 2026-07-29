import { Factory, type ExcalidrawElement } from "../element.js";
import { chevron, color, fillBand, font, inkBox, label, rule, size } from "../comic.js";

const PITCH = 130;
const NAV_ROW_H = 40;
const PANEL_W = 420;
const PANEL_H = 200;
const PANEL_PAD = 24;
const COL_GAP = 40;
const COL_W = (PANEL_W - PANEL_PAD * 2 - COL_GAP) / 2;
const ROW_H = 70;

/** A nav row of three items ("Docs" open) with a mega-panel of two columns below. */
export default function navigationMenu(): ExcalidrawElement[] {
  const f = new Factory("navigation-menu");
  const els: ExcalidrawElement[] = [];

  const items = ["Product", "Docs", "Pricing"];
  items.forEach((text, i) => {
    const x = i * PITCH;
    if (text === "Docs") {
      // Band paints before the label, or it would cover the title.
      els.push(...fillBand(f, {
        x: x - 8,
        y: 2,
        w: 84,
        h: NAV_ROW_H - 4,
        fill: color.muted,
        rounded: false,
      }));
    }
    els.push(...label(f, {
      x,
      y: (NAV_ROW_H - size.fontMd * 1.25) / 2,
      text,
      fontSize: size.fontMd,
      fontFamily: font.comic,
    }));
    els.push(...chevron(f, { x: x + 90, y: NAV_ROW_H / 2 - 4, s: 8, dir: "down" }));
  });

  const panelY = NAV_ROW_H + 20;
  els.push(...inkBox(f, { x: 0, y: panelY, w: PANEL_W, h: PANEL_H }));

  const columns = [
    { x: PANEL_PAD, items: ["Getting started", "Components"] },
    { x: PANEL_PAD + COL_W + COL_GAP, items: ["Theming", "Examples"] },
  ];
  columns.forEach((col) => {
    col.items.forEach((text, row) => {
      const y = panelY + PANEL_PAD + row * ROW_H;
      els.push(...label(f, {
        x: col.x,
        y,
        text,
        fontSize: size.fontSm,
      }));
      els.push(...rule(f, {
        x: col.x,
        y: y + size.fontSm * 1.25 + 10,
        w: COL_W,
        stroke: color.border,
      }));
    });
  });

  return els;
}
