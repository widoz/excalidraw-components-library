import type { ExcalidrawElement } from "./element.js";
import button from "./components/button.js";
import checkboxGroup from "./components/checkbox-group.js";
import dropdownMenu from "./components/dropdown-menu.js";
import input from "./components/input.js";
import radioGroup from "./components/radio-group.js";
import select from "./components/select.js";
import switchComponent from "./components/switch.js";
import textarea from "./components/textarea.js";

export type ComponentBuilder = () => ExcalidrawElement[];

export interface ComponentEntry {
  /** Human-readable name, used as the library item name. */
  title: string;
  build: ComponentBuilder;
}

export const registry: Record<string, ComponentEntry> = {
  button: { title: "Button", build: button },
  "checkbox-group": { title: "Checkbox Group", build: checkboxGroup },
  "dropdown-menu": { title: "Dropdown Menu", build: dropdownMenu },
  input: { title: "Input", build: input },
  "radio-group": { title: "Radio Group", build: radioGroup },
  select: { title: "Select", build: select },
  switch: { title: "Switch", build: switchComponent },
  textarea: { title: "Textarea", build: textarea },
};
