import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Fredoka: () => ({ variable: "--font-display" }),
  Nunito: () => ({ variable: "--font-body" }),
}));

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("root metadata", () => {
  it("publishes the canonical and social metadata from the production origin", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://teedbits.vercel.app");

    const { metadata } = await import("./layout");

    expect(metadata.metadataBase?.toString()).toBe("https://teedbits.vercel.app/");
    expect(metadata.alternates?.canonical).toBe("/");
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      url: "/",
      images: [
        {
          url: "/opengraph-image.png",
          width: 1200,
          height: 630,
        },
      ],
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      images: ["/opengraph-image.png"],
    });

    const metadataUrls = [
      metadata.alternates?.canonical,
      metadata.openGraph?.url,
      ...(Array.isArray(metadata.openGraph?.images) ? metadata.openGraph.images.map((image) => image.url) : []),
      ...(Array.isArray(metadata.twitter?.images) ? metadata.twitter.images : []),
    ].map((value) => new URL(String(value), metadata.metadataBase));

    expect(metadataUrls.every((url) => url.origin === "https://teedbits.vercel.app")).toBe(true);
    expect(metadataUrls.some((url) => url.hostname === "tidbits-nine.vercel.app")).toBe(false);
  });
});
