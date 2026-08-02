# Text override and frames

Date: 2026-08-01

## Problem

`scripts/compose.mjs` copies built component scenes verbatim and stacks them in rows and
columns. Two consequences make it impossible to compose a recognisable screen:

1. **Every string is the one the build baked in.** A composed page of buttons all reading
   "Click me!" is a pile of widgets, not a mockup of anything. A screen is mostly words.
2. **There are no regions.** Nothing draws a bordered, padded panel around a group of
   children, so an app shell reads as floating widgets rather than a sidebar beside a canvas.

This spec adds text replacement and frames. Both live entirely in `scripts/compose.mjs`
and `scripts/library.mjs`. `src/` is untouched and `dist/` does not need rebuilding.

## Two properties of the built scenes this design relies on

Both were verified against `dist/components/button/default.excalidraw`:

```
rectangle 6 6 200 56    (shadow)
rectangle 0 0 200 56    (body)
text 50.5 15.5 99 25  center  fontSize 20  "Click me!"
```

**Text elements are standalone.** `Factory.text` (`src/element.ts:238`) sets
`containerId: null` and `autoResize: true`. There are no Excalidraw bound-text containers
anywhere in the library, so replacing a string never requires a container refit.

**The font metric is recoverable per element.** The build sets
`width = text.length * fontSize * advance` (`estimateTextWidth`, `src/element.ts:38`), so

```js
const advance = width / (text.length * fontSize);   // 99 / (9 * 20) = 0.55
```

recovers the exact metric the build used, for that element, in that preset. Nothing has to
be stored in `dist/` and presets with different fonts work with no extra plumbing. When the
existing text is empty the division is undefined; fall back to `0.55`.

## Feature 1: text override

### Authoring

`text` on a component leaf. Two accepted forms:

```json
{ "component": "button", "text": "Publish" }
{ "component": "tabs",   "text": ["Post", "Block"] }
{ "component": "sidebar", "text": [null, "Summary", "Categories"] }
```

- **String** — only valid when the resolved variant has exactly one text element.
- **Array** — positional over the variant's text elements in build order, which is `index`
  order, which is the order `list` prints. `null` (or a hole) leaves that text alone. The
  array may be shorter than the text count; trailing texts are left alone.

Order is never guessed because `list` prints it (see "Listing" below).

`text` is only valid on a leaf. On a row or column it is an error.

### Geometry

For each replaced text element, with `oldWidth` the element's current width and
`newWidth = newText.length * fontSize * advance`, let `Δ = newWidth - oldWidth`.

**Δ > 0 — insert space.** `Δ` pixels of blank space are inserted at the text's old right
edge (`cut = text.x + text.width`), applied to every element of that component instance:

| element position | transform |
|---|---|
| ends at or left of `cut` (`x + width <= cut`) | unchanged |
| starts at or right of `cut` (`x >= cut`) | `x += Δ` |
| straddles `cut` | rectangle/ellipse: `width += Δ`; line of non-zero width: scale its points' x by `(width + Δ) / width`; zero-width line (a vertical rule) or anything else: unchanged |

The replaced text keeps its `x` and takes `newWidth`.

Worked through for `button/default` replacing "Click me!" (99px) with "Featured image"
(154px, so `Δ = 55`, `cut = 149.5`): the body rect `0..200` straddles and becomes `0..255`;
the shadow rect `6..206` straddles and becomes `6..261`; the text becomes `50.5..204.5`.
Left padding 50.5, right padding `255 - 204.5 = 50.5`. Symmetric, with no knowledge of what
a button is.

Centring falls out of the rule rather than being a special case: because the space is
inserted exactly at the text's right edge and the surrounding box grows by the same amount,
the text's distance to both box edges is preserved for `left`, `center` and `right`
alignment alike. No containing-rect detection is needed.

**Δ < 0 — never shrink.** The box is left exactly as it is and only the text element moves,
re-anchored by its own `textAlign`:

| `textAlign` | new x |
|---|---|
| `left` | unchanged |
| `center` | `x + (oldWidth - newWidth) / 2` |
| `right` | `x + (oldWidth - newWidth)` |

A short label therefore leaves a roomy button rather than a cramped one. This was chosen
deliberately over hugging the text: boxes only ever grow, so a layout's sizes stay
predictable as strings are edited.

**Vertical geometry is never touched.** Text stays single-line; heights, y coordinates and
font sizes are untouched. A `\n` in replacement text is an error, not a second line — for
both the string form and every entry of the array form.

**Multiple replacements in one leaf** are applied in element order, each seeing the
coordinates the previous one produced.

**Reflow is automatic.** `size()` calls `measure()`, which derives a component's box from
real element extents (`library.mjs:125`). A grown component reports a wider box, so
neighbours in the row or column move out of the way with no extra code.

**Growth tears grid-shaped components.** The insert-space rule (above) is global to the
component instance: it cuts at the replaced text's old right edge regardless of what else
lives at that x-coordinate. On box-shaped components (button, input, card, badge) the cut
only ever crosses the one box, so this is invisible. On a component whose elements form a
horizontal grid — `calendar`, `table` — the same cut splits the grid at whatever column it
lands in. Verified on `calendar/default`: replacing the month title moves the Thu→Fri gap
from 44px to over 200px while the columns before the cut don't move. This is intended
behaviour, not a bug, and the shrink path never has it (it only moves the text element).
Workaround: on grid-shaped components, keep replacements no longer than the stock string.

## Feature 2: frames

### Authoring

`frame` on any row or column. No new node type; nesting, `gap` and `align` keep their
current meaning.

```json
{ "type": "column", "gap": 12,
  "frame": { "padding": 16, "label": "Settings" },
  "children": [
    { "component": "tabs" },
    { "component": "accordion", "variant": "collapsed" } ] }
```

- `padding` — optional number, default `16`. Must be a finite number `>= 0`.
- `label` — optional string. Drawn inside the panel at the top left, above the children.
  An empty string (`""`) is treated the same as omitting it: no band, no width
  contribution, no text element emitted.

Frames nest freely, including a framed row inside a framed column.

### Geometry

Let `labelBand` be `0` when there is no label (an empty string counts as no label), and
`labelHeight + padding` when there is — where `labelHeight` is `fontSize * 1.25`, matching
`Factory.text` (`src/element.ts:242`).

A label also has to fit inside the panel it sits on top of: `minWidth` is `0` without a
label, and `2 * padding + label.length * fontSize * advance` with one — the same formula
`size()` uses everywhere else to turn a string into a width.

`size()` inflates the container: `width = max(minWidth, innerWidth + 2 * padding)`,
`height = innerHeight + 2 * padding + labelBand`. A long label can therefore widen the
panel beyond what its children need, but children are placed from `innerWidth` /
`innerHeight`, not the padded `width` / `height`, so a widened panel never drags its
children off their own alignment.

`place()` offsets children by `(padding, padding + labelBand)` and emits the panel rectangle
**before** descending into children. `index` is assigned in emit order (`compose.mjs:132`),
so the panel lands behind its contents.

### Styling

Sampled from the loaded components, never hardcoded, so a frame matches whichever preset is
in play with no changes to `presets/` or `src/`. Rect and text styling are sampled
independently, since some components (e.g. `separator/horizontal`) have text but no
rectangle:

- **Panel rect** — within the first component loaded during this compose that has any
  rectangle, copies `strokeColor`, `strokeWidth`, `roughness`, `roundness` and `fillStyle`
  from the rectangle with the **largest `strokeWidth`**, not the first rectangle in the
  component. Most components draw a thin drop-shadow rect before their body rect (e.g.
  `button/default`: shadow `strokeWidth: 1`, body `strokeWidth: 4`), and it is the body's
  weight a panel border should match. `backgroundColor` is `"transparent"`.
- **Label text** — copies `fontFamily`, `fontSize` from the first text element of the
  first component loaded, and is measured with that element's recovered `advance`. Ink
  is different: it takes the sampled panel rectangle's `strokeColor`
  (`box?.strokeColor ?? type?.strokeColor ?? fallback`), not the text element's own
  `strokeColor`. The panel is an outline, so its title should read in the same ink as the
  outline — not in a label's own ink, which in this library is frequently light-on-dark
  (`button/default`, `tabs/default`, `badge/default`, `toggle/on`, `message/outgoing`,
  `hover-card/default`, `avatar/initials` all have a `#fafafa` text stroke against a
  `#18181b` rect stroke) and would render near-invisible against a white canvas.

A blueprint-preset frame therefore comes out thin-stroked and sharp-cornered for free.

If a compose produces no components at all, there is nothing to sample from; that case
cannot arise, because a container requires at least one child (`compose.mjs:30`) and every
leaf is a component.

The panel rect and its label get the instance tag and a groupId of their own, so a panel
selects as one unit in Excalidraw and does not merge with its children's groups.

## Listing

`list` gains an indented line per variant showing its current strings, so array order is
read rather than guessed:

```
tabs: default (366x204)
    text: "Account", "Password"
```

Variants with no text elements omit the line.

## Errors

Every message names the fix, matching the existing style in `compose.mjs` and `library.mjs`.

| condition | message |
|---|---|
| `text` on a row or column | `"text" is only valid on a component node, not on a row or column.` |
| string form, variant has 0 or 2+ texts | `tabs/default has 2 text elements; pass an array, not a string. Current: "Account", "Password"` |
| array longer than the text count | `tabs/default has 2 text elements but 4 replacements were given. Current: "Account", "Password"` |
| array entry neither string nor null | `Replacement text must be a string or null, got 42.` |
| newline in replacement text | `Replacement text must be a single line; "a\nb" contains a newline.` |
| `frame` not an object | `"frame" must be an object, e.g. {"padding": 16, "label": "Settings"}.` |
| unknown key inside `frame` | `Unknown key "border" on a frame. Use padding, label.` |
| bad `padding` | `Frame padding must be a number >= 0, got -4.` |
| `label` not a string | `Frame label must be a string, got 3.` |

`CONTAINER_KEYS` gains `frame`; `LEAF_KEYS` gains `text`, so the existing unknown-key errors
keep working unchanged.

## Testing

New cases in `tests/compose.test.ts`, alongside the existing suite:

**Text**
- positional array replaces the right elements, in order
- `null` and a short array leave the remaining texts alone
- string shorthand works on a single-text component
- growing text widens the straddling rects and leaves left-of-cut elements alone
- growing text reflows a neighbour in the enclosing row
- shrinking text moves only the text element, and re-anchors it per `textAlign` for each of
  left, center and right
- replaced text preserves padding symmetry on a centred label (the button case above)
- each error in the table

**Frames**
- framed container's box equals children plus `2 * padding`
- a label adds the band and offsets children further down
- the panel rect appears before its children in `elements` order
- nested frames compose
- the panel rect's stroke matches the sampled component's stroke under a non-default preset
- each error in the table

## Documentation

`skills/composing-scenes/SKILL.md` documents both features: the two `text` forms, the
grow/shrink rule stated in one sentence each, the `frame` object, and the new `list` output.
The existing "Text is fixed" limitation is replaced; "Rows and columns only" stays, since
overlap is still unsupported.

## Explicitly out of scope

Multi-line text, vertical growth, text that shrinks its box, per-element style overrides,
overlap/stacking, `flex`/`fill` sizing, `justify`, primitives (`text`/`icon`/`box` leaves),
and layout `$ref`/`repeat`. Each is a separate piece of work.
