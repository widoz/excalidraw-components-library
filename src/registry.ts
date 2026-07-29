import type { ExcalidrawElement } from "./element.js";
import accordion from "./components/accordion.js";
import alert from "./components/alert.js";
import alertDialog from "./components/alert-dialog.js";
import aspectRatio from "./components/aspect-ratio.js";
import avatar from "./components/avatar.js";
import badge from "./components/badge.js";
import breadcrumb from "./components/breadcrumb.js";
import button from "./components/button.js";
import buttonGroup from "./components/button-group.js";
import calendar from "./components/calendar.js";
import card from "./components/card.js";
import carousel from "./components/carousel.js";
import chart from "./components/chart.js";
import checkboxGroup from "./components/checkbox-group.js";
import collapsible from "./components/collapsible.js";
import combobox from "./components/combobox.js";
import command from "./components/command.js";
import dialog from "./components/dialog.js";
import dropdownMenu from "./components/dropdown-menu.js";
import input from "./components/input.js";
import pagination from "./components/pagination.js";
import progress from "./components/progress.js";
import radioGroup from "./components/radio-group.js";
import select from "./components/select.js";
import slider from "./components/slider.js";
import switchComponent from "./components/switch.js";
import table from "./components/table.js";
import tabs from "./components/tabs.js";
import textarea from "./components/textarea.js";
import tooltip from "./components/tooltip.js";

export type ComponentBuilder = () => ExcalidrawElement[];

export interface ComponentEntry {
  /** Human-readable name, used as the library item name. */
  title: string;
  build: ComponentBuilder;
}

export const registry: Record<string, ComponentEntry> = {
  accordion: { title: "Accordion", build: accordion },
  alert: { title: "Alert", build: alert },
  "alert-dialog": { title: "Alert Dialog", build: alertDialog },
  "aspect-ratio": { title: "Aspect Ratio", build: aspectRatio },
  avatar: { title: "Avatar", build: avatar },
  badge: { title: "Badge", build: badge },
  breadcrumb: { title: "Breadcrumb", build: breadcrumb },
  button: { title: "Button", build: button },
  "button-group": { title: "Button Group", build: buttonGroup },
  calendar: { title: "Calendar", build: calendar },
  card: { title: "Card", build: card },
  carousel: { title: "Carousel", build: carousel },
  chart: { title: "Chart", build: chart },
  "checkbox-group": { title: "Checkbox Group", build: checkboxGroup },
  collapsible: { title: "Collapsible", build: collapsible },
  combobox: { title: "Combobox", build: combobox },
  command: { title: "Command", build: command },
  dialog: { title: "Dialog", build: dialog },
  "dropdown-menu": { title: "Dropdown Menu", build: dropdownMenu },
  input: { title: "Input", build: input },
  pagination: { title: "Pagination", build: pagination },
  progress: { title: "Progress", build: progress },
  "radio-group": { title: "Radio Group", build: radioGroup },
  select: { title: "Select", build: select },
  slider: { title: "Slider", build: slider },
  switch: { title: "Switch", build: switchComponent },
  table: { title: "Table", build: table },
  tabs: { title: "Tabs", build: tabs },
  textarea: { title: "Textarea", build: textarea },
  tooltip: { title: "Tooltip", build: tooltip },
};
