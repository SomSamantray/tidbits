import { describe, expect, it } from "vitest";
import { extractPublicSeo, validatePublicSeo } from "./verify-public-seo";

const homepage = `
  <link rel="canonical" href="https://teedbits.vercel.app/">
  <meta property="og:url" content="https://teedbits.vercel.app/">
  <meta property="og:image" content="https://teedbits.vercel.app/opengraph-image.png?abc123">
  <meta name="twitter:image" content="https://teedbits.vercel.app/opengraph-image.png?abc123">
`;

describe("public SEO verifier", () => {
  it("extracts the exact emitted preview URL, including its query string", () => {
    expect(extractPublicSeo(homepage)).toEqual({
      canonical: "https://teedbits.vercel.app/",
      ogUrl: "https://teedbits.vercel.app/",
      ogImage: "https://teedbits.vercel.app/opengraph-image.png?abc123",
      twitterImage: "https://teedbits.vercel.app/opengraph-image.png?abc123",
    });
  });

  it("rejects a stale production host and the redirecting legacy alias", () => {
    expect(() =>
      validatePublicSeo(
        {
          canonical: "https://tidbits-somsamantray-gmailcoms-projects.vercel.app/",
          ogUrl: "https://tidbits-nine.vercel.app/",
          ogImage: "https://tidbits-somsamantray-gmailcoms-projects.vercel.app/opengraph-image.png",
          twitterImage: "https://tidbits-nine.vercel.app/opengraph-image.png",
        },
        "https://teedbits.vercel.app",
      ),
    ).toThrow(/canonical origin|legacy alias/i);
  });
});
