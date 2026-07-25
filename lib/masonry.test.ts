import { describe, expect, it } from "vitest";
import { packMasonry } from "./masonry";

describe("packMasonry", () => {
  it("places each entry into the currently shortest column", () => {
    const result = packMasonry([
      { key: "a", height: 300 },
      { key: "b", height: 100 },
      { key: "c", height: 100 },
      { key: "d", height: 100 },
    ], 3, 20);

    expect(result.placements).toEqual([
      { key: "a", column: 0, top: 0 },
      { key: "b", column: 1, top: 0 },
      { key: "c", column: 2, top: 0 },
      { key: "d", column: 1, top: 120 },
    ]);
    expect(result.height).toBe(300);
  });

  it("keeps source order in the placement list and handles one column", () => {
    const result = packMasonry([
      { key: "first", height: 0 },
      { key: "second", height: 80 },
    ], 1, 16);

    expect(result.placements.map((placement) => placement.key)).toEqual(["first", "second"]);
    expect(result.placements[1]?.top).toBe(16);
    expect(result.height).toBe(96);
  });
});
