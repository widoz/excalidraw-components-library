import type { ExcalidrawElement } from "./element.js";
import type { Theme } from "./theme.js";
import type { ComponentOutput } from "./variants.js";
import accordion from "./components/accordion.js";
import alert from "./components/alert.js";
import alertDialog from "./components/alert-dialog.js";
import aspectRatio from "./components/aspect-ratio.js";
import attachment from "./components/attachment.js";
import avatar from "./components/avatar.js";
import badge from "./components/badge.js";
import breadcrumb from "./components/breadcrumb.js";
import bubble from "./components/bubble.js";
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
import contextMenu from "./components/context-menu.js";
import datePicker from "./components/date-picker.js";
import dialog from "./components/dialog.js";
import drawer from "./components/drawer.js";
import dropdownMenu from "./components/dropdown-menu.js";
import empty from "./components/empty.js";
import field from "./components/field.js";
import hoverCard from "./components/hover-card.js";
import input from "./components/input.js";
import inputGroup from "./components/input-group.js";
import inputOtp from "./components/input-otp.js";
import item from "./components/item.js";
import kbd from "./components/kbd.js";
import labelComponent from "./components/label.js";
import marker from "./components/marker.js";
import menubar from "./components/menubar.js";
import message from "./components/message.js";
import navigationMenu from "./components/navigation-menu.js";
import pagination from "./components/pagination.js";
import popover from "./components/popover.js";
import progress from "./components/progress.js";
import radioGroup from "./components/radio-group.js";
import resizable from "./components/resizable.js";
import scrollArea from "./components/scroll-area.js";
import select from "./components/select.js";
import separator from "./components/separator.js";
import sheet from "./components/sheet.js";
import sidebar from "./components/sidebar.js";
import skeleton from "./components/skeleton.js";
import slider from "./components/slider.js";
import spinner from "./components/spinner.js";
import switchComponent from "./components/switch.js";
import table from "./components/table.js";
import tabs from "./components/tabs.js";
import textarea from "./components/textarea.js";
import toast from "./components/toast.js";
import toggle from "./components/toggle.js";
import toggleGroup from "./components/toggle-group.js";
import tooltip from "./components/tooltip.js";

export type ComponentBuilder = (theme: Theme) => ExcalidrawElement[] | ComponentOutput;

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
  attachment: { title: "Attachment", build: attachment },
  avatar: { title: "Avatar", build: avatar },
  badge: { title: "Badge", build: badge },
  breadcrumb: { title: "Breadcrumb", build: breadcrumb },
  bubble: { title: "Bubble", build: bubble },
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
  "context-menu": { title: "Context Menu", build: contextMenu },
  "date-picker": { title: "Date Picker", build: datePicker },
  dialog: { title: "Dialog", build: dialog },
  drawer: { title: "Drawer", build: drawer },
  "dropdown-menu": { title: "Dropdown Menu", build: dropdownMenu },
  empty: { title: "Empty", build: empty },
  field: { title: "Field", build: field },
  "hover-card": { title: "Hover Card", build: hoverCard },
  input: { title: "Input", build: input },
  "input-group": { title: "Input Group", build: inputGroup },
  "input-otp": { title: "Input OTP", build: inputOtp },
  item: { title: "Item", build: item },
  kbd: { title: "Kbd", build: kbd },
  label: { title: "Label", build: labelComponent },
  marker: { title: "Marker", build: marker },
  menubar: { title: "Menubar", build: menubar },
  message: { title: "Message", build: message },
  "navigation-menu": { title: "Navigation Menu", build: navigationMenu },
  pagination: { title: "Pagination", build: pagination },
  popover: { title: "Popover", build: popover },
  progress: { title: "Progress", build: progress },
  "radio-group": { title: "Radio Group", build: radioGroup },
  resizable: { title: "Resizable", build: resizable },
  "scroll-area": { title: "Scroll Area", build: scrollArea },
  select: { title: "Select", build: select },
  separator: { title: "Separator", build: separator },
  sheet: { title: "Sheet", build: sheet },
  sidebar: { title: "Sidebar", build: sidebar },
  skeleton: { title: "Skeleton", build: skeleton },
  slider: { title: "Slider", build: slider },
  spinner: { title: "Spinner", build: spinner },
  switch: { title: "Switch", build: switchComponent },
  table: { title: "Table", build: table },
  tabs: { title: "Tabs", build: tabs },
  textarea: { title: "Textarea", build: textarea },
  toast: { title: "Toast", build: toast },
  toggle: { title: "Toggle", build: toggle },
  "toggle-group": { title: "Toggle Group", build: toggleGroup },
  tooltip: { title: "Tooltip", build: tooltip },
};
