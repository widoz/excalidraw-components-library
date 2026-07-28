import type { ExcalidrawElement } from "./element.js";
import { color } from "./tokens.js";

export const SOURCE = "excalidraw-comic-components";

export function toScene(elements: ExcalidrawElement[]): object {
  return {
    type: "excalidraw",
    version: 2,
    source: SOURCE,
    elements,
    appState: { gridSize: null, viewBackgroundColor: color.canvas },
    files: {},
  };
}

export interface LibraryItemInput {
  name: string;
  elements: ExcalidrawElement[];
}

export function toLibrary(items: LibraryItemInput[]): object {
  return {
    type: "excalidrawlib",
    version: 2,
    source: SOURCE,
    libraryItems: items.map((item) => ({
      // Stable id and created timestamp keep builds byte-identical.
      id: item.name,
      status: "unpublished",
      created: 0,
      name: item.name,
      elements: item.elements,
    })),
  };
}
