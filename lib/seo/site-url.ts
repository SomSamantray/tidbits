const LOCAL_SITE_URL = "http://localhost:3000/";

export const SITE_NAME = "Tidbits";
export const SITE_DESCRIPTION = "A colorful, cartoonish feed of bite-sized trivia and fun facts.";

type SiteUrlEnv = {
  NEXT_PUBLIC_SITE_URL?: string;
  NODE_ENV?: string;
};

export function getSiteUrl(env: SiteUrlEnv = process.env): URL {
  const rawUrl = env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!rawUrl) {
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

  if (siteUrl.protocol !== "https:" && !(env.NODE_ENV !== "production" && siteUrl.protocol === "http:")) {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS outside local development.");
  }

  if (siteUrl.username || siteUrl.password || siteUrl.search || siteUrl.hash || siteUrl.pathname !== "/") {
    throw new Error("NEXT_PUBLIC_SITE_URL must contain only the public origin, without a path or query string.");
  }

  return new URL(siteUrl.origin + "/");
}

export function getSiteAssetUrl(pathname: string, env?: SiteUrlEnv): URL {
  return new URL(pathname.replace(/^\//, ""), getSiteUrl(env));
}
