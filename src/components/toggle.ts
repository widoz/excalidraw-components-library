import { Factory } from "../element.js";
import type { Theme } from "../theme.js";
import { color, font, inkBox, label, size } from "../comic.js";
import { variants, type ComponentOutput } from "../variants.js";

const CELL = 60;
const GAP = 20;

/** Two square toggles: one pressed (sunk, no shadow), one at rest (shadowed). */
export default function toggle(theme: Theme): ComponentOutput {
  const f = new Factory("toggle", theme);

  const specs = [
    { name: "on", glyph: "B", label: "Bold", pressed: true },
    { name: "off", glyph: "I", label: "Italic", pressed: false },
  ];

  return variants(specs.map((t, i) => {
    const x = i * (CELL + GAP);
    return {
      name: t.name,
      elements: [
        ...inkBox(f, {
          x,
          y: 0,
          w: CELL,
          h: CELL,
          rounded: false,
          fill: t.pressed ? color.accent : color.surface,
          // A pressed button sits flush with the surface; no shadow reads "down".
          shadow: !t.pressed,
        }),
        ...label(f, {
          x: x + CELL / 2,
          y: (CELL - size.fontMd * 1.25) / 2,
          text: t.glyph,
          fontSize: size.fontMd,
          fontFamily: font.heading,
          stroke: t.pressed ? color.accentText : color.ink,
          align: "center",
        }),
        // Each label sits centred directly beneath its own toggle. Stacking both to the
        // right of the pair left it ambiguous which name belonged to which square.
        ...label(f, {
          x: x + CELL / 2,
          y: CELL + 10,
          text: t.label,
          fontSize: size.fontSm,
          stroke: color.mutedText,
          align: "center",
        }),
      ],
    };
  }));
}
