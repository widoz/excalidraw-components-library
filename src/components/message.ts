import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { bubble, color, font, inkCircle, label, rule, size } from "../comic.js";
import { variants, type ComponentOutput } from "../variants.js";

const R = 22;
const GAP = 12;

const ROW1_Y = 0;
const BUBBLE1_W = 260;
const BUBBLE1_H = 86;

/** A two-turn chat exchange: initials avatar plus tailed bubble, incoming then a reply. */
export default function message(theme: Theme): ComponentOutput {
  const f = new Factory("message", theme);

  // Incoming message.
  const defaultEls: ExcalidrawElement[] = [];
  defaultEls.push(...inkCircle(f, { cx: R, cy: ROW1_Y + R, r: R, fill: color.muted }));
  defaultEls.push(...label(f, {
    x: R,
    y: ROW1_Y + R - (size.fontSm * 1.25) / 2,
    text: "GS",
    fontSize: size.fontSm,
    fontFamily: font.heading,
    align: "center",
  }));

  const bubble1X = R * 2 + GAP;
  defaultEls.push(...bubble(f, {
    x: bubble1X,
    y: ROW1_Y,
    w: BUBBLE1_W,
    h: BUBBLE1_H,
    tailAt: "bottom",
    apexX: 24,
    fill: color.surface,
  }));
  defaultEls.push(...rule(f, { x: bubble1X + 20, y: ROW1_Y + 22, w: 180, stroke: color.ink }));
  defaultEls.push(...rule(f, { x: bubble1X + 20, y: ROW1_Y + 46, w: 130, stroke: color.ink }));

  // Clears the bubble's downward tail (26px) plus a little padding.
  const ts1Y = ROW1_Y + BUBBLE1_H + 34;
  defaultEls.push(...label(f, {
    x: bubble1X,
    y: ts1Y,
    text: "09:24",
    fontSize: size.fontSm,
    stroke: color.subtle,
  }));

  // Reply, offset right and below.
  const outgoingEls: ExcalidrawElement[] = [];
  const row2Y = ts1Y + size.fontSm * 1.25 + 24;
  const avatar2Cx = 40 + R;
  outgoingEls.push(...inkCircle(f, { cx: avatar2Cx, cy: row2Y + R, r: R, fill: color.accent }));
  outgoingEls.push(...label(f, {
    x: avatar2Cx,
    y: row2Y + R - (size.fontSm * 1.25) / 2,
    text: "AI",
    fontSize: size.fontSm,
    fontFamily: font.heading,
    stroke: color.accentText,
    align: "center",
  }));

  const bubble2X = avatar2Cx + R + GAP;
  const bubble2H = 64;
  outgoingEls.push(...bubble(f, {
    x: bubble2X,
    y: row2Y,
    w: 240,
    h: bubble2H,
    tailAt: "bottom",
    apexX: 24,
    fill: color.accent,
  }));
  outgoingEls.push(...rule(f, { x: bubble2X + 20, y: row2Y + 16, w: 160, stroke: color.accentText }));
  outgoingEls.push(...rule(f, { x: bubble2X + 20, y: row2Y + 36, w: 120, stroke: color.accentText }));

  outgoingEls.push(...label(f, {
    x: bubble2X,
    y: row2Y + bubble2H + 34,
    text: "09:25",
    fontSize: size.fontSm,
    stroke: color.subtle,
  }));

  return variants([
    { name: "default", elements: defaultEls },
    { name: "outgoing", elements: outgoingEls },
  ]);
}
