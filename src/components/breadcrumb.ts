import { Factory, estimateTextWidth, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { chevron, color, font, label, size } from "../comic.js";
import { variants, type ComponentOutput } from "../variants.js";

const GAP = 20;
const CHEVRON_S = 8;
// A "right" chevron's drawn width is s * 0.7, not s (see comic.ts): the glyph is an
// angle bracket, not a square. Advancing by GAP + s + GAP after it would leave a
// trailing gap of GAP + (s - s * 0.7) = GAP + s * 0.3, wider than the GAP that leads
// into it. Advancing by the chevron's actual width keeps both gaps equal to GAP.
const CHEVRON_W = CHEVRON_S * 0.7;

/** Three crumbs with hand-drawn chevron separators; the last one is bold. */
export default function breadcrumb(theme: Theme): ComponentOutput {
  const f = new Factory("breadcrumb", theme);
  const els: ExcalidrawElement[] = [];

  const crumbs = [
    { text: "Home", current: false },
    { text: "Library", current: false },
    { text: "Button", current: true },
  ];

  let x = 0;
  crumbs.forEach((crumb, i) => {
    const width = estimateTextWidth(crumb.text, size.fontMd, f.theme.advance);
    els.push(...label(f, {
      x,
      y: 0,
      text: crumb.text,
      fontSize: size.fontMd,
      fontFamily: crumb.current ? font.heading : font.body,
      stroke: crumb.current ? color.ink : color.mutedText,
    }));
    x += width;
    if (i < crumbs.length - 1) {
      els.push(...chevron(f, {
        x: x + GAP,
        y: 4,
        s: CHEVRON_S,
        dir: "right",
        stroke: color.subtle,
      }));
      x += GAP + CHEVRON_W + GAP;
    }
  });

  return variants([{ name: "default", elements: els }]);
}
