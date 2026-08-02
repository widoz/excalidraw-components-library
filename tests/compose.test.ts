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
