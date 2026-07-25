import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "./robots";

afterEach(() => vi.unstubAllEnvs());

describe("robots", () => {
  it("allows public assets, excludes private surfaces, and points to the sitemap", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://tidbits.example");
    const rules = robots();

    expect(rules).toEqual({
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/"],
      },
      sitemap: "https://tidbits.example/sitemap.xml",
      host: "https://tidbits.example/",
    });
  });
});
