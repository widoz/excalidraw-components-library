import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { compose, parseArgs } from "../scripts/compose.mjs";

const root = join(import.meta.dirname, "..");
const leaf = (component: string, variant?: string) => ({ component, ...(variant ? { variant } : {}) });

describe("compose", () => {
  it("stacks a column with gaps", () => {
    const scene = compose({ type: "column", gap: 10, children: [leaf("button"), leaf("button")] }, { root });
    const ys = scene.elements.map((e: { y: number }) => e.y);
    const first = scene.elements.filter((e: { groupIds: string[] }) => e.groupIds[0] === scene.elements[0].groupIds[0]);
    const firstHeight = Math.max(...first.map((e: { y: number; height: number }) => e.y + e.height));
    expect(Math.min(...ys)).toBe(0);
    expect(ys.some((y) => y >= firstHeight + 10)).toBe(true);
  });

  it("centres children on the cross axis", () => {
    const scene = compose(
      { type: "column", gap: 0, align: "center", children: [leaf("button"), leaf("dialog")] },
      { root },
    );
    const groups = [...new Set(scene.elements.map((e: { groupIds: string[] }) => e.groupIds[0]))];
    const centreOf = (g: string) => {
      const els = scene.elements.filter((e: { groupIds: string[] }) => e.groupIds[0] === g);
      const left = Math.min(...els.map((e: { x: number }) => e.x));
      const right = Math.max(...els.map((e: { x: number; width: number }) => e.x + e.width));
      return (left + right) / 2;
    };
    expect(centreOf(groups[0]!)).toBeCloseTo(centreOf(groups[1]!), 5);
  });

  it("gives repeated components separate groups and unique ids", () => {
    const scene = compose({ type: "row", children: [leaf("button"), leaf("button")] }, { root });
    const ids = scene.elements.map((e: { id: string }) => e.id);
    const groups = new Set(scene.elements.map((e: { groupIds: string[] }) => e.groupIds[0]));
    expect(new Set(ids).size).toBe(ids.length);
    expect(groups.size).toBe(2);
  });

  it("emits strictly ascending index values", () => {
    const scene = compose({ type: "row", children: [leaf("button"), leaf("input")] }, { root });
    const indexes = scene.elements.map((e: { index: string }) => e.index);
    expect([...indexes].sort()).toEqual(indexes);
    expect(new Set(indexes).size).toBe(indexes.length);
  });

  it("is deterministic", () => {
    const layout = { type: "column", children: [leaf("button"), leaf("input")] };
    expect(JSON.stringify(compose(layout, { root }))).toBe(JSON.stringify(compose(layout, { root })));
  });

  it("carries appState from the library", () => {
    const scene = compose(leaf("button"), { root });
    expect(scene.appState.viewBackgroundColor).toMatch(/^#/);
    expect(scene.type).toBe("excalidraw");
  });

  it("rejects an unknown key", () => {
    expect(() => compose({ componnet: "button" } as never, { root })).toThrow(/componnet/);
  });

  it("rejects an empty container", () => {
    expect(() => compose({ type: "column", children: [] }, { root })).toThrow(/at least one child/);
  });

  it("rejects an unknown align value", () => {
    expect(() => compose({ type: "row", align: "middle", children: [leaf("button")] } as never, { root }))
      .toThrow(/align/);
  });

  it("errors when a leaf omits variant and the component has no default variant", () => {
    expect(() => compose(leaf("switch"), { root })).toThrow(/switch has no default variant; pick one of: off, on/);
  });

  it("still defaults to \"default\" for components that have one", () => {
    const scene = compose(leaf("button"), { root });
    expect(scene.elements.length).toBeGreaterThan(0);
  });

  it("replaces a leaf's text", () => {
    const scene = compose({ component: "button", text: "Publish" }, { root });
    const text = scene.elements.find((e: { type: string }) => e.type === "text");
    expect(text.text).toBe("Publish");
  });

  it("reflows neighbours when text grows the component", () => {
    const plain = compose({ type: "row", gap: 10, children: [leaf("button"), leaf("input")] }, { root });
    const grown = compose(
      { type: "row", gap: 10, children: [{ component: "button", text: "Featured image" }, leaf("input")] },
      { root },
    );
    const inputX = (scene: { elements: Array<{ groupIds: string[]; x: number }> }) => {
      const last = scene.elements[scene.elements.length - 1]!.groupIds[0];
      return Math.min(...scene.elements.filter((e) => e.groupIds[0] === last).map((e) => e.x));
    };
    expect(inputX(grown)).toBeGreaterThan(inputX(plain));
  });

  it("moves nothing but the text when it shrinks", () => {
    const plain = compose(leaf("button"), { root });
    const short = compose({ component: "button", text: "Go" }, { root });
    const rects = (s: { elements: Array<{ type: string; x: number; width: number }> }) =>
      s.elements.filter((e) => e.type === "rectangle").map((e) => [e.x, e.width]);
    expect(rects(short)).toEqual(rects(plain));
  });

  it("keeps two instances of one component independent", () => {
    const scene = compose(
      { type: "row", children: [{ component: "button", text: "Publish" }, leaf("button")] },
      { root },
    );
    const texts = scene.elements.filter((e: { type: string }) => e.type === "text").map((e) => e.text);
    expect(texts).toEqual(["Publish", "Click me!"]);
  });

  it("names the component when a text spec is wrong", () => {
    expect(() => compose({ component: "tabs", text: "Post" }, { root })).toThrow(/tabs\/default/);
  });

  it("rejects text on a container", () => {
    expect(() => compose(
      { type: "row", text: "no", children: [leaf("button")] } as never,
      { root },
    )).toThrow(/only valid on a component node/);
  });

  const bounds = (elements: Array<{ x: number; y: number; width: number; height: number }>) => ({
    left: Math.min(...elements.map((e) => e.x)),
    top: Math.min(...elements.map((e) => e.y)),
    right: Math.max(...elements.map((e) => e.x + e.width)),
    bottom: Math.max(...elements.map((e) => e.y + e.height)),
  });

  const panels = (scene: { elements: Array<{ groupIds: string[]; width: number }> }) =>
    scene.elements.filter((e) => e.groupIds[0]!.startsWith("frame-group"));

  it("inflates a framed container by its padding", () => {
    const children = [leaf("button"), leaf("input")];
    const plain = compose({ type: "column", gap: 10, children }, { root });
    const framed = compose({ type: "column", gap: 10, frame: { padding: 20 }, children }, { root });
    const panel = framed.elements[0];
    const inner = bounds(plain.elements);
    expect(panel.width).toBeCloseTo(inner.right - inner.left + 40, 6);
    expect(panel.height).toBeCloseTo(inner.bottom - inner.top + 40, 6);
  });

  it("offsets children by the padding", () => {
    const framed = compose(
      { type: "column", frame: { padding: 20 }, children: [leaf("button")] },
      { root },
    );
    const children = framed.elements.slice(1);
    expect(bounds(children).left).toBeCloseTo(20, 6);
    expect(bounds(children).top).toBeCloseTo(20, 6);
  });

  it("puts the panel behind its children", () => {
    const framed = compose({ type: "column", frame: {}, children: [leaf("button")] }, { root });
    expect(framed.elements[0].type).toBe("rectangle");
    expect(framed.elements[0].backgroundColor).toBe("transparent");
    const indexes = framed.elements.map((e: { index: string }) => e.index);
    expect([...indexes].sort()).toEqual(indexes);
  });

  it("adds a label band above the children", () => {
    const plain = compose({ type: "column", frame: { padding: 10 }, children: [leaf("button")] }, { root });
    const titled = compose(
      { type: "column", frame: { padding: 10, label: "Settings" }, children: [leaf("button")] },
      { root },
    );
    expect(titled.elements[0].height).toBeCloseTo(plain.elements[0].height + 20 * 1.25 + 10, 6);
    expect(titled.elements[1].text).toBe("Settings");
    expect(bounds(titled.elements.slice(2)).top).toBeCloseTo(10 + 20 * 1.25 + 10, 6);
  });

  it("nests frames", () => {
    const scene = compose({
      type: "column",
      frame: { padding: 10 },
      children: [{ type: "row", frame: { padding: 5 }, children: [leaf("button")] }],
    }, { root });
    const found = panels(scene);
    expect(found).toHaveLength(2);
    expect(found[0]!.width).toBeCloseTo(found[1]!.width + 20, 6);
  });

  it("gives each frame its own group", () => {
    const scene = compose({
      type: "column",
      frame: { padding: 10 },
      children: [{ type: "row", frame: { padding: 5 }, children: [leaf("button")] }],
    }, { root });
    const found = panels(scene);
    expect(found[0]!.groupIds[0]).not.toBe(found[1]!.groupIds[0]);
  });

  it("styles the frame from the components it contains", () => {
    const scene = compose({ type: "column", frame: {}, children: [leaf("button")] }, { root });
    const body = scene.elements.find((e: { type: string; width: number }) => e.type === "rectangle" && e.width === 200);
    expect(scene.elements[0].strokeColor).toBe(body.strokeColor);
    expect(scene.elements[0].roughness).toBe(body.roughness);
  });

  it("widens the panel to fit a long label without moving the children", () => {
    const short = compose({ type: "column", frame: { label: "X" }, children: [leaf("badge")] }, { root });
    const long = compose(
      { type: "column", frame: { label: "Project settings and preferences" }, children: [leaf("badge")] },
      { root },
    );
    const childLeft = (scene: typeof short) => bounds(scene.elements.slice(2)).left;
    expect(childLeft(long)).toBeCloseTo(childLeft(short), 6);
    expect((long.elements[0] as { width: number }).width).toBeGreaterThan(
      (short.elements[0] as { width: number }).width,
    );
  });

  it("rejects a bad frame", () => {
    expect(() => compose(
      { type: "row", frame: { padding: -1 }, children: [leaf("button")] },
      { root },
    )).toThrow(/padding must be a number >= 0/);
  });

  it("rejects a frame on a leaf", () => {
    expect(() => compose({ component: "button", frame: {} } as never, { root })).toThrow(/frame/);
  });
});

describe("parseArgs", () => {
  it("parses a compose invocation", () => {
    expect(parseArgs(["layout.json", "-o", "out.excalidraw", "--preset", "soft"]))
      .toEqual({ command: "compose", layoutPath: "layout.json", outPath: "out.excalidraw", preset: "soft" });
  });

  it("parses list", () => {
    expect(parseArgs(["list"])).toEqual({ command: "list", preset: undefined });
  });

  it("requires an output path", () => {
    expect(() => parseArgs(["layout.json"])).toThrow(/-o/);
  });
});
