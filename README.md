# Excalidraw Comic Components

Hand-drawn, comic-styled UI components for [Excalidraw](https://excalidraw.com),
modelled on the [shadcn/ui](https://ui.shadcn.com) component set.

Bold wobbly ink, flat fills, hard offset shadows. Colours are the shadcn **zinc** scale.

## Use it

**Whole library:** in Excalidraw open **Library → Load from file** and pick
`dist/default/comic-ui.excalidrawlib`. All 58 components land in your library panel.

**One component:** open `dist/default/components/<name>.excalidraw` via **Menu → Open**,
then copy what you need.

Each component is a single group — click once to select and drag the whole thing.

## Components

Accordion, Alert, Alert Dialog, Aspect Ratio, Attachment, Avatar, Badge,
Breadcrumb, Bubble, Button, Button Group, Calendar, Card, Carousel, Chart,
Checkbox Group, Collapsible, Combobox, Command, Context Menu, Date Picker,
Dialog, Drawer, Dropdown Menu, Empty, Field, Hover Card, Input, Input Group,
Input OTP, Item, Kbd, Label, Marker, Menubar, Message, Navigation Menu,
Pagination, Popover, Progress, Radio Group, Resizable, Scroll Area, Select,
Separator, Sheet, Sidebar, Skeleton, Slider, Spinner, Switch, Table, Tabs,
Textarea, Toast, Toggle, Toggle Group, Tooltip.

## Palette

The default style is shadcn zinc. `#18181b` for ink and shadows, `#fafafa` for surfaces,
`#e4e4e7` for muted fills, `#3f3f46` for accents. 25 other scales are available, and a
preset can pair a second scale as its accent — see [Styles](#styles).

## Develop

```bash
npm install
npm run build      # regenerate every preset's dist/<name>/
npm run validate   # structural checks on dist/
npm run typecheck  # tsc --noEmit
npm test           # unit tests
npm run check      # build + validate + typecheck + test
npm run preset     # create a new style preset
```

`src/tokens.ts` holds the palette and sizing. `src/comic.ts` holds the house style and is
the first place to change when restyling — though components may still drop to a
`src/element.ts` primitive for a one-off shape, so a restyle sweeps those too.
`src/element.ts` is the only module that writes raw Excalidraw JSON and resolves preset
tokens (colour, font, stroke weight) into concrete values.
`src/theme.ts` resolves a preset file into a `Theme`; `src/build.ts` and `src/preset.ts`
are the CLI entry points.
`src/components/*.ts` is one file per component.
`dist/` is generated but committed, so the library works without a build. Every preset's
output is committed, one directory per preset — see [Styles](#styles).

## Styles

The library ships in one style by default, but the generator is preset-driven. A preset
picks six things:

| field | values |
|---|---|
| `strokeWidth` | `bold` (4/2/1) · `medium` (2/1/1) · `thin` (1/1/1) |
| `sloppiness` | `architect` (0) · `artist` (1) · `cartoonist` (2, default) |
| `edges` | `sharp` · `round` (default) |
| `font` | `excalifont` (default) · `comic-shanns` · `nunito` — body text only; headings stay Comic Shanns |
| `palette` | any of 26 scales — Tailwind's 22 (`slate` `gray` `zinc` `neutral` `stone` `red` `orange` `amber` `yellow` `lime` `green` `emerald` `teal` `cyan` `sky` `blue` `indigo` `violet` `purple` `fuchsia` `pink` `rose`) plus `mauve` `olive` `mist` `taupe`. Default `zinc` |
| `accent` | any palette — drives `accent`, `accentText`, `subtle` and `mutedText`. Defaults to `palette`, so omitting it keeps the single-scale look |

A preset names up to two scales. The base `palette` colours the chrome — every stroke,
panel, muted fill and border. The `accent` scale colours buttons, badges, focus rings
and secondary text. Leaving `accent` out points both at the same scale, which is how
every preset behaved before the field existed. `presets/wp-admin.json` is the two-scale
example: neutral chrome, blue accents.

```bash
npm run preset                    # prompts, writes presets/<name>.json
npm run preset -- --name soft --palette stone --edges sharp
npm run build                     # every preset → dist/<name>/
npm run build -- --all            # same as a bare build
npm run build -- --preset soft    # just soft → dist/soft/
npm run validate                  # checks every preset
npm run validate -- --preset soft # checks dist/soft/
```

`presets/` and `dist/` are both committed, so every style is reproducible and usable
without a build. `dist/` mirrors `presets/` exactly: a full build writes one directory
per preset and removes any directory no preset backs, so deleting a preset and
rebuilding cleans up after itself. A `--preset` build only ever touches its own
directory.

A preset's filename and its `name` field must match — the filename is what `--preset`
selects, the field is what picks the output directory. A name must also be a plain path
segment (`[a-z0-9][a-z0-9-]*`): it becomes a directory under `dist/`, and building a
preset removes and rewrites that directory.

`edges: sharp` squares every corner. `edges: round` means "round where the component asks
for it" — 26 components are square for structural reasons (joined cells, inner bands) and
stay square in every preset, because Excalidraw's corner radius scales with shape size and
rounding them produces overhang and seam notches.

## Use it from Claude Code

The repo is also a Claude Code plugin:

```bash
/plugin marketplace add /path/to/excalidraw-components-library
```

Two skills come with it. **composing-scenes** builds a `.excalidraw` mockup from a
row/column layout — ask for "a login screen with the comic components". **building-presets**
wraps the preset and build CLIs.

The composer works with no configuration, using the `dist/` committed here. To compose
from a clone you build yourself, point it at that clone:

```json
// ~/.claude/excalidraw-lib.json
{ "path": "/path/to/your/clone" }
```

Compose by hand without Claude:

```bash
node scripts/compose.mjs list
node scripts/compose.mjs mockups/login.layout.json -o mockups/login.excalidraw
```
