import { Factory, estimateTextWidth, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { chevron, color, fillBand, font, inkBox, label, rule, size } from "../style.js";
import { variants, type ComponentOutput } from "../variants.js";

const PITCH = 130;
const NAV_ROW_H = 40;
const PANEL_W = 420;
const PANEL_H = 200;
const PANEL_PAD = 24;
const COL_GAP = 40;
const COL_W = (PANEL_W - PANEL_PAD * 2 - COL_GAP) / 2;
const ROW_H = 70;
/** Symmetric breathing room around a highlighted item's label. */
const BAND_PAD_X = 12;
/** Gap between the end of a nav label and its chevron. */
const CHEVRON_GAP = 8;
const CHEVRON_S = 8;

/** A nav row of three items ("Docs" open) with a mega-panel of two columns below. */
export default function navigationMenu(theme: Theme): ComponentOutput {
  const f = new Factory("navigation-menu", theme);
  const els: ExcalidrawElement[] = [];

  const items = ["Product", "Docs", "Pricing"];
  items.forEach((text, i) => {
    const x = i * PITCH;
    // Both the band and the chevron are placed off the label's measured advance
    // width, so neither can drift when a label changes.
    const textW = estimateTextWidth(text, size.fontMd, f.theme.advance);
    if (text === "Docs") {
      // Band paints before the label, or it would cover the title.
      els.push(...fillBand(f, {
        x: x - BAND_PAD_X,
        y: 2,
        w: textW + BAND_PAD_X * 2,
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
      fontFamily: font.heading,
    }));
    els.push(...chevron(f, {
      x: x + textW + CHEVRON_GAP,
      y: NAV_ROW_H / 2 - 4,
      s: CHEVRON_S,
      dir: "down",
    }));
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

  return variants([{ name: "default", elements: els }]);
}
