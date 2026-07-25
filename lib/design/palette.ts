/** Default pastel accent palette categories are seeded from (see U2/U3). */
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
