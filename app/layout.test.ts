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
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://tidbits.example");

    const { metadata } = await import("./layout");

    expect(metadata.metadataBase?.toString()).toBe("https://tidbits.example/");
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
  });
});
