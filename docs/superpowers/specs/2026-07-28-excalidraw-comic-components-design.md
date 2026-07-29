# Excalidraw Comic Components Library — Design

Date: 2026-07-28

## Goal

A library of hand-drawn, comic-styled UI components for Excalidraw, modelled on the
shadcn/ui component set. Each component is a separate file. The look is deliberately
sloppy: thick wobbly ink, flat fills, hard offset shadows. Colours come from the
shadcn **zinc** scale.

## Deliverables

- `dist/components/<name>.excalidraw` — one openable scene per component (20 files).
- `dist/comic-ui.excalidrawlib` — a single library bundle containing all 20 components
  as library items, importable into Excalidraw in one click.

Both are generated. `dist/` is committed so the library is usable without a build.

## Non-goals

- No React/HTML rendering. The output is Excalidraw JSON only.
- No interactivity, no theming beyond the single zinc palette.
- Not the full ~55 shadcn component list. Twenty components in this pass.

## Architecture

A small TypeScript project. `npm run build` writes `dist/`.

```
src/
  tokens.ts        zinc palette, spacing, sizing, font ids
  element.ts       low-level Excalidraw element factories
  comic.ts         style helpers built on element.ts
  scene.ts         wraps elements into .excalidraw / .excalidrawlib file shapes
  registry.ts      name -> component builder map
  components/      one file per component, 20 files
  build.ts         entry point: iterate registry, write files
  validate.ts      structural checks over generated output
tests/
  *.test.ts        vitest
dist/              generated output (committed)
```

### Layering

Each layer only knows the one below it.

| Module | Purpose | Depends on |
|---|---|---|
| `tokens.ts` | Named constants. No logic. | — |
| `element.ts` | Produce a single valid Excalidraw element of a given type. Handles ids, seeds, fractional `index`, and every mandatory field. | `tokens` |
| `comic.ts` | The house style. `inkBox`, `inkCircle`, `fillBand`, `label`, `rule`, `bubble`, `burst`, `checkMark`, `chevron`, `xMark`. | `element`, `tokens` |
| `components/*.ts` | Compose comic helpers into one component. Export `default (): ExcalidrawElement[]`. | `comic`, `element`, `tokens` |
| `scene.ts` | Serialise an element list into the two file formats. | — |
| `build.ts` | Orchestration and file writes. | all |

The key boundary: **`element.ts` is the only module that writes raw element JSON.**
`comic.ts` is where the house style lives — outlines, hard shadows, fills, tails —
and most of what a component draws flows through it, so that is the first place to
change when restyling. It is not the only place: a component may drop to a `Factory`
primitive for a one-off shape (a caret, a tab header, an avatar glyph). Six of the
twenty do — `avatar`, `dialog`, `input`, `radio-group`, `tabs`, `textarea`. Those call
sites carry their own rounding, opacity and inset decisions, so a restyle has to sweep
them too.

## Visual style

Applied by `comic.ts` to every shape:

- `roughness: 2` (Excalidraw's "artist" setting)
- `strokeWidth: 4` (bold ink)
- `fillStyle: "solid"` (flat comic fills, not hachure)
- `roundness: { type: 3 }` on rectangles, `null` where a hard corner reads better
- `seed` and `versionNonce` randomised per element from a **seeded PRNG**, so builds are
  deterministic but no two strokes wobble identically

### Hard shadow

Every raised surface is drawn as two rectangles: a solid `ink` rectangle offset by
`+6, +6`, emitted *first* (so it sits behind), then the surface rectangle on top.
`comic.inkBox()` returns both.

### Fonts

- Body / labels: `fontFamily: 1` (Excalifont — Excalidraw's default hand-drawn face)
- Emphasis, headings, burst text: `fontFamily: 7` (Comic Shanns)

Excalidraw falls back gracefully on an unknown font id, so this is safe.

### Palette (shadcn zinc)

| Token | Hex | Use |
|---|---|---|
| `ink` | `#18181b` | zinc-900 — all outlines, shadows, primary text |
| `surface` | `#fafafa` | zinc-50 — default component fill |
| `muted` | `#e4e4e7` | zinc-200 — tracks, disabled, table stripes |
| `border` | `#d4d4d8` | zinc-300 — secondary lines |
| `subtle` | `#a1a1aa` | zinc-400 — placeholder text |
| `mutedText` | `#71717a` | zinc-500 — secondary text |
| `accent` | `#3f3f46` | zinc-700 — filled/active state |
| `accentText` | `#fafafa` | text on `accent` |

`#27272a` (zinc-800) and `#09090b` (zinc-950) are defined in `tokens.ts` but reserved.

## Components

Twenty files. Each renders **realistic states**, not a bare shape, so the file reads as a
real piece of UI.

| File | What it shows |
|---|---|
| `button.ts` | Three buttons stacked: default (accent fill), secondary (surface), disabled (muted, no shadow) |
| `input.ts` | Two fields: one with placeholder text, one focused with a doubled outline and caret |
| `checkbox-group.ts` | Three stacked checkboxes with labels: checked, unchecked, checked |
| `radio-group.ts` | Three stacked radios with labels, second one selected |
| `switch.ts` | Two switches: off (knob left, muted track), on (knob right, accent track) |
| `select.ts` | Closed trigger with chevron, plus the open menu below with a highlighted item |
| `textarea.ts` | Multi-line box with ruled placeholder lines and a corner resize grip |
| `card.ts` | Title, description lines, and a footer button |
| `badge.ts` | Row of four badges: default, secondary, outline, destructive-as-dark |
| `alert.ts` | Icon slot, title, body — with a small comic **burst** behind the icon |
| `avatar.ts` | Row of three: image-placeholder circle, initials circle, overlapping stack |
| `tabs.ts` | Three tab headers with the first active, plus the panel below |
| `table.ts` | Header row, three body rows, alternating `muted` stripes |
| `progress.ts` | Two bars at ~35% and ~80% |
| `slider.ts` | Track, filled portion, round knob, plus a value bubble above the knob |
| `tooltip.ts` | A trigger button with a comic **speech bubble** and tail pointing at it |
| `dialog.ts` | Comic **panel** frame: title, body lines, two footer buttons, close X |
| `dropdown-menu.ts` | Trigger plus open menu: four items, one hovered, one separator |
| `breadcrumb.ts` | Three crumbs with hand-drawn chevron separators, last one bold |
| `pagination.ts` | Prev arrow, pages 1–5, next arrow, page 2 active |

Comic extras (burst, bubble, panel) appear only where noted — `alert`, `tooltip`,
`slider`, `dialog`.

### Grouping

All elements of one component share a single `groupIds: [<groupId>]`, so the component
drags, copies and scales as one unit in Excalidraw.

### Layout

Each component is laid out with its top-left near `(0, 0)`. Canonical control width is
`320`. `build.ts` does not reposition. `appState` carries no scroll or zoom keys, so
Excalidraw applies its own scroll-to-content on open.

## File formats

Scene (`.excalidraw`):

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "excalidraw-comic-components",
  "elements": [],
  "appState": { "gridSize": null, "viewBackgroundColor": "#ffffff" },
  "files": {}
}
```

Library (`.excalidrawlib`):

```json
{
  "type": "excalidrawlib",
  "version": 2,
  "source": "excalidraw-comic-components",
  "libraryItems": [
    { "id": "Button", "status": "unpublished", "created": 0, "name": "Button", "elements": [] }
  ]
}
```

`created` is a fixed `0` rather than `Date.now()` so builds are byte-identical. For the
same reason `id` is the item's display name rather than a random uuid: Excalidraw only
needs it to be unique within the file, and a name is both unique and stable.

## Element correctness

`element.ts` is the only place that writes element JSON, and it always emits the full
mandatory field set:

`id, type, x, y, width, height, angle, strokeColor, backgroundColor, fillStyle,`
`strokeWidth, strokeStyle, roughness, opacity, groupIds, frameId, index, roundness,`
`seed, version, versionNonce, isDeleted, boundElements, updated, link, locked`

Type-specific additions:

- **text**: `text, fontSize, fontFamily, textAlign, verticalAlign, containerId,`
  `originalText, autoResize, lineHeight`
- **line / arrow**: `points, lastCommittedPoint, startBinding, endBinding,`
  `startArrowhead, endArrowhead`

`index` uses ascending fractional-index strings (`a0`, `a1`, `a2`, …) assigned in emission
order, which is also z-order. Shadows are emitted before their surfaces.

Text is drawn as **standalone text elements positioned by the caller**, not as
container-bound text. Bound text requires Excalidraw to re-measure with the real font at
load time and reflows unpredictably; free text is stable. `containerId` is therefore
always `null` and `boundElements` always `null`.

## Determinism

A seeded PRNG (`mulberry32`, fixed seed per component name) drives ids, `seed` and
`versionNonce`. Two builds of unchanged source produce identical bytes, so `dist/` diffs
stay readable.

## Testing

`vitest`, plus `validate.ts` runnable standalone via `npm run validate`.

Structural checks over every generated file:

1. The file parses as JSON and has the correct `type` / `version`.
2. Every element has all mandatory fields, non-empty `id`, finite numeric geometry.
3. Element ids are unique within a file.
4. `index` values are strictly ascending.
5. Every `containerId`, `boundElements` id, `startBinding.elementId`, `endBinding.elementId`
   resolves to an element present in the same file.
6. Every `strokeColor` / `backgroundColor` is a value from `tokens.ts` or `"transparent"`.
7. Every element carries exactly one groupId, and it is the same across the file.
8. Two consecutive builds produce identical output (determinism check).

Per-component tests assert the expected element count and that named states exist (e.g.
`checkbox-group` contains exactly two check marks).

The failure mode this targets: a file Excalidraw silently refuses to open, or opens with
elements scattered/unstyled.

## Build and scripts

- `npm run build` — regenerate `dist/`
- `npm run validate` — structural checks on `dist/`
- `npm test` — vitest
- `npm run check` — build, then validate, then test

## Usage

Import `dist/comic-ui.excalidrawlib` into Excalidraw via **Library → Load from file**, or
open any `dist/components/<name>.excalidraw` directly and copy what you need.
