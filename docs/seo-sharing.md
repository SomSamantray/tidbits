# Tidbits production SEO and link-preview checklist

This guide is for the final Vercel deployment. The canonical serving origin is `https://teedbits.vercel.app`; `https://tidbits-nine.vercel.app` is a legacy redirecting alias and must not appear in generated metadata.

## 1. Set the public URL in Vercel

1. Open the Tidbits project in Vercel.
2. Open **Settings → Environment Variables**.
3. Add this variable for **Production**:

   ```text
   NEXT_PUBLIC_SITE_URL=https://teedbits.vercel.app
   ```

4. Use the final public HTTPS origin only. Do not add `/admin`, a search query, the legacy alias, or a Vercel preview URL.
5. Save the variable and redeploy the Production deployment.

The application deliberately rejects a missing or insecure Production URL so canonical links, previews, robots, and the sitemap cannot silently point to localhost or a temporary deployment. Vercel Preview builds may omit this variable: when `VERCEL_ENV=preview`, the app uses Vercel's built-in `VERCEL_URL` as a temporary HTTPS origin. That Preview URL is not treated as the production canonical URL.

## 2. Check the deployed public surfaces

Run the repository verifier against the canonical origin:

```bash
npm run verify:seo -- https://teedbits.vercel.app
```

For a manual check, use real `GET` requests (not only headers):

```bash
curl -sS https://teedbits.vercel.app/ | rg 'canonical|og:title|og:image|twitter:card|application/ld\+json'
curl -sS https://teedbits.vercel.app/robots.txt
curl -sS https://teedbits.vercel.app/sitemap.xml
curl -sS -D - https://teedbits.vercel.app/favicon.ico -o /dev/null
curl -sS -D - https://teedbits.vercel.app/opengraph-image.png -o /dev/null
```

Confirm that:

- the canonical, Open Graph, Twitter, and JSON-LD URLs use the real HTTPS domain;
- `/robots.txt` points to `https://teedbits.vercel.app/sitemap.xml`;
- `/sitemap.xml` contains the homepage and no admin, API, search, or category-query URL;
- the exact emitted Open Graph image URL (including any query string) returns a non-empty image body without authentication;
- `/favicon.ico`, `/icon.svg`, and `/apple-icon.png` return their expected image content types.

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

These platforms read standard Open Graph fields, but each platform may crop, cache, delay, or override the preview. Track these as separate outcomes: `HTTP-ready` means the public checks pass; `LinkedIn-verified` means the Post Inspector shows the refreshed card; `WhatsApp-verified` means a fresh share shows the card. The application can guarantee correctly formed public metadata and assets, not third-party cache timing.

## 5. If something is wrong

- **Preview has no image:** request the exact emitted `og:image` URL directly and confirm it returns a non-empty image body without a login. Then rerun the relevant inspector.
- **Preview shows localhost, the legacy alias, or a stale Vercel URL:** fix `NEXT_PUBLIC_SITE_URL` in the Vercel **Production** environment and redeploy.
- **Sitemap shows the wrong hostname:** fix the same variable and redeploy; do not edit generated XML by hand.
- **Google has not updated the favicon:** confirm the icon URL is public and square, then allow time for recrawling. A correct favicon is eligible for display but is not guaranteed to appear immediately.
