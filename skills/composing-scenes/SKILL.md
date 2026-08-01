---
name: composing-scenes
description: Use when mocking up a screen, wireframe, or UI sketch with the hand-drawn Excalidraw comic components — composes a .excalidraw scene from row and column layouts.
---

# Composing Excalidraw Scenes

Build a `.excalidraw` mockup out of the comic component library. The user opens the
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

   - A leaf is `{ "component": "<name>", "variant": "<name>" }`. Omitting `variant`
     means `default`.
   - Five components have no `default` variant, so a leaf for them must name one:
     `accordion` (collapsed, expanded), `collapsible` (collapsed, expanded),
     `separator` (horizontal, vertical), `switch` (off, on), `toggle` (off, on).
     Omitting `variant` for one of these fails with an error naming the choices,
     e.g. `switch has no default variant; pick one of: off, on`.
   - A container is `{ "type": "row" | "column", "gap": 24, "align": "start",
     "children": [...] }`. `align` is the cross axis: `start`, `center`, or `end`.
   - Containers nest. The root may be either kind.

3. Compose:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/compose.mjs" mockups/login.layout.json -o mockups/login.excalidraw
   ```

4. Tell the user the path and that it opens via **Menu → Open**. Keep the layout file —
   revising the mockup is a one-line edit and a re-run.

## Limits, state them rather than working around them

- **Text is fixed.** Components carry stock labels ("Click me!", "your@email.com").
  Changing them means editing in Excalidraw after opening. Do not hand-edit the scene
  JSON to fake it.
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
