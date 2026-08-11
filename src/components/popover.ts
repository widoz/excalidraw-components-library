import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { bubble, color, font, inkBox, label, rule, size } from "../style.js";
import { variants, type ComponentOutput } from "../variants.js";

const TRIGGER_W = 140;
const TRIGGER_H = 52;
const BUBBLE_W = 280;
const BUBBLE_H = 160;
const PAD = 20;

/** A trigger button with a hand-drawn popover bubble above it, tail aimed at its centre. */
export default function popover(theme: Theme): ComponentOutput {
  const f = new Factory("popover", theme);
  const els: ExcalidrawElement[] = [];

  // The tail reaches 26px below the bubble, so this leaves a 4px gap above the trigger.
  const triggerY = BUBBLE_H + 30;

  els.push(...bubble(f, {
    x: 0,
    y: 0,
    w: BUBBLE_W,
    h: BUBBLE_H,
    tailAt: "bottom",
    // Apex lands on the trigger's centre: 0 + TRIGGER_W / 2 = 70.
    apexX: TRIGGER_W / 2,
  }));

  els.push(...label(f, {
    x: PAD,
    y: PAD,
    text: "Dimensions",
    fontSize: size.fontMd,
    fontFamily: font.heading,
  }));

  const rule1Y = PAD + size.fontMd * 1.25 + 16;
  const rule2Y = rule1Y + 30;
  els.push(...rule(f, { x: PAD, y: rule1Y, w: BUBBLE_W - PAD * 2, stroke: color.border }));
  els.push(...rule(f, { x: PAD, y: rule2Y, w: BUBBLE_W - PAD * 2, stroke: color.border }));

  const chipY = rule2Y + 24;
  // Square: it sits nested inside the bubble's own rounded corners.
  els.push(...inkBox(f, { x: PAD, y: chipY, w: 40, h: 24, fill: color.accent, rounded: false }));
  els.push(...label(f, {
    x: PAD + 20,
    y: chipY + (24 - size.fontSm * 1.25) / 2,
    text: "px",
    fontSize: size.fontSm,
    stroke: color.accentText,
    align: "center",
  }));

  els.push(...inkBox(f, { x: 0, y: triggerY, w: TRIGGER_W, h: TRIGGER_H }));
  els.push(...label(f, {
    x: TRIGGER_W / 2,
    y: triggerY + (TRIGGER_H - size.fontSm * 1.25) / 2,
    text: "Options",
    fontSize: size.fontSm,
    fontFamily: font.heading,
    align: "center",
  }));

  return variants([{ name: "default", elements: els }]);
}
