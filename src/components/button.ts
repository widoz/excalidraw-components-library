import { Factory } from "../element.js";
import type { Theme } from "../theme.js";
import { color, font, inkBox, label, size } from "../style.js";
import { variants, type ComponentOutput } from "../variants.js";

const W = 200;
const H = 56;
const GAP = 28;

/** Three buttons: default (accent), secondary (surface), disabled (muted, flat). */
export default function button(theme: Theme): ComponentOutput {
  const f = new Factory("button", theme);

  const specs = [
    { name: "default", text: "Click me!", fill: color.accent, ink: color.accentText, shadow: true },
    { name: "secondary", text: "Secondary", fill: color.surface, ink: color.ink, shadow: true },
    { name: "disabled", text: "Disabled", fill: color.muted, ink: color.mutedText, shadow: false },
  ];

  return variants(specs.map((v, i) => {
    const y = i * (H + GAP);
    return {
      name: v.name,
      elements: [
        ...inkBox(f, { x: 0, y, w: W, h: H, fill: v.fill, shadow: v.shadow }),
        ...label(f, {
          x: W / 2,
          y: y + (H - size.fontMd * 1.25) / 2,
          text: v.text,
          fontSize: size.fontMd,
          fontFamily: font.heading,
          stroke: v.ink,
          align: "center",
        }),
      ],
    };
  }));
}
