/** shadcn/ui "zinc" base colour scale. */
export const zinc = {
  50: "#fafafa",
  100: "#f4f4f5",
  200: "#e4e4e7",
  300: "#d4d4d8",
  400: "#a1a1aa",
  500: "#71717a",
  600: "#52525b",
  700: "#3f3f46",
  800: "#27272a",
  900: "#18181b",
  950: "#09090b",
} as const;

/** Semantic roles. Components reference these, never raw hex. */
export const color = {
  ink: zinc[900],
  surface: zinc[50],
  muted: zinc[200],
  border: zinc[300],
  subtle: zinc[400],
  mutedText: zinc[500],
  accent: zinc[700],
  accentText: zinc[50],
  transparent: "transparent",
} as const;

/** Every value legally allowed to appear as a stroke or background in output. */
export const PALETTE_VALUES: ReadonlySet<string> = new Set<string>([
  ...Object.values(zinc),
  "transparent",
]);

/** The comic look, applied to every shape. */
export const style = {
  roughness: 2,
  strokeWidth: 4,
  /** Hard drop-shadow displacement, in px, down and right. */
  shadowOffset: 6,
} as const;

/** Excalidraw font family ids. */
export const font = {
  /** Excalifont, the default hand-drawn face. */
  hand: 1,
  /** Comic Shanns, used for emphasis. */
  comic: 7,
} as const;

export const size = {
  /** Canonical width of a form control. */
  control: 320,
  rowHeight: 48,
  gap: 16,
  radius: 8,
  fontSm: 16,
  fontMd: 20,
  fontLg: 28,
} as const;
