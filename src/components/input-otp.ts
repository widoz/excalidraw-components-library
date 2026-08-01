import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, font, inkBox, label, size, stroke } from "../comic.js";
import { variants, type ComponentOutput } from "../variants.js";

const CELL_W = 52;
const CELL_H = 64;
const GAP = 12;
// The conventional OTP grouping: a wider gap between the third and fourth cell.
const GROUP_GAP = 20;
const FOCUSED_INDEX = 3;

// Gaps preceding cells 1..5 (six cells, five gaps between them).
const GAPS = [GAP, GAP, GAP + GROUP_GAP, GAP, GAP];

function cellPositions(): number[] {
  const xs = [0];
  for (const gap of GAPS) {
    xs.push(xs[xs.length - 1]! + CELL_W + gap);
  }
  return xs;
}

/** Six separate OTP cells, grouped 3 + 3, with the fourth cell showing focus. */
export default function inputOtp(theme: Theme): ComponentOutput {
  const f = new Factory("input-otp", theme);
  const els: ExcalidrawElement[] = [];

  const xs = cellPositions();
  const digits = ["4", "2", "7"];

  xs.forEach((x, i) => {
    els.push(...inkBox(f, { x, y: 0, w: CELL_W, h: CELL_H, rounded: false }));

    if (i < digits.length) {
      els.push(...label(f, {
        x: x + CELL_W / 2,
        y: (CELL_H - size.fontLg * 1.25) / 2,
        text: digits[i]!,
        fontSize: size.fontLg,
        fontFamily: font.heading,
        align: "center",
      }));
    }

    if (i === FOCUSED_INDEX) {
      // Doubled outline marks focus, mirroring input.ts's focus ring idiom.
      els.push(f.rect({
        x: x - 4,
        y: -4,
        w: CELL_W + 8,
        h: CELL_H + 8,
        fill: color.transparent,
        rounded: false,
      }));
      els.push(f.line({
        x: x + CELL_W / 2,
        y: 16,
        points: [[0, 0], [0, CELL_H - 32]],
        strokeWidth: stroke.hairline,
      }));
    }
  });

  return variants([{ name: "default", elements: els }]);
}
