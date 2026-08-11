import { Factory, type ExcalidrawElement } from "../element.js";
import type { Theme } from "../theme.js";
import { color, font, inkCircle, label, size } from "../style.js";
import { variants, type ComponentOutput } from "../variants.js";

const R = 30;

/** Three avatars: image placeholder, initials, and an overlapping stack. */
export default function avatar(theme: Theme): ComponentOutput {
  const f = new Factory("avatar", theme);

  // 1. Image placeholder: a head-and-shoulders glyph built from two ellipses.
  const defaultEls: ExcalidrawElement[] = [];
  defaultEls.push(...inkCircle(f, { cx: R, cy: R, r: R, fill: color.muted }));
  defaultEls.push(f.ellipse({ x: R - 10, y: R - 18, w: 20, h: 20, fill: color.mutedText, stroke: color.ink }));
  // Height 24 so the shoulders end at y = 60, the bottom of the avatar circle.
  // Excalidraw does not clip, so anything taller simply hangs outside it.
  defaultEls.push(f.ellipse({ x: R - 20, y: R + 6, w: 40, h: 24, fill: color.mutedText, stroke: color.ink }));

  // 2. Initials.
  const initialsEls: ExcalidrawElement[] = [];
  const cx2 = R * 2 + 40 + R;
  initialsEls.push(...inkCircle(f, { cx: cx2, cy: R, r: R, fill: color.accent }));
  initialsEls.push(...label(f, {
    x: cx2,
    y: R - (size.fontMd * 1.25) / 2,
    text: "GS",
    fontSize: size.fontMd,
    fontFamily: font.heading,
    stroke: color.accentText,
    align: "center",
  }));

  // 3. Overlapping stack of three.
  const stackEls: ExcalidrawElement[] = [];
  const fills = [color.surface, color.muted, color.accent];
  const startX = cx2 + R + 60 + R;
  fills.forEach((fill, i) => {
    stackEls.push(...inkCircle(f, { cx: startX + i * (R + 12), cy: R, r: R, fill, shadow: false }));
  });

  return variants([
    { name: "default", elements: defaultEls },
    { name: "initials", elements: initialsEls },
    { name: "stack", elements: stackEls },
  ]);
}
