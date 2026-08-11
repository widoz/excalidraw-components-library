import { estimateTextWidth, Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, font, inkBox, label, size } from "../style.js";
import { variants, type ComponentOutput } from "../variants.js";

const H = 38;
const GAP = 16;
const PAD = 18;

/** Row of four badges: default, secondary, outline, dark. */
export default function badge(theme: Theme): ComponentOutput {
  const f = new Factory("badge", theme);

  const specs = [
    { name: "default", text: "New", fill: color.accent, ink: color.accentText },
    { name: "secondary", text: "Beta", fill: color.muted, ink: color.ink },
    { name: "outline", text: "Draft", fill: color.transparent, ink: color.ink },
    { name: "dark", text: "Hot", fill: color.ink, ink: color.accentText },
  ];

  let x = 0;
  return variants(specs.map((v) => {
    const w = estimateTextWidth(v.text, size.fontSm, f.theme.advance) + PAD * 2;
    const elements: ExcalidrawElement[] = [
      ...inkBox(f, { x, y: 0, w, h: H, fill: v.fill, shadow: false }),
      ...label(f, {
        x: x + w / 2,
        y: (H - size.fontSm * 1.25) / 2,
        text: v.text,
        fontSize: size.fontSm,
        fontFamily: font.heading,
        stroke: v.ink,
        align: "center",
      }),
    ];
    x += w + GAP;
    return { name: v.name, elements };
  }));
}
