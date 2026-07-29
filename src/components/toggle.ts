import { Factory, type ExcalidrawElement } from "../element.js";
import { color, font, inkBox, label, size } from "../comic.js";

const CELL = 60;
const GAP = 20;

/** Two square toggles: one pressed (sunk, no shadow), one at rest (shadowed). */
export default function toggle(): ExcalidrawElement[] {
  const f = new Factory("toggle");
  const els: ExcalidrawElement[] = [];

  const toggles = [
    { glyph: "B", label: "Bold", pressed: true },
    { glyph: "I", label: "Italic", pressed: false },
  ];

  toggles.forEach((t, i) => {
    const x = i * (CELL + GAP);
    els.push(...inkBox(f, {
      x,
      y: 0,
      w: CELL,
      h: CELL,
      rounded: false,
      fill: t.pressed ? color.accent : color.surface,
      // A pressed button sits flush with the surface; no shadow reads "down".
      shadow: !t.pressed,
    }));
    els.push(...label(f, {
      x: x + CELL / 2,
      y: (CELL - size.fontMd * 1.25) / 2,
      text: t.glyph,
      fontSize: size.fontMd,
      fontFamily: font.comic,
      stroke: t.pressed ? color.accentText : color.ink,
      align: "center",
    }));
  });

  // Legend, stacked to the right of the toggle pair — there's no room for it
  // between the two 20px-apart toggles, so it reads as a shared key instead.
  const legendX = toggles.length * (CELL + GAP) - GAP + 20;
  els.push(...label(f, {
    x: legendX,
    y: 8,
    text: "Bold",
    fontSize: size.fontSm,
    stroke: color.mutedText,
  }));
  els.push(...label(f, {
    x: legendX,
    y: 34,
    text: "Italic",
    fontSize: size.fontSm,
    stroke: color.mutedText,
  }));

  return els;
}
