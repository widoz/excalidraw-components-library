/**
 * Colour scale data, and the grouping used to present it.
 *
 * Two provenances, deliberately labelled separately — the comment this replaces
 * claimed all seven scales came from shadcn, which was true of three of them.
 */

/** shadcn/ui "zinc" base colour scale. */
export const zinc = {
  50: "#fafafa",
  100: "#f4f4f5",
  200: "#e4e4e7",
  300: "#d4d4d8",
  400: "#9f9fa9",
  500: "#71717b",
  600: "#52525c",
  700: "#3f3f46",
  800: "#27272a",
  900: "#18181b",
  950: "#09090b",
} as const;

/**
 * Colour scales, keyed by name.
 *
 * `zinc`, `neutral` and `stone` are shadcn/ui base colour scales. Source:
 * shadcn-ui/ui → packages/shadcn/src/colors.ts, which defines them in OKLCH; the
 * values here are the sRGB conversion.
 *
 * `mauve`, `olive`, `mist` and `taupe` are custom to this repository — they are not
 * shadcn or Tailwind scales. `blueprint` uses `mist`.
 */
export const palettes = {
  zinc,
  neutral: {
    50: "#fafafa", 100: "#f5f5f5", 200: "#e5e5e5", 300: "#d4d4d4", 400: "#a1a1a1",
    500: "#737373", 600: "#525252", 700: "#404040", 800: "#262626", 900: "#171717",
    950: "#0a0a0a",
  },
  stone: {
    50: "#fafaf9", 100: "#f5f5f4", 200: "#e7e5e4", 300: "#d6d3d1", 400: "#a6a09b",
    500: "#79716b", 600: "#57534d", 700: "#44403b", 800: "#292524", 900: "#1c1917",
    950: "#0c0a09",
  },
  mauve: {
    50: "#fafafa", 100: "#f3f1f3", 200: "#e7e4e7", 300: "#d7d0d7", 400: "#a89ea9",
    500: "#79697b", 600: "#594c5b", 700: "#463947", 800: "#2a212c", 900: "#1d161e",
    950: "#0c090c",
  },
  olive: {
    50: "#fbfbf9", 100: "#f4f4f0", 200: "#e8e8e3", 300: "#d8d8d0", 400: "#abab9c",
    500: "#7c7c67", 600: "#5b5b4b", 700: "#474739", 800: "#2b2b22", 900: "#1d1d16",
    950: "#0c0c09",
  },
  mist: {
    50: "#f9fbfb", 100: "#f1f3f3", 200: "#e3e7e8", 300: "#d0d6d8", 400: "#9ca8ab",
    500: "#67787c", 600: "#4b585b", 700: "#394447", 800: "#22292b", 900: "#161b1d",
    950: "#090b0c",
  },
  taupe: {
    50: "#fbfaf9", 100: "#f3f1f1", 200: "#e8e4e3", 300: "#d8d2d0", 400: "#aba09c",
    500: "#7c6d67", 600: "#5b4f4b", 700: "#473c39", 800: "#2b2422", 900: "#1d1816",
    950: "#0c0a09",
  },
} as const;
