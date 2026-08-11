import { estimateTextWidth, Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, font, label, size, swash } from "../style.js";
import { variants, type ComponentOutput } from "../variants.js";

const PITCH = 44;
const BLEED = 10;

const lines = [
  { text: "The quick brown fox", markStart: "The quick ", mark: "brown fox" },
  { text: "jumps over the lazy dog", markStart: "jumps over the ", mark: "lazy dog" },
  { text: "and lands in the ink.", markStart: null, mark: null },
];

/** Three lines of sample copy, with two phrases highlighted by a swash drawn behind the words. */
export default function marker(theme: Theme): ComponentOutput {
  const f = new Factory("marker", theme);
  const els: ExcalidrawElement[] = [];

  lines.forEach((line, i) => {
    const y = i * PITCH;
    if (line.markStart !== null && line.mark !== null) {
      const prefixW = estimateTextWidth(line.markStart, size.fontMd, f.theme.advance);
      const markW = estimateTextWidth(line.mark, size.fontMd, f.theme.advance);
      // The swash must be emitted before the text it highlights, or it paints over the words.
      els.push(...swash(f, {
        x: prefixW - BLEED,
        y,
        w: markW + BLEED * 2,
        h: size.fontMd * 1.15,
        fill: color.muted,
      }));
    }
    els.push(...label(f, {
      x: 0,
      y,
      text: line.text,
      fontSize: size.fontMd,
      fontFamily: font.body,
    }));
  });

  return variants([{ name: "default", elements: els }]);
}
