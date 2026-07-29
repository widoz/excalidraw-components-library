# Excalidraw Comic Components Library — Design

Date: 2026-07-28

## Goal

A library of hand-drawn, comic-styled UI components for Excalidraw, modelled on the
shadcn/ui component set. Each component is a separate file. The look is deliberately
sloppy: thick wobbly ink, flat fills, hard offset shadows. Colours come from the
shadcn **zinc** scale.

## Deliverables

- `dist/components/<name>.excalidraw` — one openable scene per component (58 files).
- `dist/comic-ui.excalidrawlib` — a single library bundle containing all 58 components
  as library items, importable into Excalidraw in one click.

Both are generated. `dist/` is committed so the library is usable without a build.

## Non-goals

- No React/HTML rendering. The output is Excalidraw JSON only.
- No interactivity, no theming beyond the single zinc palette.
- All 58 components across both passes now cover the shadcn/ui set targeted for this
  library; further shadcn components remain out of scope.

## Architecture

A small TypeScript project. `npm run build` writes `dist/`.

```
src/
  tokens.ts        zinc palette, spacing, sizing, font ids
  element.ts       low-level Excalidraw element factories
  comic.ts         style helpers built on element.ts
  scene.ts         wraps elements into .excalidraw / .excalidrawlib file shapes
  registry.ts      name -> component builder map
  components/      one file per component, 58 files
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
| `comic.ts` | The house style. `inkBox`, `inkCircle`, `fillBand`, `label`, `rule`, `bubble`, `burst`, `checkMark`, `chevron`, `xMark`, `arc`, `dots`, `swash`. | `element`, `tokens` |
| `components/*.ts` | Compose comic helpers into one component. Export `default (): ExcalidrawElement[]`. | `comic`, `element`, `tokens` |
| `scene.ts` | Serialise an element list into the two file formats. | — |
| `build.ts` | Orchestration and file writes. | all |

The key boundary: **`element.ts` is the only module that writes raw element JSON.**
`comic.ts` is where the house style lives — outlines, hard shadows, fills, tails —
and most of what a component draws flows through it, so that is the first place to
change when restyling. It is not the only place: a component may drop to a `Factory`
primitive for a one-off shape (a caret, a tab header, an avatar glyph). Twenty-two of
the fifty-eight do (confirmed by `grep -lE '\bf\.(rect|ellipse|line|text)\(' src/components/*.ts | wc -l`) —
`alert-dialog`, `aspect-ratio`, `attachment`, `avatar`, `button-group`, `chart`,
`command`, `date-picker`, `dialog`, `field`, `input`, `input-group`, `input-otp`,
`radio-group`, `resizable`, `separator`, `sheet`, `skeleton`, `tabs`, `textarea`,
`toast`, `toggle-group`. Those call sites carry their own rounding, opacity and inset
decisions, so a restyle has to sweep them too.

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

Fifty-eight files, across two passes (the first twenty, then thirty-eight more). Each
renders **realistic states**, not a bare shape, so the file reads as a real piece of UI.

| File | What it shows |
|---|---|
| `accordion.ts` | Three stacked rows; the first is expanded with a ruled body underneath it |
| `alert.ts` | Icon slot with a comic burst behind it, plus a title and body |
| `alert-dialog.ts` | Comic panel frame that forces a choice: no close X, two footer buttons |
| `aspect-ratio.ts` | A dashed placeholder frame with crossed diagonals and a ratio label |
| `attachment.ts` | A file chip: a folded-corner thumbnail, filename, size, and a remove X |
| `avatar.ts` | Three avatars: image placeholder, initials, and an overlapping stack |
| `badge.ts` | Row of four badges: default, secondary, outline, dark |
| `breadcrumb.ts` | Three crumbs with hand-drawn chevron separators; the last one is bold |
| `bubble.ts` | Two chat bubbles, incoming and outgoing, each carrying ruled copy lines |
| `button.ts` | Three buttons: default (accent), secondary (surface), disabled (muted, flat) |
| `button-group.ts` | Three square-cornered buttons joined edge to edge, sharing one hard shadow |
| `calendar.ts` | A month grid with a selected day and today marked |
| `card.ts` | Title, description lines, and a footer button |
| `carousel.ts` | A slide with an index label, straddling prev/next buttons, and dot indicators below |
| `chart.ts` | Five bars on a shared baseline with an accent tallest bar, gridlines, and month labels |
| `checkbox-group.ts` | Three stacked checkboxes: checked, unchecked, checked |
| `collapsible.ts` | Two states side by side: an expanded trigger with three revealed rows, and a collapsed one |
| `combobox.ts` | Trigger plus an open panel: a search row and three items, one selected with a check |
| `command.ts` | Search row with a magnifier glyph, a "Suggestions" heading, and three key-hinted rows |
| `context-menu.ts` | A dashed drop target with an open context menu overlapping its centre and spilling past its corner |
| `date-picker.ts` | Trigger with a calendar glyph and a compact three-week month popover below it |
| `dialog.ts` | Comic panel frame: title, body lines, close X, and two footer buttons |
| `drawer.ts` | Bottom-sheet panel with a rounded grabber bar standing in for the sheet affordance |
| `dropdown-menu.ts` | Trigger plus an open menu: four items, one hovered, one separator before the last |
| `empty.ts` | A dashed empty-state frame: burst glyph, title, body copy and a call-to-action |
| `field.ts` | Two stacked form fields: one valid, one in error, signalled by weight rather than colour |
| `hover-card.ts` | An open hover card floating above its trigger link |
| `input.ts` | Two fields: one with placeholder text, one focused with a doubled outline and caret |
| `input-group.ts` | Three joined segments in the button-group idiom: a leading chip, an input area, a trailing action |
| `input-otp.ts` | Six separate OTP cells, grouped 3 + 3, with the fourth cell showing focus |
| `item.ts` | A single list row: leading icon, stacked title/subtitle, trailing chevron |
| `kbd.ts` | A row of key caps: "⌘ + K", a gap, then "Shift" and "↵" |
| `label.ts` | The two pairings a label has: above an input, and beside a checkbox |
| `marker.ts` | Three lines of sample copy, with two phrases highlighted by a swash drawn behind the words |
| `menubar.ts` | A menu bar with four titles; "Edit" is open below it |
| `message.ts` | A two-turn chat exchange: initials avatar plus tailed bubble, incoming then a reply |
| `navigation-menu.ts` | A nav row of three items ("Docs" open) with a mega-panel of two columns below |
| `pagination.ts` | Prev arrow, pages 1–5 with page 2 active, next arrow |
| `popover.ts` | A trigger button with a comic popover bubble above it, tail aimed at its centre |
| `progress.ts` | Two bars at 35% and 80% |
| `radio-group.ts` | Three stacked radios, the second one selected |
| `resizable.ts` | Two side-by-side panels split by a draggable handle with a vertical grip |
| `scroll-area.ts` | A scrollable frame with a track and thumb along the right edge |
| `select.ts` | Closed trigger with a chevron, plus the open menu with one highlighted item |
| `separator.ts` | A titled section divided by a horizontal rule, and words divided by vertical rules |
| `sheet.ts` | A right-docked panel whose hard shadow reads as cast inward, to the left |
| `sidebar.ts` | Vertical nav panel: logo row, four nav rows with one active, and a bottom avatar row |
| `skeleton.ts` | A bare loading placeholder: no frame, no text, just an avatar circle and stacked bars |
| `slider.ts` | Track, filled portion, knob, and a value bubble above the knob |
| `spinner.ts` | Three spinners at increasing sweep, suggesting rotation, over a "Loading..." caption |
| `switch.ts` | Two switches: off (knob left, muted track) and on (knob right, accent track) |
| `table.ts` | Header row, three body rows, alternating `muted` stripes |
| `tabs.ts` | Three tab headers with the first active, plus the panel below |
| `textarea.ts` | Multi-line box with ruled placeholder lines and a corner resize grip |
| `toast.ts` | A floating save-confirmation card with a heavier shadow, dismiss X, and an undo button |
| `toggle.ts` | Two square toggles: one pressed (sunk, no shadow), one at rest (shadowed) |
| `toggle-group.ts` | Three joined square toggles, one pressed, marked with alignment-icon strokes |
| `tooltip.ts` | A trigger button with a comic speech bubble pointing down at it |

Comic extras (burst, bubble, panel, swash) appear only where noted — `alert`, `alert-dialog`,
`carousel`, `dialog`, `empty`, `hover-card`, `marker`, `message`, `popover`, `slider`, `tooltip`.

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
