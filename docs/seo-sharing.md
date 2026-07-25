# Tidbits production SEO and link-preview checklist

This guide is for the final Vercel deployment. It explains what to set, what to test, and why a preview may take time to update.

## 1. Set the public URL in Vercel

1. Open the Tidbits project in Vercel.
2. Open **Settings → Environment Variables**.
3. Add this variable for **Production**:

   ```text
   NEXT_PUBLIC_SITE_URL=https://your-real-domain.example
   ```

4. Use the final public HTTPS origin only. Do not add `/`, `/admin`, a search query, or a Vercel preview URL.
5. Save the variable and redeploy the Production deployment.

The application deliberately rejects a missing or insecure production URL so canonical links, previews, robots, and the sitemap cannot silently point to localhost or a temporary deployment.

## 2. Check the deployed public surfaces

Replace `https://your-real-domain.example` with the real site URL:

```bash
curl -I https://your-real-domain.example/
curl -s https://your-real-domain.example/ | rg 'canonical|og:title|og:image|twitter:card|application/ld\+json'
curl -s https://your-real-domain.example/robots.txt
curl -s https://your-real-domain.example/sitemap.xml
curl -I https://your-real-domain.example/favicon.ico
curl -I https://your-real-domain.example/opengraph-image.png
```

Confirm that:

- the canonical, Open Graph, Twitter, and JSON-LD URLs use the real HTTPS domain;
- `/robots.txt` points to `https://your-real-domain.example/sitemap.xml`;
- `/sitemap.xml` contains the homepage and no admin, API, search, or category-query URL;
- the favicon and preview image return successfully without authentication.

Do not paste secrets, Turso tokens, admin passwords, or cookies into screenshots or issue reports.

## 3. Tell Google about the site

1. Open [Google Search Console](https://search.google.com/search-console).
2. Add and verify the final domain or URL-prefix property.
3. Open **Sitemaps**, enter `sitemap.xml`, and submit it.
4. Use **URL inspection** for the homepage and request indexing when appropriate.

Submitting a sitemap is a discovery hint, not a guarantee that Google will index the page immediately. Favicon display and site-name selection are also controlled by Google and may take time.

## 4. Refresh social previews

Use the exact public homepage URL after the Production redeploy:

- **LinkedIn:** open the [Post Inspector](https://www.linkedin.com/post-inspector/) and inspect the URL. If LinkedIn shows an older image or title, refresh the inspection and wait for its cache to update.
- **Meta/Facebook:** use the [Sharing Debugger](https://developers.facebook.com/tools/debug/) and click **Debug**, then **Scrape Again** if available.
- **WhatsApp:** paste the public URL into a fresh chat or compose window after deployment. WhatsApp may reuse a cached preview; try a fresh URL or wait before treating a stale card as an application failure.

These platforms read standard Open Graph fields, but each platform may crop, cache, delay, or override the preview. The application can guarantee that the metadata and assets are public and correctly formed; it cannot guarantee when a third party refreshes its cache or chooses to display every field.

## 5. If something is wrong

- **Preview has no image:** request the image URL directly and confirm it returns `200` without a login. Then rerun the relevant inspector.
- **Preview shows localhost or a Vercel URL:** fix `NEXT_PUBLIC_SITE_URL` in the Vercel **Production** environment and redeploy.
- **Sitemap shows the wrong hostname:** fix the same variable and redeploy; do not edit generated XML by hand.
- **Google has not updated the favicon:** confirm the icon URL is public and square, then allow time for recrawling. A correct favicon is eligible for display but is not guaranteed to appear immediately.
