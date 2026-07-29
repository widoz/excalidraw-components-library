import { Factory, type ExcalidrawElement } from "../element.js";
import { chevron, color, font, inkCircle, label, size } from "../comic.js";

const W = 320;
const HEADER_H = 48;
const WEEKDAY_H = 28;
const ROW_H = 40;
const COL_PITCH = 44;
// Seven columns at COL_PITCH span 308px; centre that run inside the 320-wide frame.
const GRID_ORIGIN_X = (W - COL_PITCH * 7) / 2;
const CHEVRON_S = 8;

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/** Month starts on a Wednesday, so the first two cells of week 1 are blank. */
const START_DAY = 3;
const DAYS_IN_MONTH = 31;
const SELECTED_DAY = 17;
const TODAY = 24;

/** Header, weekday row, and a 7x5 day grid with a selected day and a today marker. */
export default function calendar(): ExcalidrawElement[] {
  const f = new Factory("calendar");
  const els: ExcalidrawElement[] = [];

  els.push(...chevron(f, {
    x: 8,
    y: HEADER_H / 2 - CHEVRON_S,
    s: CHEVRON_S,
    dir: "left",
  }));
  els.push(...label(f, {
    x: W / 2,
    y: (HEADER_H - size.fontMd * 1.25) / 2,
    text: "July 2026",
    fontSize: size.fontMd,
    fontFamily: font.comic,
    align: "center",
  }));
  els.push(...chevron(f, {
    x: W - 8 - CHEVRON_S * 0.7,
    y: HEADER_H / 2 - CHEVRON_S,
    s: CHEVRON_S,
    dir: "right",
  }));

  const weekdayY = HEADER_H;
  WEEKDAYS.forEach((day, c) => {
    els.push(...label(f, {
      x: GRID_ORIGIN_X + c * COL_PITCH + COL_PITCH / 2,
      y: weekdayY + (WEEKDAY_H - size.fontSm * 1.25) / 2,
      text: day,
      fontSize: size.fontSm,
      stroke: color.mutedText,
      align: "center",
    }));
  });

  const gridY = weekdayY + WEEKDAY_H;
  for (let day = 1; day <= DAYS_IN_MONTH; day++) {
    const cellIndex = START_DAY + day - 1;
    const row = Math.floor(cellIndex / 7);
    const col = cellIndex % 7;
    const cx = GRID_ORIGIN_X + col * COL_PITCH + COL_PITCH / 2;
    const cy = gridY + row * ROW_H + ROW_H / 2;

    if (day === SELECTED_DAY) {
      els.push(...inkCircle(f, { cx, cy, r: 16, fill: color.accent, shadow: false }));
      els.push(...label(f, {
        x: cx,
        y: cy - (size.fontSm * 1.25) / 2,
        text: String(day),
        fontSize: size.fontSm,
        fontFamily: font.comic,
        stroke: color.accentText,
        align: "center",
      }));
    } else if (day === TODAY) {
      els.push(...inkCircle(f, { cx, cy, r: 16, fill: color.transparent, shadow: false }));
      els.push(...label(f, {
        x: cx,
        y: cy - (size.fontSm * 1.25) / 2,
        text: String(day),
        fontSize: size.fontSm,
        align: "center",
      }));
    } else {
      els.push(...label(f, {
        x: cx,
        y: cy - (size.fontSm * 1.25) / 2,
        text: String(day),
        fontSize: size.fontSm,
        align: "center",
      }));
    }
  }

  return els;
}
