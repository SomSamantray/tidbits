import { describe, expect, it } from "vitest";
import { getSiteAssetUrl, getSiteUrl } from "./site-url";

describe("getSiteUrl", () => {
  it("normalizes a valid production HTTPS origin", () => {
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://tidbits.example/", NODE_ENV: "production" }).toString()).toBe(
      "https://tidbits.example/",
    );
  });

  it("uses localhost only outside production when no origin is configured", () => {
    expect(getSiteUrl({ NODE_ENV: "development" }).toString()).toBe("http://localhost:3000/");
  });

  it("rejects a missing production origin", () => {
    expect(() => getSiteUrl({ NODE_ENV: "production" })).toThrow(/must be set/i);
  });

  it("uses the Vercel preview origin when the production URL is not configured", () => {
    expect(
      getSiteUrl({
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
        VERCEL_URL: "tidbits-git-feature.vercel.app",
      }).toString(),
    ).toBe("https://tidbits-git-feature.vercel.app/");
  });

  it("rejects malformed, insecure, and path-based production origins", () => {
    expect(() => getSiteUrl({ NEXT_PUBLIC_SITE_URL: "not-a-url", NODE_ENV: "production" })).toThrow(/valid absolute/i);
    expect(() => getSiteUrl({ NEXT_PUBLIC_SITE_URL: "http://tidbits.example", NODE_ENV: "production" })).toThrow(/HTTPS/i);
    expect(() => getSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://tidbits.example/app", NODE_ENV: "production" })).toThrow(/origin/i);
  });

  it("resolves public assets against the same origin", () => {
    expect(
      getSiteAssetUrl("/opengraph-image.png", {
        NEXT_PUBLIC_SITE_URL: "https://tidbits.example",
        NODE_ENV: "production",
      }).toString(),
    ).toBe("https://tidbits.example/opengraph-image.png");
  });
});
