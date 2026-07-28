import type { ExcalidrawElement } from "./element.js";
import button from "./components/button.js";

export type ComponentBuilder = () => ExcalidrawElement[];

export interface ComponentEntry {
  /** Human-readable name, used as the library item name. */
  title: string;
  build: ComponentBuilder;
}

export const registry: Record<string, ComponentEntry> = {
  button: { title: "Button", build: button },
};
