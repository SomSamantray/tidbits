import { pathToFileURL } from "node:url";

export type PublicSeo = {
  canonical: string;
  ogUrl: string;
  ogImage: string;
  twitterImage: string;
};

const DEFAULT_ORIGIN = "https://teedbits.vercel.app";
const LEGACY_ORIGINS = [
  "https://tidbits-nine.vercel.app",
  "https://tidbits-somsamantray-gmailcoms-projects.vercel.app",
];

function firstAttribute(html: string, pattern: RegExp): string {
  return html.match(pattern)?.[1]?.trim() ?? "";
}

export function extractPublicSeo(html: string): PublicSeo {
  return {
    canonical: firstAttribute(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i),
    ogUrl: firstAttribute(html, /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i),
    ogImage: firstAttribute(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i),
    twitterImage: firstAttribute(html, /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i),
  };
}

export function validatePublicSeo(seo: PublicSeo, expectedOrigin: string): void {
  const expected = new URL(expectedOrigin).origin;
  const urls = Object.entries(seo);

  for (const [field, value] of urls) {
    if (!value) throw new Error(`Missing ${field} metadata.`);
    const parsed = new URL(value);
    if (parsed.origin !== expected) {
      throw new Error(`${field} does not use the canonical origin: ${parsed.origin}`);
    }
    if (LEGACY_ORIGINS.includes(parsed.origin)) {
      throw new Error(`${field} uses a legacy alias: ${parsed.origin}`);
    }
  }
}

async function getPublic(url: string): Promise<{ response: Response; body: string }> {
  const response = await fetch(url, { redirect: "follow" });
  const body = await response.text();
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}.`);
  if (!body.trim()) throw new Error(`${url} returned an empty body.`);
  if (response.url && new URL(response.url).origin !== new URL(url).origin) {
    throw new Error(`${url} redirected to an unexpected origin: ${response.url}`);
  }
  return { response, body };
}

async function checkAsset(url: string, expectedType: RegExp): Promise<void> {
  const { response, body } = await getPublic(url);
  const contentType = response.headers.get("content-type") ?? "";
  if (!expectedType.test(contentType)) {
    throw new Error(`${url} returned unexpected content type: ${contentType || "missing"}.`);
  }
  if (/text\/html/i.test(contentType)) throw new Error(`${url} returned HTML instead of an asset.`);
  if (!body.trim()) throw new Error(`${url} returned an empty asset body.`);
}

export async function verifyPublicSeo(origin = DEFAULT_ORIGIN): Promise<void> {
  const expectedOrigin = new URL(origin).origin;
  const homepageUrl = `${expectedOrigin}/`;
  const { response: homepageResponse, body: homepage } = await getPublic(homepageUrl);
  if (new URL(homepageResponse.url || homepageUrl).origin !== expectedOrigin) {
    throw new Error(`Homepage did not remain on the canonical origin: ${homepageResponse.url}`);
  }

  const seo = extractPublicSeo(homepage);
  validatePublicSeo(seo, expectedOrigin);

  await checkAsset(seo.ogImage, /^image\//i);
  await checkAsset(seo.twitterImage, /^image\//i);
  await checkAsset(`${expectedOrigin}/favicon.ico`, /^(image\/|application\/octet-stream)/i);
  await checkAsset(`${expectedOrigin}/icon.svg`, /^image\/svg\+xml/i);
  await checkAsset(`${expectedOrigin}/apple-icon.png`, /^image\/png/i);

  const robots = await getPublic(`${expectedOrigin}/robots.txt`);
  if (!robots.body.includes(`${expectedOrigin}/sitemap.xml`)) {
    throw new Error("robots.txt does not point to the canonical sitemap URL.");
  }

  const sitemap = await getPublic(`${expectedOrigin}/sitemap.xml`);
  if (!sitemap.body.includes(`${expectedOrigin}/`)) throw new Error("sitemap.xml omits the canonical homepage.");
  if (LEGACY_ORIGINS.some((legacy) => sitemap.body.includes(legacy))) {
    throw new Error("sitemap.xml contains a legacy origin.");
  }

  console.log(`Public SEO verification passed for ${expectedOrigin}`);
  console.log(`Canonical: ${seo.canonical}`);
  console.log(`OG image: ${seo.ogImage}`);
  console.log("HTTP-ready: metadata, icons, robots.txt, and sitemap.xml");
  console.log("LinkedIn-verified: run the LinkedIn Post Inspector after deployment.");
  console.log("WhatsApp-verified: share the URL in a fresh chat after deployment; cache refresh is external.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyPublicSeo(process.argv[2] ?? DEFAULT_ORIGIN).catch((error: unknown) => {
    console.error(`Public SEO verification failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
