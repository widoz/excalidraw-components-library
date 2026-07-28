import { describe, expect, it } from "vitest";
import { Factory } from "../src/element.js";
import { bubble, burst, checkMark, chevron, inkBox, inkCircle, label, rule, xMark } from "../src/comic.js";
import { color, style } from "../src/tokens.js";

describe("inkBox", () => {
  it("emits a shadow behind the surface", () => {
    const f = new Factory("demo");
    const [shadow, surface] = inkBox(f, { x: 10, y: 20, w: 100, h: 40 });
    expect(shadow!.x).toBe(10 + style.shadowOffset);
    expect(shadow!.y).toBe(20 + style.shadowOffset);
    expect(shadow!.backgroundColor).toBe(color.ink);
    expect(shadow!.strokeColor).toBe(color.ink);
    expect(shadow!.strokeWidth).toBe(1);
    expect(surface!.x).toBe(10);
    expect(surface!.y).toBe(20);
    expect(surface!.backgroundColor).toBe(color.surface);
    // Shadow is emitted first, so it sits behind.
    expect(String(shadow!.index) < String(surface!.index)).toBe(true);
  });

  it("omits the shadow when asked", () => {
    const els = inkBox(new Factory("demo"), { x: 0, y: 0, w: 10, h: 10, shadow: false });
    expect(els).toHaveLength(1);
  });

  it("honours an explicit fill", () => {
    const els = inkBox(new Factory("demo"), { x: 0, y: 0, w: 10, h: 10, fill: color.accent });
    expect(els[1]!.backgroundColor).toBe(color.accent);
  });
});

describe("inkCircle", () => {
  it("emits a shadow and a surface positioned from the centre", () => {
    const [shadow, surface] = inkCircle(new Factory("demo"), { cx: 50, cy: 50, r: 20 });
    expect(surface!.x).toBe(30);
    expect(surface!.y).toBe(30);
    expect(surface!.width).toBe(40);
    expect(surface!.height).toBe(40);
    expect(shadow!.x).toBe(30 + style.shadowOffset);
  });
});

describe("label", () => {
  it("emits exactly one text element", () => {
    const els = label(new Factory("demo"), { x: 0, y: 0, text: "Hi" });
    expect(els).toHaveLength(1);
    expect(els[0]!.type).toBe("text");
    expect(els[0]!.text).toBe("Hi");
  });
});

describe("rule", () => {
  it("emits a horizontal line of the given width", () => {
    const [el] = rule(new Factory("demo"), { x: 5, y: 9, w: 60 });
    expect(el!.type).toBe("line");
    expect(el!.x).toBe(5);
    expect(el!.y).toBe(9);
    expect(el!.points).toEqual([[0, 0], [60, 0]]);
  });
});

describe("checkMark", () => {
  it("emits a three-point tick", () => {
    const [el] = checkMark(new Factory("demo"), { x: 0, y: 0, s: 20 });
    expect(el!.type).toBe("line");
    expect((el!.points as number[][]).length).toBe(3);
  });
});

describe("chevron", () => {
  it("emits a three-point angle", () => {
    const [down] = chevron(new Factory("demo"), { x: 0, y: 0, s: 12, dir: "down" });
    const [right] = chevron(new Factory("demo"), { x: 0, y: 0, s: 12, dir: "right" });
    expect((down!.points as number[][]).length).toBe(3);
    expect((right!.points as number[][]).length).toBe(3);
    expect(down!.points).not.toEqual(right!.points);
  });

  it("mirrors right when pointing left, occupying the same bounding box", () => {
    const [right] = chevron(new Factory("demo"), { x: 0, y: 0, s: 12, dir: "right" });
    const [left] = chevron(new Factory("demo"), { x: 0, y: 0, s: 12, dir: "left" });
    expect((left!.points as number[][]).length).toBe(3);
    expect(left!.points).not.toEqual(right!.points);
    // Factory.line requires the first point to be exactly [0, 0].
    expect((left!.points as number[][])[0]).toEqual([0, 0]);
    // Same drawn bounding box (width s*0.7, height s*2) as a "right" chevron at the same x.
    expect(left!.width).toBe(right!.width);
    expect(left!.height).toBe(right!.height);
    const rightXs = (right!.points as number[][]).map(([px]) => (right!.x as number) + px!);
    const leftXs = (left!.points as number[][]).map(([px]) => (left!.x as number) + px!);
    expect(Math.min(...leftXs)).toBe(Math.min(...rightXs));
    expect(Math.max(...leftXs)).toBe(Math.max(...rightXs));
  });
});

describe("bubble", () => {
  it("emits a rounded box with a shadow and a closed tail", () => {
    const els = bubble(new Factory("demo"), { x: 0, y: 0, w: 120, h: 60, tailAt: "bottom", tailX: 30 });
    expect(els.length).toBe(3);
    const tail = els[2]!;
    expect(tail.type).toBe("line");
    expect((tail.points as number[][]).length).toBe(4);
    expect(tail.backgroundColor).toBe(color.surface);
  });
});

describe("burst", () => {
  it("emits one closed star polygon", () => {
    const [el] = burst(new Factory("demo"), { cx: 0, cy: 0, r: 30, spikes: 8 });
    expect(el!.type).toBe("line");
    // 8 spikes = 16 alternating points, plus the closing repeat.
    expect((el!.points as number[][]).length).toBe(17);
  });
});

describe("xMark", () => {
  it("emits two crossing lines", () => {
    const els = xMark(new Factory("demo"), { x: 0, y: 0, s: 16 });
    expect(els).toHaveLength(2);
    expect(els.every((e) => e.type === "line")).toBe(true);
  });
});
