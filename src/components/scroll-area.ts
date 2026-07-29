import { Factory, type ExcalidrawElement } from "../element.js";
import { color, fillBand, inkBox, rule } from "../comic.js";

const W = 320;
const H = 220;
const CONTENT_X = 20;
const CONTENT_W = 250;

/**
 * Scrollbar track/thumb geometry. The frame is 320x220 rounded, so its adaptive
 * corner radius is min(320,220)*0.25 = 55, capped at 32. The track sits at
 * x=[300,310] (10 wide, inset 10 from the right edge) which falls inside the
 * corner-arc bounding squares at top-right and bottom-right (x in [288,320]).
 * At the track's own x-range the frame's rounded boundary peaks (is lowest, i.e.
 * closest to the edge) at x=310: dx=310-288=22, boundary y = 32 - sqrt(32^2-22^2)
 * = 32 - sqrt(1024-484) = 32 - sqrt(540) = 32 - 23.24 = 8.76. The track/thumb are
 * themselves rounded pills, 10 wide, so Excalidraw's own adaptive radius applies to
 * them too: min(10, h) * 0.25 = 2.5, which eats a further 2.5 - 2.5/sqrt(2) = 0.73px
 * off their own corner. So the minimum safe vertical inset is 8.76 + 0.73 = 9.49.
 * A 12px inset clears that with margin.
 */
const SCROLLBAR_INSET_Y = 12;
const TRACK_X = W - 10 - 10;
const TRACK_W = 10;
const TRACK_H = H - SCROLLBAR_INSET_Y * 2;

/** A scrollable content frame with eight ruled copy lines and a right-side scrollbar. */
export default function scrollArea(): ExcalidrawElement[] {
  const f = new Factory("scroll-area");
  const els: ExcalidrawElement[] = [];

  els.push(...inkBox(f, { x: 0, y: 0, w: W, h: H }));

  // Eight lines of "copy" at a uniform 24px pitch. Every row must stay strictly
  // inside the frame: Excalidraw does not clip, so a row at y = H would paint a pale
  // 2px muted line straight over the frame's 4px ink bottom edge. The last row sits
  // at 188, a full 32px clear of the bottom edge.
  const rowYs = [20, 44, 68, 92, 116, 140, 164, 188];
  for (const y of rowYs) {
    els.push(...rule(f, { x: CONTENT_X, y, w: CONTENT_W, stroke: color.muted }));
  }

  els.push(...fillBand(f, {
    x: TRACK_X,
    y: SCROLLBAR_INSET_Y,
    w: TRACK_W,
    h: TRACK_H,
    fill: color.muted,
    rounded: true,
  }));
  els.push(...fillBand(f, {
    x: TRACK_X,
    y: SCROLLBAR_INSET_Y,
    w: TRACK_W,
    h: 70,
    fill: color.mutedText,
    rounded: true,
  }));

  return els;
}
