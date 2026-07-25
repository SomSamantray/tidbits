import { afterEach, describe, expect, it, vi } from "vitest";
import sitemap from "./sitemap";

afterEach(() => vi.unstubAllEnvs());

describe("sitemap", () => {
  it("publishes only the absolute canonical homepage", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://tidbits.example");
    const entries = sitemap();

    expect(entries).toEqual([
      {
        url: "https://tidbits.example/",
        changeFrequency: "daily",
        priority: 1,
      },
    ]);
    expect(entries.some((entry) => entry.url.includes("?"))).toBe(false);
  });
});
