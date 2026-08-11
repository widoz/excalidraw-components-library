---
name: composing-scenes
description: Use when mocking up a screen, wireframe, or UI sketch with the hand-drawn Excalidraw components — composes a .excalidraw scene from row and column layouts.
---

# Composing Excalidraw Scenes

Build a `.excalidraw` mockup out of the component library. The user opens the
result in Excalidraw with **Menu → Open**.

## Workflow

1. Find the library and see what exists:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/compose.mjs" list
   ```

   Prints every component, its variants, and their pixel sizes. Use real names from
   this output — never guess one.

2. Write a layout file next to where the scene will go, e.g. `mockups/login.layout.json`:

   ```json
   { "type": "column", "gap": 24, "align": "center", "children": [
       { "component": "label" },
       { "component": "input" },
       { "type": "row", "gap": 16, "children": [
           { "component": "button", "variant": "secondary" },
           { "component": "button" } ] } ] }
   ```

   - A leaf is `{ "component": "<name>", "variant": "<name>", "text": ... }`. Omitting
     `variant` means `default`.
   - `text` replaces the component's baked-in strings. A string replaces the only text in
     a single-text component; an array replaces them positionally, and `null` skips one:

     ```json
     { "component": "button", "text": "Publish" }
     { "component": "tabs", "text": ["Post", "Block", null, "Draft saved"] }
     ```

     `list` prints every variant's current strings, in the order the array uses — read it
     rather than guessing. Text must be a single line. Longer text widens its box and
     reflows its neighbours; shorter text leaves the box alone and just re-centres.
   - Five components have no `default` variant, so a leaf for them must name one:
     `accordion` (collapsed, expanded), `collapsible` (collapsed, expanded),
     `separator` (horizontal, vertical), `switch` (off, on), `toggle` (off, on).
     Omitting `variant` for one of these fails with an error naming the choices,
     e.g. `switch has no default variant; pick one of: off, on`.
   - A container is `{ "type": "row" | "column", "gap": 24, "align": "start",
     "children": [...] }`. `align` is the cross axis: `start`, `center`, or `end`.
   - Any container may carry `"frame": { "padding": 16, "label": "Settings" }`, which draws
     a bordered panel behind its children with that much space around them. Both keys are
     optional; padding defaults to 16. Frames nest.
   - Containers nest. The root may be either kind.

3. Compose:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/compose.mjs" mockups/login.layout.json -o mockups/login.excalidraw
   ```

4. Tell the user the path and that it opens via **Menu → Open**. Keep the layout file —
   revising the mockup is a one-line edit and a re-run.

## Limits, state them rather than working around them

- **Text is single-line and re-measured, not re-flowed.** Replacement strings widen or
  narrow their own box; they never wrap, and nothing grows vertically. A very long string
  in a small component makes a very wide component.
- **Growing text tears grid-shaped components.** The insert-space rule applies to the
  whole component instance, cutting at the replaced text's old right edge. On a
  box-shaped component (button, input, card, badge) that cut only ever crosses the one
  box, so it reflows cleanly. On a component whose elements form a horizontal grid
  (`calendar`, `table`) the same cut lands wherever the replaced text sits and splits the
  grid there — e.g. widening `calendar`'s month title moves the Thu→Fri gap from 44px to
  over 200px while the columns before it don't move. Shrinking text never has this
  problem, since the shrink path only moves the text itself. Workaround: on grid-shaped
  components, keep replacements no longer than the stock string.
- **Rows and columns only.** No overlap, no absolute coordinates, no z-order.
- **One widget per leaf.** `{"component": "button"}` is the default variant, not the
  three-button sheet.

## Presets

Add `--preset <name>` to both commands to compose from a built style preset. If the
preset has not been built the error says which command to run — pass that to the
building-presets skill.

## Errors

Every message names the fix. Unknown component → closest matches. Unknown variant →
that component's variants. No library found → write `{"path": "..."}` to
`~/.claude/excalidraw-lib.json`; ask the user where their clone is rather than guessing.
