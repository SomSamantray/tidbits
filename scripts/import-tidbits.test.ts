import { describe, expect, it } from "vitest";
import { parseEntries, categorizeEntries } from "./import-tidbits";

describe("parseEntries", () => {
  it("parses a well-formed entry with header, body, and category", () => {
    const [entry] = parseEntries(
      "Octopuses have three hearts\nTwo pump blood to the gills, one to the rest of the body.\nCategory: science",
    );

    expect(entry.header).toBe("Octopuses have three hearts");
    expect(entry.body).toBe("Two pump blood to the gills, one to the rest of the body.");
    expect(entry.categoryToken).toBe("science");
  });

  it("parses multiple entries separated by a blank line", () => {
    const entries = parseEntries(
      "Header one\nBody one.\nCategory: science\n\nHeader two\nBody two.\nCategory: history",
    );
    expect(entries).toHaveLength(2);
    expect(entries[1].header).toBe("Header two");
  });

  it("flags an entry with no Category line for manual review (categoryToken is null)", () => {
    const [entry] = parseEntries("Header only\nBody with no category line.");
    expect(entry.categoryToken).toBeNull();
  });
});

describe("categorizeEntries", () => {
  const categoryMap = new Map([["science", 1]]);

  it("routes an entry with a matching category to ready, not needsReview", () => {
    const { ready, needsReview } = categorizeEntries(
      [{ header: "H", body: "B", categoryToken: "science" }],
      categoryMap,
    );
    expect(ready).toEqual([{ header: "H", body: "B", categoryToken: "science", categoryId: 1 }]);
    expect(needsReview).toHaveLength(0);
  });

  it("flags an entry whose category doesn't match any known category, without defaulting", () => {
    const { ready, needsReview } = categorizeEntries(
      [{ header: "H", body: "B", categoryToken: "not-a-real-category" }],
      categoryMap,
    );
    expect(ready).toHaveLength(0);
    expect(needsReview).toHaveLength(1);
  });

  it("flags an entry with no category token at all, without defaulting", () => {
    const { ready, needsReview } = categorizeEntries(
      [{ header: "H", body: "B", categoryToken: null }],
      categoryMap,
    );
    expect(ready).toHaveLength(0);
    expect(needsReview).toHaveLength(1);
  });
});
