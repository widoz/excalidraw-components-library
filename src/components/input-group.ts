import { Factory, estimateTextWidth, type ExcalidrawElement } from "../element.js";
import { color, font, label, size, style } from "../comic.js";

const LEAD_W = 50;
const TRAIL_W = 90;
const H = 56;
const MID_W = 200;
const W = LEAD_W + MID_W + TRAIL_W;
// Seam x-positions: where the leading chip meets the input, and where the input
// meets the trailing accent segment.
const SEAM_1_X = LEAD_W;
const SEAM_2_X = LEAD_W + MID_W;
const TYPED = "guido";

/**
 * Three joined square-cornered segments sharing one hard shadow, in the
 * button-group idiom: a leading "@" chip, a live input area, and a trailing
 * "Copy" action, seamed together by two full-height ink rules.
 */
export default function inputGroup(): ExcalidrawElement[] {
  const f = new Factory("input-group");
  const els: ExcalidrawElement[] = [];

  // One shared shadow behind the whole group.
  els.push(f.rect({
    x: style.shadowOffset,
    y: style.shadowOffset,
    w: W,
    h: H,
    fill: color.ink,
    stroke: color.ink,
    strokeWidth: 1,
    rounded: false,
  }));

  // Leading chip.
  els.push(f.rect({ x: 0, y: 0, w: LEAD_W, h: H, fill: color.muted, rounded: false }));
  els.push(...label(f, {
    x: LEAD_W / 2,
    y: (H - size.fontMd * 1.25) / 2,
    text: "@",
    fontSize: size.fontMd,
    fontFamily: font.comic,
    align: "center",
  }));

  // Middle input area, with typed text and a caret.
  els.push(f.rect({ x: LEAD_W, y: 0, w: MID_W, h: H, fill: color.surface, rounded: false }));
  const textX = LEAD_W + 18;
  els.push(...label(f, {
    x: textX,
    y: (H - size.fontSm * 1.25) / 2,
    text: TYPED,
    fontSize: size.fontSm,
  }));
  const caretX = textX + estimateTextWidth(TYPED, size.fontSm) + 4;
  els.push(f.line({ x: caretX, y: 14, points: [[0, 0], [0, H - 28]], strokeWidth: 2 }));

  // Trailing accent segment.
  els.push(f.rect({ x: LEAD_W + MID_W, y: 0, w: TRAIL_W, h: H, fill: color.accent, rounded: false }));
  els.push(...label(f, {
    x: LEAD_W + MID_W + TRAIL_W / 2,
    y: (H - size.fontMd * 1.25) / 2,
    text: "Copy",
    fontSize: size.fontMd,
    fontFamily: font.comic,
    stroke: color.accentText,
    align: "center",
  }));

  // Seams: full-height ink rules landing exactly on the segment boundaries.
  els.push(f.line({ x: SEAM_1_X, y: 0, points: [[0, 0], [0, H]], strokeWidth: 4 }));
  els.push(f.line({ x: SEAM_2_X, y: 0, points: [[0, 0], [0, H]], strokeWidth: 4 }));

  return els;
}
