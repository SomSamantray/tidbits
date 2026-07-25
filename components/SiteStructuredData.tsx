import { getSiteUrl, SITE_NAME } from "@/lib/seo/site-url";

export function SiteStructuredData() {
  const siteUrl = getSiteUrl().toString();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteUrl,
  };

  return (
    <script
      id="site-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
      }}
    />
  );
}
