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

shadcn zinc. `#18181b` for ink and shadows, `#fafafa` for surfaces, `#e4e4e7` for
muted fills, `#3f3f46` for accents.

## Develop

```bash
npm install
npm run build      # regenerate dist/
npm run validate   # structural checks on dist/
npm test           # unit tests
npm run check      # all three
```

`src/tokens.ts` holds the palette and sizing. `src/comic.ts` holds the house style and is
the first place to change when restyling — though components may still drop to a
`src/element.ts` primitive for a one-off shape, so a restyle sweeps those too.
`src/element.ts` is the only module that writes raw Excalidraw JSON.
`src/components/*.ts` is one file per component.
`dist/` is generated but committed, so the library works without a build.
