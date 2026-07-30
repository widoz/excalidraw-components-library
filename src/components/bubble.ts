import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { bubble as bubbleShape, color, rule } from "../comic.js";

const IN_W = 220;
const IN_H = 80;
const OUT_W = 200;
const OUT_H = 64;
const OUT_X = 80;
const OUT_Y = 120;

/** Two chat bubbles, incoming and outgoing, each carrying ruled copy lines. */
export default function bubble(theme: Theme): ExcalidrawElement[] {
  const f = new Factory("bubble", theme);
  const els: ExcalidrawElement[] = [];

  // Incoming, apex near the left edge.
  els.push(...bubbleShape(f, {
    x: 0,
    y: 0,
    w: IN_W,
    h: IN_H,
    tailAt: "bottom",
    apexX: 34,
    fill: color.surface,
  }));
  els.push(...rule(f, { x: 24, y: 26, w: 150, stroke: color.ink }));
  els.push(...rule(f, { x: 24, y: 48, w: 100, stroke: color.ink }));

  // Outgoing, offset right and down, apex near the right edge.
  els.push(...bubbleShape(f, {
    x: OUT_X,
    y: OUT_Y,
    w: OUT_W,
    h: OUT_H,
    tailAt: "bottom",
    apexX: OUT_W - 34,
    fill: color.accent,
  }));
  els.push(...rule(f, { x: OUT_X + 20, y: OUT_Y + 18, w: 130, stroke: color.accentText }));
  els.push(...rule(f, { x: OUT_X + 20, y: OUT_Y + 38, w: 90, stroke: color.accentText }));

  return els;
}
