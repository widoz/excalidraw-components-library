import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { chevron, color, font, inkBox, label, rule, size } from "../comic.js";

const W = 320;
const TRIGGER_H = 56;
const CHEVRON_S = 8;
const ROW_GAP = 36;
const ROW_INDENT = 32;
const GAP_BETWEEN_STATES = 40;
const TRIGGER_TEXT = "Show 3 more";

/** Two states side by side: an expanded trigger with three revealed rows, and a collapsed one. */
export default function collapsible(theme: Theme): ExcalidrawElement[] {
  const f = new Factory("collapsible", theme);
  const els: ExcalidrawElement[] = [];

  // Expanded state.
  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: TRIGGER_H }));
  els.push(...label(f, {
    x: 24,
    y: (TRIGGER_H - size.fontMd * 1.25) / 2,
    text: TRIGGER_TEXT,
    fontSize: size.fontMd,
    fontFamily: font.comic,
  }));
  els.push(...chevron(f, {
    x: W - 24 - CHEVRON_S * 2,
    y: TRIGGER_H / 2 - CHEVRON_S * 0.35,
    s: CHEVRON_S,
    dir: "down",
  }));

  const contentY = TRIGGER_H + 16;
  for (let i = 0; i < 3; i++) {
    els.push(...rule(f, {
      x: ROW_INDENT,
      y: contentY + i * ROW_GAP,
      w: W - ROW_INDENT * 2,
      stroke: color.muted,
    }));
  }
  const lastRowY = contentY + 2 * ROW_GAP;

  // Collapsed state, separated from the expanded block above by GAP_BETWEEN_STATES.
  const trigger2Y = lastRowY + GAP_BETWEEN_STATES;
  els.push(...inkBox(f, { x: 0, y: trigger2Y, w: W, h: TRIGGER_H }));
  els.push(...label(f, {
    x: 24,
    y: trigger2Y + (TRIGGER_H - size.fontMd * 1.25) / 2,
    text: TRIGGER_TEXT,
    fontSize: size.fontMd,
    fontFamily: font.comic,
  }));
  els.push(...chevron(f, {
    x: W - 24 - CHEVRON_S * 0.7,
    y: trigger2Y + TRIGGER_H / 2 - CHEVRON_S,
    s: CHEVRON_S,
    dir: "right",
  }));

  return els;
}
