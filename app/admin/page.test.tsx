import { describe, expect, it } from "vitest";
import { metadata } from "./page";

describe("admin metadata", () => {
  it("keeps the password-protected authoring surface out of search results", () => {
    expect(metadata).toMatchObject({
      robots: {
        index: false,
        follow: false,
      },
    });
  });
});
