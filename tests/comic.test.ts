import { describe, expect, it } from "vitest";
import { Factory } from "../src/element.js";
import {
  arc,
  bubble,
  burst,
  checkMark,
  chevron,
  dots,
  fillBand,
  inkBox,
  inkCircle,
  label,
  rule,
  swash,
  xMark,
} from "../src/comic.js";
import { color, style } from "../src/tokens.js";
import { DEFAULT_PRESET, resolveTheme } from "../src/theme.js";

const theme = resolveTheme(DEFAULT_PRESET);

describe("inkBox", () => {
  it("emits a shadow behind the surface", () => {
    const f = new Factory("demo", theme);
    const [shadow, surface] = inkBox(f, { x: 10, y: 20, w: 100, h: 40 });
    expect(shadow!.x).toBe(10 + style.shadowOffset);
    expect(shadow!.y).toBe(20 + style.shadowOffset);
    expect(shadow!.backgroundColor).toBe(theme.palette.ink);
    expect(shadow!.strokeColor).toBe(theme.palette.ink);
    expect(shadow!.strokeWidth).toBe(theme.strokes.shadow);
    expect(surface!.x).toBe(10);
    expect(surface!.y).toBe(20);
    expect(surface!.backgroundColor).toBe(theme.palette.surface);
    // Shadow is emitted first, so it sits behind.
    expect(String(shadow!.index) < String(surface!.index)).toBe(true);
  });

  it("omits the shadow when asked", () => {
    const els = inkBox(new Factory("demo", theme), { x: 0, y: 0, w: 10, h: 10, shadow: false });
    expect(els).toHaveLength(1);
  });

  it("honours an explicit fill", () => {
    const els = inkBox(new Factory("demo", theme), { x: 0, y: 0, w: 10, h: 10, fill: color.accent });
    expect(els[1]!.backgroundColor).toBe(theme.palette.accent);
  });
});

describe("inkCircle", () => {
  it("emits a shadow and a surface positioned from the centre", () => {
    const [shadow, surface] = inkCircle(new Factory("demo", theme), { cx: 50, cy: 50, r: 20 });
    expect(surface!.x).toBe(30);
    expect(surface!.y).toBe(30);
    expect(surface!.width).toBe(40);
    expect(surface!.height).toBe(40);
    expect(shadow!.x).toBe(30 + style.shadowOffset);
  });
});

describe("label", () => {
  it("emits exactly one text element", () => {
    const els = label(new Factory("demo", theme), { x: 0, y: 0, text: "Hi" });
    expect(els).toHaveLength(1);
    expect(els[0]!.type).toBe("text");
    expect(els[0]!.text).toBe("Hi");
  });
});

describe("rule", () => {
  it("emits a horizontal line of the given width", () => {
    const [el] = rule(new Factory("demo", theme), { x: 5, y: 9, w: 60 });
    expect(el!.type).toBe("line");
    expect(el!.x).toBe(5);
    expect(el!.y).toBe(9);
    expect(el!.points).toEqual([[0, 0], [60, 0]]);
  });
});

describe("checkMark", () => {
  it("emits a three-point tick", () => {
    const [el] = checkMark(new Factory("demo", theme), { x: 0, y: 0, s: 20 });
    expect(el!.type).toBe("line");
    expect((el!.points as number[][]).length).toBe(3);
  });
});

describe("chevron", () => {
  it("emits a three-point angle", () => {
    const [down] = chevron(new Factory("demo", theme), { x: 0, y: 0, s: 12, dir: "down" });
    const [right] = chevron(new Factory("demo", theme), { x: 0, y: 0, s: 12, dir: "right" });
    expect((down!.points as number[][]).length).toBe(3);
    expect((right!.points as number[][]).length).toBe(3);
    expect(down!.points).not.toEqual(right!.points);
  });

  it("mirrors right when pointing left, occupying the same bounding box", () => {
    const [right] = chevron(new Factory("demo", theme), { x: 0, y: 0, s: 12, dir: "right" });
    const [left] = chevron(new Factory("demo", theme), { x: 0, y: 0, s: 12, dir: "left" });
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
    const els = bubble(new Factory("demo", theme), { x: 0, y: 0, w: 120, h: 60, tailAt: "bottom", apexX: 60 });
    expect(els.length).toBe(3);
    const tail = els[2]!;
    expect(tail.type).toBe("line");
    expect((tail.points as number[][]).length).toBe(4);
    expect(tail.backgroundColor).toBe(theme.palette.surface);
  });

  it("puts the tail's point exactly at x + apexX", () => {
    const els = bubble(new Factory("demo", theme), { x: 200, y: 0, w: 120, h: 60, tailAt: "bottom", apexX: 60 });
    const tail = els[2]!;
    const apex = (tail.points as number[][])[1]!;
    expect((tail.x as number) + apex[0]!).toBe(260);
    // The base straddles the apex, 22px before and 18px after.
    expect(tail.x).toBe(238);
  });

  it("points the tail up and down from the matching edge", () => {
    const down = bubble(new Factory("demo", theme), { x: 0, y: 0, w: 100, h: 40, tailAt: "bottom", apexX: 50 })[2]!;
    const up = bubble(new Factory("demo", theme), { x: 0, y: 0, w: 100, h: 40, tailAt: "top", apexX: 50 })[2]!;
    expect(down.y).toBe(40);
    expect((down.points as number[][])[1]![1]).toBe(26);
    expect(up.y).toBe(0);
    expect((up.points as number[][])[1]![1]).toBe(-26);
  });
});

describe("burst", () => {
  it("emits one closed star polygon", () => {
    const [el] = burst(new Factory("demo", theme), { cx: 0, cy: 0, r: 30, spikes: 8 });
    expect(el!.type).toBe("line");
    // 8 spikes = 16 alternating points, plus the closing repeat.
    expect((el!.points as number[][]).length).toBe(17);
  });
});

describe("xMark", () => {
  it("emits two crossing lines", () => {
    const els = xMark(new Factory("demo", theme), { x: 0, y: 0, s: 16 });
    expect(els).toHaveLength(2);
    expect(els.every((e) => e.type === "line")).toBe(true);
  });
});

describe("arc", () => {
  it("emits one open line whose first point is [0,0]", () => {
    const [el] = arc(new Factory("demo", theme), { cx: 100, cy: 100, r: 40, startDeg: 0, endDeg: 270 });
    expect(el!.type).toBe("line");
    const pts = el!.points as number[][];
    expect(pts[0]).toEqual([0, 0]);
    expect(pts.length).toBeGreaterThan(8);
    // Open, not closed: last point must differ from the first.
    expect(pts[pts.length - 1]).not.toEqual([0, 0]);
    expect(el!.backgroundColor).toBe(theme.palette.transparent);
  });

  it("starts at the requested angle", () => {
    const f = new Factory("demo", theme);
    const [el] = arc(f, { cx: 100, cy: 100, r: 40, startDeg: 0, endDeg: 90 });
    // 0 degrees is the +x axis, so the arc begins at (cx + r, cy).
    expect(el!.x).toBeCloseTo(140);
    expect(el!.y).toBeCloseTo(100);
  });

  it("spans exactly the quadrants it sweeps", () => {
    // A polyline can only undershoot the true circle, and never by more than the
    // chord sag: r * (1 - cos(step/2)) <= 40 * (1 - cos(6 deg)) = 0.22px here.
    const cases: Array<[number, number, number]> = [
      // [endDeg, expected width, expected height]
      [90, 40, 40],   // one quadrant: +x down to +y
      [180, 80, 40],  // half circle: full width, one side's height
      [270, 80, 80],  // three quadrants: full box, reached from three directions
      [360, 80, 80],  // full circle
    ];
    for (const [endDeg, w, h] of cases) {
      const el = arc(new Factory(`a`, theme), { cx: 0, cy: 0, r: 40, startDeg: 0, endDeg })[0]!;
      expect(Math.abs(Number(el.width) - w), `width at ${endDeg} deg`).toBeLessThan(0.5);
      expect(Math.abs(Number(el.height) - h), `height at ${endDeg} deg`).toBeLessThan(0.5);
    }
  });

  it("sweeps forward, not backwards, when the end angle wraps past 360", () => {
    // spinner's third arc runs 200 -> 470 rather than 200 -> 110 precisely so it
    // sweeps the long way round. If that ever silently reversed, the three spinners
    // would stop reading as a progression.
    const [el] = arc(new Factory("demo", theme), { cx: 0, cy: 0, r: 40, startDeg: 200, endDeg: 470 });
    const angles = (el!.points as number[][]).map(([px, py]) => {
      const ax = (el!.x as number) + px!;
      const ay = (el!.y as number) + py!;
      return (Math.atan2(ay, ax) * 180) / Math.PI;
    });
    // atan2 returns (-180, 180], so compare consecutive samples by their shortest
    // signed step. Every step must be positive (forward) and they must total the
    // requested 270 degree sweep — a backwards arc would total -90.
    const steps = angles.slice(1).map((a, i) => {
      let d = a - angles[i]!;
      while (d <= -180) d += 360;
      while (d > 180) d -= 360;
      return d;
    });
    for (const [i, d] of steps.entries()) {
      expect(d, `sample ${i + 1} runs backwards`).toBeGreaterThan(0);
    }
    expect(steps.reduce((a, b) => a + b, 0)).toBeCloseTo(270, 1);
    // And the first sample really is at 200 degrees.
    expect(((angles[0]! % 360) + 360) % 360).toBeCloseTo(200, 1);
  });
});

describe("dots", () => {
  it("emits one ellipse per dot, evenly spaced", () => {
    const els = dots(new Factory("demo", theme), { x: 10, y: 50, count: 3, gap: 20, r: 5 });
    expect(els).toHaveLength(3);
    expect(els.every((e) => e.type === "ellipse")).toBe(true);
    expect(els.map((e) => e.x)).toEqual([10, 30, 50]);
    expect(els.every((e) => e.width === 10)).toBe(true);
  });
});

describe("swash", () => {
  it("emits one closed filled polygon whose first point is [0,0]", () => {
    const [el] = swash(new Factory("demo", theme), { x: 0, y: 0, w: 120, h: 30 });
    expect(el!.type).toBe("line");
    const pts = el!.points as number[][];
    expect(pts[0]).toEqual([0, 0]);
    expect(pts[pts.length - 1]).toEqual([0, 0]);
    expect(el!.backgroundColor).toBe(theme.palette.muted);
  });

  it("bulges h*0.22 left and h*0.25 right of the w it is given", () => {
    // The side lobes are what make it read as a hand-drawn stroke rather than a box,
    // but they mean the drawn extent is wider than `w`. A caller sizing a highlight
    // off `w` alone under-accounts for h*0.47 of overhang.
    const [el] = swash(new Factory("demo", theme), { x: 100, y: 50, w: 120, h: 30 });
    const xs = (el!.points as number[][]).map(([px]) => (el!.x as number) + px!);
    const ys = (el!.points as number[][]).map(([, py]) => (el!.y as number) + py!);
    expect(Math.min(...xs)).toBeCloseTo(100 - 30 * 0.22, 6);
    expect(Math.max(...xs)).toBeCloseTo(100 + 120 + 30 * 0.25, 6);
    expect(Number(el!.width)).toBeCloseTo(120 + 30 * 0.47, 6);
    // Vertically it rides h*0.12 above the given y and h*0.08 below y + h.
    expect(Math.min(...ys)).toBeCloseTo(50 - 30 * 0.12, 6);
    expect(Math.max(...ys)).toBeCloseTo(50 + 30 * 1.08, 6);
    expect(Number(el!.height)).toBeCloseTo(30 * 1.2, 6);
  });
});

describe("strokeStyle passthrough", () => {
  it("inkBox forwards a dashed stroke style to the surface", () => {
    const els = inkBox(new Factory("demo", theme), { x: 0, y: 0, w: 100, h: 40, strokeStyle: "dashed" });
    expect(els[els.length - 1]!.strokeStyle).toBe("dashed");
  });

  it("fillBand forwards a stroke style", () => {
    const [el] = fillBand(
      new Factory("demo", theme),
      { x: 0, y: 0, w: 100, h: 40, fill: color.accent, rounded: false, strokeStyle: "dotted" },
    );
    expect(el!.strokeStyle).toBe("dotted");
  });
});
