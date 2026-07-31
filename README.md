# Excalidraw Comic Components

Hand-drawn, comic-styled UI components for [Excalidraw](https://excalidraw.com),
modelled on the [shadcn/ui](https://ui.shadcn.com) component set.

Bold wobbly ink, flat fills, hard offset shadows. Colours are the shadcn **zinc** scale.

## Use it

**Whole library:** in Excalidraw open **Library → Load from file** and pick
`dist/comic-ui.excalidrawlib`. All 58 components land in your library panel.

**One component:** open `dist/components/<name>.excalidraw` via **Menu → Open**,
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
`#e4e4e7` for muted fills, `#3f3f46` for accents. Six other neutral scales are available
as build presets — see [Styles](#styles).

## Develop

```bash
npm install
npm run build      # regenerate dist/
npm run validate   # structural checks on dist/
npm test           # unit tests
npm run check      # all three
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
`dist/` is generated but committed, so the library works without a build. Only the
default preset's output is committed — see [Styles](#styles).

## Styles

The library ships in one style by default, but the generator is preset-driven. A preset
picks five things:

| field | values |
|---|---|
| `strokeWidth` | `bold` (4/2/1) · `medium` (2/1/1) · `thin` (1/1/1) |
| `sloppiness` | `architect` (0) · `artist` (1) · `cartoonist` (2, default) |
| `edges` | `sharp` · `round` (default) |
| `font` | `excalifont` (default) · `comic-shanns` · `nunito` — body text only; headings stay Comic Shanns |
| `palette` | `neutral` · `stone` · `zinc` (default) · `mauve` · `olive` · `mist` · `taupe` |

```bash
npm run preset                    # prompts, writes presets/<name>.json
npm run preset -- --name soft --palette stone --edges sharp
npm run build                     # default preset → dist/
npm run build -- --preset soft    # → dist/soft/
npm run build -- --all            # every preset in presets/
```

`presets/` is committed so a style is reproducible. Only the default preset's `dist/` is
committed; other presets are build artifacts you regenerate.

Preset names `components` and `comic-ui` are reserved: they would collide with the
default preset's own output paths (`dist/components/`, `dist/comic-ui.excalidrawlib`).

`edges: sharp` squares every corner. `edges: round` means "round where the component asks
for it" — 26 components are square for structural reasons (joined cells, inner bands) and
stay square in every preset, because Excalidraw's corner radius scales with shape size and
rounding them produces overhang and seam notches.
