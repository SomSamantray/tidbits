import type { CSSProperties } from "react";

/**
 * Default pastel accent palette categories are seeded from (see U2/U3).
 * Kept in sync by hand with the `--accent-*` custom properties in
 * app/globals.css (used as static fallbacks for chrome like the "All" chip)
 * — update both if this palette changes.
 */
export const ACCENT_PALETTE = [
  { name: "coral", hex: "#FFADAD" },
  { name: "peach", hex: "#FFD6A5" },
  { name: "butter", hex: "#FDFFB6" },
  { name: "mint", hex: "#CAFFBF" },
  { name: "sky", hex: "#9BF6FF" },
  { name: "periwinkle", hex: "#A0C4FF" },
  { name: "lavender", hex: "#BDB2FF" },
  { name: "pink", hex: "#FFC6FF" },
] as const;

export function accentForIndex(index: number): string {
  return ACCENT_PALETTE[index % ACCENT_PALETTE.length].hex;
}

/** Sets the `--accent` custom property `.card-shell`/`.chip` read from (see globals.css). */
export function accentStyle(accentColor: string): CSSProperties {
  return { "--accent": accentColor } as CSSProperties;
}
