import { describe, expect, it } from "vitest";
import { createTestDb, seedCategory, seedTidbit } from "./test-helpers";
import { getFeedPage } from "./queries";

describe("getFeedPage", () => {
  it("returns the newest published tidbits with no filter/search", async () => {
    const db = await createTestDb();
    const categoryId = await seedCategory(db);
    await seedTidbit(db, categoryId, { header: "Older", createdAt: 100 });
    await seedTidbit(db, categoryId, { header: "Newer", createdAt: 200 });

    const { items } = await getFeedPage({}, db);

    expect(items.map((i) => i.header)).toEqual(["Newer", "Older"]);
  });

  it("narrows results to the given category only", async () => {
    const db = await createTestDb();
    const scienceId = await seedCategory(db, { slug: "science", name: "Science" });
    const historyId = await seedCategory(db, { slug: "history", name: "History" });
    await seedTidbit(db, scienceId, { header: "Science one" });
    await seedTidbit(db, historyId, { header: "History one" });

    const { items } = await getFeedPage({ categorySlug: "science" }, db);

    expect(items).toHaveLength(1);
    expect(items[0].header).toBe("Science one");
  });

  it("returns tidbits matching a search term, ranked by relevance", async () => {
    const db = await createTestDb();
    const categoryId = await seedCategory(db);
    await seedTidbit(db, categoryId, { header: "Octopus facts", body: "Octopuses are cephalopods." });
    await seedTidbit(db, categoryId, { header: "Unrelated", body: "Nothing to do with the search." });

    const { items } = await getFeedPage({ searchTerm: "octopus" }, db);

    expect(items).toHaveLength(1);
    expect(items[0].header).toBe("Octopus facts");
  });

  it("returns an empty result set for a search term matching nothing, not an error", async () => {
    const db = await createTestDb();
    const categoryId = await seedCategory(db);
    await seedTidbit(db, categoryId, { header: "Something", body: "Some body text." });

    const { items, nextCursor } = await getFeedPage({ searchTerm: "zzzznomatch" }, db);

    expect(items).toHaveLength(0);
    expect(nextCursor).toBeNull();
  });

  it("handles raw FTS5 operator characters in the search term without throwing", async () => {
    const db = await createTestDb();
    const categoryId = await seedCategory(db);
    await seedTidbit(db, categoryId, { header: "Something", body: "Some body text." });

    await expect(getFeedPage({ searchTerm: '"' }, db)).resolves.toBeDefined();
    await expect(getFeedPage({ searchTerm: "-leading-dash" }, db)).resolves.toBeDefined();
    await expect(getFeedPage({ searchTerm: "AND OR NOT" }, db)).resolves.toBeDefined();
  });

  it("applies category filter and search term together", async () => {
    const db = await createTestDb();
    const scienceId = await seedCategory(db, { slug: "science", name: "Science" });
    const historyId = await seedCategory(db, { slug: "history", name: "History" });
    await seedTidbit(db, scienceId, { header: "Octopus science", body: "Octopus facts." });
    await seedTidbit(db, historyId, { header: "Octopus history", body: "Octopus facts." });

    const { items } = await getFeedPage({ categorySlug: "science", searchTerm: "octopus" }, db);

    expect(items).toHaveLength(1);
    expect(items[0].header).toBe("Octopus science");
  });

  it("pages forward with no duplicates or skips, and signals end-of-list on the last page", async () => {
    const db = await createTestDb();
    const categoryId = await seedCategory(db);
    for (let i = 0; i < 5; i++) {
      await seedTidbit(db, categoryId, { header: `Fact ${i}`, createdAt: 1000 + i });
    }

    const firstPage = await getFeedPage({ pageSize: 3 }, db);
    expect(firstPage.items).toHaveLength(3);
    expect(firstPage.nextCursor).not.toBeNull();

    const secondPage = await getFeedPage({ pageSize: 3, cursor: firstPage.nextCursor }, db);
    expect(secondPage.items).toHaveLength(2);
    expect(secondPage.nextCursor).toBeNull();

    const firstIds = firstPage.items.map((i) => i.id);
    const secondIds = secondPage.items.map((i) => i.id);
    expect(secondIds.some((id) => firstIds.includes(id))).toBe(false);
    expect(firstIds.length + secondIds.length).toBe(5);
  });
});
