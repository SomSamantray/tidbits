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

Set `NEXT_PUBLIC_SITE_URL` in the Vercel **Production** environment to the final public HTTPS origin, for example `https://tidbits.example`. Do not add a path, query string, or trailing application route. Redeploy after changing it.

The app then publishes:

- `/sitemap.xml` — the canonical public homepage URL.
- `/robots.txt` — public crawl rules and the sitemap location.
- `/opengraph-image.png` and `/twitter-image.png` — the branded 1200×630 preview artwork.
- `/icon.svg`, `/favicon.ico`, and `/apple-icon.png` — browser and mobile brand icons.

For the complete beginner-friendly deployment and preview checklist, see [`docs/seo-sharing.md`](docs/seo-sharing.md).

## Deploy on Vercel

Import the repository into Vercel, configure the production environment variables from `.env.local.example`, and deploy. Turso must be reachable from the deployed app, and the production database must already have its schema and tidbits imported.
