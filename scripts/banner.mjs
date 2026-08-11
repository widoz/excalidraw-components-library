// Builds the README banner: docs/banner.svg, then docs/banner.png through headless
// Chrome. The background is the real committed output — every shape comes from
// dist/default/components/*.excalidraw, drawn with the same rough.js the Excalidraw
// canvas uses and the same per-element seed, so the wobble matches the library.
//
//   node scripts/banner.mjs            # svg + png
//   node scripts/banner.mjs --svg-only # svg only
//
// Set CHROME to override the browser path.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import rough from "roughjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const COMPONENTS_DIR = join(REPO_ROOT, "dist", "default", "components");
const SVG_PATH = join(REPO_ROOT, "docs", "banner.svg");
const PNG_PATH = join(REPO_ROOT, "docs", "banner.png");

const WIDTH = 1280;
const HEIGHT = 400;
const SCALE = 2; // a 2560×800 png, so the banner stays sharp on a retina screen

const TITLE = "Excalidraw Components Library";
const TITLE_FONT = "Bradley Hand";
const TITLE_SIZE = 58;
const INK = "#18181b";

/** Hand-drawn faces stand in for the Excalidraw web fonts, which are not installed. */
const FONTS = {
  6: "Nunito, sans-serif", // Nunito is the one body face that is a normal typeface
};
const DEFAULT_FONT = `'${TITLE_FONT}', 'Comic Sans MS', cursive`;

/**
 * The row bands the components are laid into. Each is a strip across the whole banner;
 * the first and last sit outside the frame on purpose, so the grid reads as a field the
 * banner is cut out of rather than a row of tiles.
 */
const ROWS = [
  { y: -34, height: 112 },
  { y: 88, height: 120 },
  { y: 216, height: 120 },
  { y: 342, height: 112 },
];

/** Picked for silhouette: each one is recognisable at a glance and at a small size. */
const PICKS = [
  "card", "calendar", "chart", "button", "table", "slider",
  "tabs", "avatar", "select", "kbd", "toast", "progress",
  "dialog", "switch", "badge", "sidebar", "checkbox-group", "menubar",
  "input", "bubble", "toggle-group", "carousel", "command", "pagination",
  "hover-card", "input-otp", "context-menu", "date-picker",
];

function loadComponent(name) {
  const path = join(COMPONENTS_DIR, `${name}.excalidraw`);
  if (!existsSync(path)) throw new Error(`No component at ${path}. Run npm run build first.`);
  const elements = JSON.parse(readFileSync(path, "utf8")).elements.filter((e) => !e.isDeleted);
  const box = elements.reduce(
    (acc, e) => {
      const [x, y, w, h] = bounds(e);
      return {
        minX: Math.min(acc.minX, x), minY: Math.min(acc.minY, y),
        maxX: Math.max(acc.maxX, x + w), maxY: Math.max(acc.maxY, y + h),
      };
    },
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
  return { name, elements, box };
}

function bounds(element) {
  if (element.type === "line") {
    const xs = element.points.map(([px]) => element.x + px);
    const ys = element.points.map(([, py]) => element.y + py);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
  }
  return [element.x, element.y, element.width, element.height];
}

const generator = rough.generator();

function roughOptions(element) {
  const filled = element.backgroundColor && element.backgroundColor !== "transparent";
  return {
    seed: element.seed,
    roughness: element.roughness,
    stroke: element.strokeColor,
    strokeWidth: element.strokeWidth,
    fill: filled ? element.backgroundColor : undefined,
    fillStyle: "solid",
    disableMultiStroke: false,
  };
}

/**
 * Excalidraw's adaptive corner radius: a quarter of the shorter side, capped. Rough.js
 * has no rounded rectangle, so a rounded path is roughened instead.
 */
function roundedRectPath(x, y, w, h) {
  const r = Math.min(32, Math.min(w, h) * 0.25);
  return [
    `M${x + r} ${y}`, `L${x + w - r} ${y}`, `Q${x + w} ${y} ${x + w} ${y + r}`,
    `L${x + w} ${y + h - r}`, `Q${x + w} ${y + h} ${x + w - r} ${y + h}`,
    `L${x + r} ${y + h}`, `Q${x} ${y + h} ${x} ${y + h - r}`,
    `L${x} ${y + r}`, `Q${x} ${y} ${x + r} ${y}`, "Z",
  ].join(" ");
}

function escapeText(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function drawableToSvg(drawable) {
  return generator
    .toPaths(drawable)
    .map((path) => {
      const fill = path.fill && path.fill !== "none" ? path.fill : "none";
      return `<path d="${path.d}" stroke="${path.stroke}" stroke-width="${path.strokeWidth}" fill="${fill}"/>`;
    })
    .join("");
}

function elementToSvg(element) {
  const options = roughOptions(element);
  switch (element.type) {
    case "rectangle": {
      const drawable = element.roundness
        ? generator.path(roundedRectPath(element.x, element.y, element.width, element.height), options)
        : generator.rectangle(element.x, element.y, element.width, element.height, options);
      return drawableToSvg(drawable);
    }
    case "ellipse":
      return drawableToSvg(generator.ellipse(
        element.x + element.width / 2, element.y + element.height / 2,
        element.width, element.height, options,
      ));
    case "line":
      return drawableToSvg(generator.linearPath(
        element.points.map(([px, py]) => [element.x + px, element.y + py]),
        { ...options, fill: undefined },
      ));
    case "text": {
      const font = FONTS[element.fontFamily] ?? DEFAULT_FONT;
      const anchor = element.textAlign === "center" ? "middle"
        : element.textAlign === "right" ? "end" : "start";
      const x = element.textAlign === "center" ? element.x + element.width / 2
        : element.textAlign === "right" ? element.x + element.width : element.x;
      // Excalidraw places `y` at the top of the line box; the baseline sits about
      // four fifths of the way down it.
      const y = element.y + element.fontSize * 0.8;
      return `<text x="${x}" y="${y}" font-family="${font}" font-size="${element.fontSize}" `
        + `fill="${element.strokeColor}" text-anchor="${anchor}">${escapeText(element.text)}</text>`;
    }
    default:
      return "";
  }
}

/** Lays the picks across the row bands, left to right, until the band is full. */
function layout() {
  const parts = [];
  let pick = 0;
  for (const row of ROWS) {
    let x = -40;
    while (x < WIDTH + 40) {
      const component = loadComponent(PICKS[pick % PICKS.length]);
      pick += 1;
      const width = component.box.maxX - component.box.minX;
      const height = component.box.maxY - component.box.minY;
      const scale = Math.min(row.height / height, 210 / width);
      const body = component.elements.map(elementToSvg).join("");
      const dx = x - component.box.minX * scale;
      // Sit each one on the band's baseline, so tall and short components share a floor.
      const dy = row.y + row.height - height * scale - component.box.minY * scale;
      parts.push(`<g transform="translate(${dx.toFixed(2)} ${dy.toFixed(2)}) scale(${scale.toFixed(4)})">${body}</g>`);
      x += width * scale + 28;
    }
  }
  return parts.join("\n");
}

function svg() {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">`,
    "<defs>",
    '<radialGradient id="clearing" cx="50%" cy="50%" r="50%">',
    '<stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>',
    '<stop offset="58%" stop-color="#ffffff" stop-opacity="1"/>',
    '<stop offset="78%" stop-color="#ffffff" stop-opacity="0.82"/>',
    '<stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>',
    "</radialGradient>",
    "</defs>",
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>`,
    `<g opacity="0.85">${layout()}</g>`,
    `<ellipse cx="${WIDTH / 2}" cy="${HEIGHT / 2}" rx="640" ry="212" fill="url(#clearing)"/>`,
    `<text x="${WIDTH / 2}" y="${HEIGHT / 2 + TITLE_SIZE * 0.34}" text-anchor="middle" `
      + `font-family="'${TITLE_FONT}', 'Comic Sans MS', cursive" font-weight="bold" `
      + `font-size="${TITLE_SIZE}" fill="${INK}">${escapeText(TITLE)}</text>`,
    "</svg>",
  ].join("\n");
}

function renderPng() {
  const chrome = process.env["CHROME"]
    ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (!existsSync(chrome)) {
    throw new Error(`No browser at ${chrome}. Set CHROME to one, or pass --svg-only.`);
  }
  execFileSync(chrome, [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    `--force-device-scale-factor=${SCALE}`,
    `--window-size=${WIDTH},${HEIGHT}`,
    `--screenshot=${PNG_PATH}`,
    `file://${SVG_PATH}`,
  ], { stdio: "ignore" });
}

writeFileSync(SVG_PATH, `${svg()}\n`);
console.log(`Wrote ${SVG_PATH}`);
if (!process.argv.includes("--svg-only")) {
  renderPng();
  console.log(`Wrote ${PNG_PATH}`);
}
