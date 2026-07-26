# Platform support tiers

| Platform | Tier | Notes |
|----------|------|-------|
| YouTube | reliable | Cookies for bot checks |
| Vimeo | reliable | |
| Loom | reliable | Public share URLs; no cookies |
| 9GAG | reliable | curl-cffi impersonation |
| Instagram | cookies_recommended | Requires Netscape cookie file |
| Facebook | cookies_recommended | |
| Threads | cookies_recommended | yt-dlp has no Threads extractor yet (July 2026) |
| X | best_effort | Public tweets |
| Reddit | best_effort | Datacenter IP blocks common |
| LinkedIn | best_effort | Public videos only |
| Pinterest | best_effort | |
| Tumblr | best_effort | |
| Snapchat | best_effort | Spotlight URLs only |
| Pexels | experimental | May need custom extractor |
| Unsplash | experimental | May need custom extractor |

## Cookie setup

Export Netscape-format cookies from your browser and mount as secrets:

- `YTDLP_COOKIES_YOUTUBE`
- `YTDLP_COOKIES_INSTAGRAM`
- `YTDLP_COOKIES_FACEBOOK`
- `YTDLP_COOKIES_THREADS`

### Instagram minimum cookies

Create `secrets/instagram.txt` (never commit):

```text
# Netscape HTTP Cookie File
.instagram.com	TRUE	/	TRUE	1893456000	sessionid	YOUR_SESSION_ID
.instagram.com	TRUE	/	TRUE	1893456000	csrftoken	YOUR_CSRF_TOKEN
.instagram.com	TRUE	/	TRUE	1893456000	ds_user_id	YOUR_NUMERIC_USER_ID
```

If copying from browser DevTools, URL-decode `sessionid` (`%3A` → `:`).

Set in `.env`:

```bash
YTDLP_COOKIES_INSTAGRAM=/secrets/instagram.txt
```

### Loom

No cookies. Public `loom.com/share/...` URLs work with plain yt-dlp.

## Local docker

`docker-compose.yml` mounts `./secrets` read-only at `/secrets`. Place cookie files there and reference them in `.env`.
