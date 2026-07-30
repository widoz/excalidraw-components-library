import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, font, inkBox, label, size } from "../comic.js";

const CELL = 60;
const GAP = 20;

/** Two square toggles: one pressed (sunk, no shadow), one at rest (shadowed). */
export default function toggle(theme: Theme): ExcalidrawElement[] {
  const f = new Factory("toggle", theme);
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
    // Each label sits centred directly beneath its own toggle. Stacking both to the
    // right of the pair left it ambiguous which name belonged to which square.
    els.push(...label(f, {
      x: x + CELL / 2,
      y: CELL + 10,
      text: t.label,
      fontSize: size.fontSm,
      stroke: color.mutedText,
      align: "center",
    }));
  });

  return els;
}
