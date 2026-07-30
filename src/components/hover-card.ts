import { Factory, estimateTextWidth, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, font, inkBox, inkCircle, label, rule, size } from "../comic.js";

const CARD_W = 300;
const CARD_H = 160;
const PAD = 20;
const AVATAR_R = 24;
const TRIGGER_GAP = 30;

/**
 * An open hover card floating above its trigger link. The card is emitted first
 * (top of the elements array) since it visually sits above/in-front of the trigger.
 */
export default function hoverCard(theme: Theme): ExcalidrawElement[] {
  const f = new Factory("hover-card", theme);
  const els: ExcalidrawElement[] = [];

  // The card.
  els.push(...inkBox(f, { x: 0, y: 0, w: CARD_W, h: CARD_H }));

  const cx = PAD + AVATAR_R;
  const cy = PAD + AVATAR_R;
  els.push(...inkCircle(f, { cx, cy, r: AVATAR_R, fill: color.accent }));
  els.push(...label(f, {
    x: cx,
    y: cy - (size.fontSm * 1.25) / 2,
    text: "GS",
    fontSize: size.fontSm,
    fontFamily: font.comic,
    stroke: color.accentText,
    align: "center",
  }));

  els.push(...label(f, {
    x: cx + AVATAR_R + 12,
    y: cy - (size.fontMd * 1.25) / 2,
    text: "@guido",
    fontSize: size.fontMd,
    fontFamily: font.comic,
  }));

  // Two ruled lines standing in for bio copy.
  els.push(...rule(f, { x: PAD, y: cy + AVATAR_R + 14, w: CARD_W - PAD * 2, stroke: color.muted }));
  els.push(...rule(f, { x: PAD, y: cy + AVATAR_R + 36, w: CARD_W - PAD * 2 - 60, stroke: color.muted }));

  // The trigger: a hovered link, sitting below the floating card.
  const triggerY = CARD_H + TRIGGER_GAP;
  const triggerText = "@guido";
  const triggerFontSize = size.fontSm;
  els.push(...label(f, {
    x: 0,
    y: triggerY,
    text: triggerText,
    fontSize: triggerFontSize,
    stroke: color.mutedText,
  }));
  els.push(...rule(f, {
    x: 0,
    y: triggerY + triggerFontSize * 1.25 + 2,
    w: estimateTextWidth(triggerText, triggerFontSize),
    stroke: color.border,
  }));

  return els;
}
