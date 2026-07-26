# Video Fetch

Personal cloud web app for batch video downloads from 15 platforms.

## Quick start

```bash
cd apps/video-fetch
cp .env.example .env

# Worker tests
cd worker && pip install -e ".[dev]" && pytest && cd ..

# Web
cd web && npm install && npm test && npm run dev
```

Open http://localhost:3100. Worker API: http://localhost:8000.

## Docker

```bash
docker compose up --build
```

## Deploy (Railway)

1. Create three services: `web`, `worker`, Redis plugin.
2. Set env vars from `.env.example` on each service.
3. Run `./scripts/deploy-check.sh https://your-web-url`.

## Platform URL test matrix

30 URLs (2 per platform) live in `worker/tests/fixtures/platform_urls.json`.

```bash
cd worker
python3 scripts/test_platform_urls.py              # detection + live yt-dlp metadata
python3 scripts/test_platform_urls.py --skip-metadata  # hostname detection only (~1s)
```

Report written to `worker/tests/reports/platform_url_results.json`.

## Personal use

This tool is for your own downloads only. Respect platform terms and copyright.
