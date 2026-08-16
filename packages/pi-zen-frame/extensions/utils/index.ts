import { ThemeColor } from "@earendil-works/pi-coding-agent";
import { THEME_COLORS } from "../config/constants";

/**
 * Shared helpers, grouped by domain and re-exported from a single barrel.
 * Import everything with `import { ... } from "../utils"`.
 */
export * from "./agent";
export * from "./git";
export * from "./path";
export * from "./string";

export function isThemeColor(value: string): value is ThemeColor {
  return value in THEME_COLORS;
}

