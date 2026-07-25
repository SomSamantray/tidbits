export type MasonryEntry = {
  key: string;
  height: number;
};

export type MasonryPlacement = {
  key: string;
  column: number;
  top: number;
};

export function packMasonry(entries: MasonryEntry[], columnCount: number, gap: number) {
  const safeColumnCount = Math.max(1, Math.floor(columnCount));
  const columnHeights = Array.from({ length: safeColumnCount }, () => 0);
  const placements: MasonryPlacement[] = [];

  for (const entry of entries) {
    const column = columnHeights.indexOf(Math.min(...columnHeights));
    placements.push({ key: entry.key, column, top: columnHeights[column] });
    columnHeights[column] += Math.max(0, entry.height) + gap;
  }

  return {
    placements,
    height: Math.max(0, ...columnHeights) - (placements.length ? gap : 0),
  };
}
