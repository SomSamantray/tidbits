const LOCAL_SITE_URL = "http://localhost:3000/";

export const SITE_NAME = "Tidbits";
export const SITE_DESCRIPTION = "A colorful, cartoonish feed of bite-sized trivia and fun facts.";

type SiteUrlEnv = {
  NEXT_PUBLIC_SITE_URL?: string;
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  VERCEL_URL?: string;
};

export function getSiteUrl(env: SiteUrlEnv = process.env): URL {
  const rawUrl = env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!rawUrl) {
    if (env.VERCEL_ENV === "preview" && env.VERCEL_URL?.trim()) {
      const previewOrigin = env.VERCEL_URL.trim();
      const previewUrl = new URL(
        previewOrigin.startsWith("http://") || previewOrigin.startsWith("https://")
          ? previewOrigin
          : `https://${previewOrigin}`,
      );

      if (previewUrl.protocol !== "https:" || previewUrl.pathname !== "/" || previewUrl.search || previewUrl.hash) {
        throw new Error("VERCEL_URL must be an HTTPS origin without a path or query string.");
      }

      return new URL(previewUrl.origin + "/");
    }

    if (env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_SITE_URL must be set to the public HTTPS site URL in production.");
    }
    return new URL(LOCAL_SITE_URL);
  }

  let siteUrl: URL;
  try {
    siteUrl = new URL(rawUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a valid absolute URL.");
  }

  const isLocalHttp = env.NODE_ENV !== "production" && siteUrl.protocol === "http:";
  if (siteUrl.protocol !== "https:" && !isLocalHttp) {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS outside local development.");
  }

  const hasUnsupportedParts =
    siteUrl.username || siteUrl.password || siteUrl.search || siteUrl.hash || siteUrl.pathname !== "/";
  if (hasUnsupportedParts) {
    throw new Error("NEXT_PUBLIC_SITE_URL must contain only the public origin, without a path or query string.");
  }

  return new URL(siteUrl.origin + "/");
}

export function getSiteAssetUrl(pathname: string, env?: SiteUrlEnv): URL {
  return new URL(pathname.replace(/^\//, ""), getSiteUrl(env));
}
