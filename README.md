# Tidbits

Tidbits is a colorful, cartoonish feed of bite-sized trivia and fun facts. It uses Next.js, Turso/libSQL, and PostHog.

## Run locally

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Copy `.env.local.example` to `.env.local` and fill in the database, admin, cookie, and analytics values needed for your local setup.

Useful checks:

```bash
npm test
npm run lint
npm run build
```

## Production metadata, previews, and sitemap

Set `NEXT_PUBLIC_SITE_URL` in the Vercel **Production** environment to `https://teedbits.vercel.app`. Do not use the legacy `https://tidbits-nine.vercel.app` alias (it redirects), a path, or a query string. Redeploy after changing it.

Vercel Preview deployments may leave `NEXT_PUBLIC_SITE_URL` unset. In that case, the app uses Vercel's built-in `VERCEL_URL` as a temporary HTTPS origin so the Preview can build. Preview URLs are never used as the production canonical URL.

The app then publishes:

- `/sitemap.xml` — the canonical public homepage URL.
- `/robots.txt` — public crawl rules and the sitemap location.
- `/opengraph-image.png` — the branded 1200×630 preview artwork used by both Open Graph and Twitter-compatible metadata.
- `/icon.svg`, `/favicon.ico`, and `/apple-icon.png` — browser and mobile brand icons.

The favicon is a browser icon; WhatsApp and LinkedIn previews use the Open Graph image. A successful public asset check makes the deployment HTTP-ready, but third-party preview caches still need their own refresh.

For the complete beginner-friendly deployment and preview checklist, see [`docs/seo-sharing.md`](docs/seo-sharing.md).

## Deploy on Vercel

Import the repository into Vercel, configure the production environment variables from `.env.local.example`, and deploy. Turso must be reachable from the deployed app, and the production database must already have its schema and tidbits imported.
