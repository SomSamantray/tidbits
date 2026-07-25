import { describe, expect, it } from "vitest";
import { createTestDb, seedCategory, seedTidbit } from "./test-helpers";
import { likeTidbit, shareTidbit } from "./queries";

describe("likeTidbit", () => {
  it("inserts the interaction and increments the like count on first like", async () => {
    const db = await createTestDb();
    const categoryId = await seedCategory(db);
    const tidbitId = await seedTidbit(db, categoryId);

    const result = await likeTidbit(tidbitId, "anon-1", db);

    expect(result).toEqual({ incremented: true, likeCount: 1 });
  });

  it("does not double-increment when the same visitor likes the same card twice", async () => {
    const db = await createTestDb();
    const categoryId = await seedCategory(db);
    const tidbitId = await seedTidbit(db, categoryId);

    await likeTidbit(tidbitId, "anon-1", db);
    const second = await likeTidbit(tidbitId, "anon-1", db);

    expect(second).toEqual({ incremented: false, likeCount: 1 });
  });

  it("lets two different visitors each increment the count once", async () => {
    const db = await createTestDb();
    const categoryId = await seedCategory(db);
    const tidbitId = await seedTidbit(db, categoryId);

    await likeTidbit(tidbitId, "anon-1", db);
    const result = await likeTidbit(tidbitId, "anon-2", db);

    expect(result).toEqual({ incremented: true, likeCount: 2 });
  });
});

describe("shareTidbit", () => {
  it("increments the persisted share count", async () => {
    const db = await createTestDb();
    const categoryId = await seedCategory(db);
    const tidbitId = await seedTidbit(db, categoryId);

    const result = await shareTidbit(tidbitId, db);

    expect(result).toEqual({ shareCount: 1 });
  });

  it("increments again on a repeat share from the same visitor (not deduplicated, per R9)", async () => {
    const db = await createTestDb();
    const categoryId = await seedCategory(db);
    const tidbitId = await seedTidbit(db, categoryId);

    await shareTidbit(tidbitId, db);
    const second = await shareTidbit(tidbitId, db);

    expect(second).toEqual({ shareCount: 2 });
  });
});
