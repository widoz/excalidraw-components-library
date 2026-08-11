import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { chevron, color, font, inkBox, label, rule, size } from "../style.js";
import { variants, type ComponentOutput } from "../variants.js";

const W = 320;
const ROW_H = 56;
const GAP = 4;
const BODY_H = 80;
const CHEVRON_S = 8;

/** Three stacked rows; the first is expanded with a ruled body underneath it. */
export default function accordion(theme: Theme): ComponentOutput {
  const f = new Factory("accordion", theme);

  const rows = [
    { text: "What is this?", expanded: true },
    { text: "How does it work?", expanded: false },
    { text: "Can I edit it?", expanded: false },
  ];

  const expandedEls: ExcalidrawElement[] = [];
  const collapsedEls: ExcalidrawElement[] = [];

  let y = 0;
  for (const row of rows) {
    const target = row.expanded ? expandedEls : collapsedEls;
    target.push(...inkBox(f, { x: 0, y, w: W, h: ROW_H }));
    target.push(...label(f, {
      x: 24,
      y: y + (ROW_H - size.fontMd * 1.25) / 2,
      text: row.text,
      fontSize: size.fontMd,
      fontFamily: font.heading,
    }));
    // "down" spans [0, s*2] wide by [0, s*0.7] tall; "right" spans [0, s*0.7] wide by
    // [0, s*2] tall (see style.ts chevron()) — each direction is centred on its own extent.
    target.push(...chevron(f, {
      x: W - 24 - (row.expanded ? CHEVRON_S * 2 : CHEVRON_S * 0.7),
      y: y + ROW_H / 2 - (row.expanded ? CHEVRON_S * 0.35 : CHEVRON_S),
      s: CHEVRON_S,
      dir: row.expanded ? "down" : "right",
    }));

    if (row.expanded) {
      const bodyY = y + ROW_H + GAP;
      target.push(...rule(f, { x: 24, y: bodyY + 24, w: W - 48, stroke: color.muted }));
      target.push(...rule(f, { x: 24, y: bodyY + 46, w: W - 96, stroke: color.muted }));
      target.push(...rule(f, { x: 0, y: bodyY + BODY_H, w: W, stroke: color.border }));
      y = bodyY + BODY_H + GAP;
    } else {
      y += ROW_H + GAP;
    }
  }

  // Closing rule beneath the last row (y has just advanced by the trailing GAP),
  // mirroring the one under the expanded body. The last row is always collapsed.
  collapsedEls.push(...rule(f, { x: 0, y: y - GAP, w: W, stroke: color.border }));

  return variants([
    { name: "expanded", elements: expandedEls },
    { name: "collapsed", elements: collapsedEls },
  ]);
}
