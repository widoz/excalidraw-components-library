---
name: building-presets
description: Use when creating or building a style preset for the Excalidraw comic components — wraps npm run preset, build, and validate.
---

# Building Style Presets

A preset picks five things and the build resolves them into every element. This skill
runs the library's own CLIs; it does not offer style advice.

## Preflight

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/ensure-library.mjs" --toolchain
```

Prints the library root and installs `node_modules` on first use. If it fails, the
message says what is missing — a path in `~/.claude/excalidraw-lib.json`, or a clone
to point it at. Run every later command from the printed root.

## Fields

| field | values |
|---|---|
| `strokeWidth` | `bold` (4/2/1) · `medium` (2/1/1) · `thin` (1/1/1) |
| `sloppiness` | `architect` (0) · `artist` (1) · `cartoonist` (2, default) |
| `edges` | `sharp` · `round` (default) |
| `font` | `excalifont` (default) · `comic-shanns` · `nunito` — body text only |
| `palette` | `neutral` · `stone` · `zinc` (default) · `mauve` · `olive` · `mist` · `taupe` |

## Commands

```bash
npm run preset -- --name soft --palette stone --edges sharp   # writes presets/soft.json
npm run build -- --preset soft                                 # writes dist/soft/
npm run validate -- --preset soft                              # checks dist/soft/
npm run build                                                  # every preset, prunes orphans
npm run validate                                               # checks every preset
```

`npm run preset` with no flags prompts interactively — only use that form when the
user is at the terminal.

## Naming rules

- The filename and the `name` field must match; the filename is what `--preset`
  selects, the field picks the output directory.
- A name must be a plain path segment: `[a-z0-9][a-z0-9-]*`.
- Every preset builds to `dist/<name>/`, including `default`. Deleting a preset file
  and running a full build removes its output directory.

Report what the CLIs print. Do not paraphrase their errors.
