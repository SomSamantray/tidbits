// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { SiteStructuredData } from "./SiteStructuredData";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("SiteStructuredData", () => {
  it("renders truthful WebSite JSON-LD with the configured canonical URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://tidbits.example");
    vi.stubEnv("NODE_ENV", "production");
    const { container } = render(<SiteStructuredData />);
    const script = container.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(script?.textContent ?? "{}");

    expect(data).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Tidbits",
      url: "https://tidbits.example/",
    });
    expect(data.author).toBeUndefined();
    expect(data.aggregateRating).toBeUndefined();
  });
});
