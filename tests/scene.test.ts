import { describe, expect, it } from "vitest";
import { Factory } from "../src/element.js";
import { SOURCE, toLibrary, toScene } from "../src/scene.js";
import { color } from "../src/tokens.js";

const els = () => [new Factory("demo").rect({ x: 0, y: 0, w: 10, h: 10 })];

describe("toScene", () => {
  it("wraps elements in a valid scene envelope", () => {
    const scene = toScene(els()) as Record<string, unknown>;
    expect(scene.type).toBe("excalidraw");
    expect(scene.version).toBe(2);
    expect(scene.source).toBe(SOURCE);
    expect(scene.files).toEqual({});
    expect(scene.appState).toEqual({ gridSize: null, viewBackgroundColor: color.canvas });
    expect(scene.elements).toHaveLength(1);
  });
});

describe("toLibrary", () => {
  it("wraps items in a valid library envelope", () => {
    const lib = toLibrary([{ name: "Button", elements: els() }]) as Record<string, unknown>;
    expect(lib.type).toBe("excalidrawlib");
    expect(lib.version).toBe(2);
    expect(lib.source).toBe(SOURCE);
    const items = lib.libraryItems as Array<Record<string, unknown>>;
    expect(items).toHaveLength(1);
    expect(items[0]!.name).toBe("Button");
    expect(items[0]!.status).toBe("unpublished");
    expect(items[0]!.created).toBe(0);
    expect(items[0]!.id).toBe("Button");
  });

  it("is deterministic", () => {
    expect(toLibrary([{ name: "Button", elements: els() }]))
      .toEqual(toLibrary([{ name: "Button", elements: els() }]));
  });
});
