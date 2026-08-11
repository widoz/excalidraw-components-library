import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, fillBand, font, inkBox, inkCircle, label, rule, size } from "../style.js";
import { variants, type ComponentOutput } from "../variants.js";

const W = 240;
const H = 420;
const ROW_H = 52;
const NAV_Y = 96;

/** Vertical nav panel: logo row, four nav rows with one active, and a bottom avatar row. */
export default function sidebar(theme: Theme): ComponentOutput {
  const f = new Factory("sidebar", theme);
  const els: ExcalidrawElement[] = [];

  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: H, rounded: false }));

  els.push(...fillBand(f, { x: 20, y: 20, w: 40, h: 40, fill: color.accent, rounded: true }));
  els.push(...label(f, {
    x: 72,
    y: 20 + (40 - size.fontMd * 1.25) / 2,
    text: "Sketch Kit",
    fontSize: size.fontMd,
    fontFamily: font.heading,
  }));

  els.push(...rule(f, { x: 20, y: 80, w: W - 40 }));

  const items = ["Overview", "Components", "Palette", "Settings"];
  items.forEach((text, i) => {
    const y = NAV_Y + i * ROW_H;
    if (text === "Components") {
      // Inset by 2 on both sides. The panel's 4px ink border is centred on x = 0 and
      // x = W, so a band spanning the full 0..W would repaint the inner half of that
      // border down the whole active row.
      els.push(...fillBand(f, { x: 2, y, w: W - 4, h: ROW_H, fill: color.muted, rounded: false }));
      els.push(...fillBand(f, { x: 2, y, w: 4, h: ROW_H, fill: color.accent, rounded: false }));
    }
    els.push(...label(f, {
      x: 32,
      y: y + (ROW_H - size.fontSm * 1.25) / 2,
      text,
      fontSize: size.fontSm,
      fontFamily: text === "Components" ? font.heading : font.body,
    }));
  });

  // The avatar row sits above the bottom rule, not below it.
  const ruleY = H - 20;
  const avatarY = ruleY - 40;
  els.push(...inkCircle(f, { cx: 20 + 16, cy: avatarY, r: 16, fill: color.accent }));
  els.push(...label(f, {
    x: 20 + 16,
    y: avatarY - (size.fontSm * 1.25) / 2,
    text: "GS",
    fontSize: size.fontSm,
    fontFamily: font.heading,
    stroke: color.accentText,
    align: "center",
  }));
  els.push(...label(f, {
    x: 60,
    y: avatarY - (size.fontSm * 1.25) / 2,
    text: "guido",
    fontSize: size.fontSm,
  }));
  els.push(...rule(f, { x: 20, y: ruleY, w: W - 40 }));

  return variants([{ name: "default", elements: els }]);
}
