from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlparse

Platform = str
Tier = str


@dataclass(frozen=True)
class PlatformInfo:
    platform: Platform
    tier: Tier
    cookie_env: str | None = None


HOST_MAP: dict[str, PlatformInfo] = {
    "youtube.com": PlatformInfo("youtube", "reliable", "YTDLP_COOKIES_YOUTUBE"),
    "youtu.be": PlatformInfo("youtube", "reliable", "YTDLP_COOKIES_YOUTUBE"),
    "linkedin.com": PlatformInfo("linkedin", "best_effort"),
    "instagram.com": PlatformInfo("instagram", "cookies_recommended", "YTDLP_COOKIES_INSTAGRAM"),
    "x.com": PlatformInfo("x", "best_effort"),
    "twitter.com": PlatformInfo("x", "best_effort"),
    "reddit.com": PlatformInfo("reddit", "best_effort"),
    "redd.it": PlatformInfo("reddit", "best_effort"),
    "9gag.com": PlatformInfo("ninegag", "reliable"),
    "facebook.com": PlatformInfo("facebook", "cookies_recommended", "YTDLP_COOKIES_FACEBOOK"),
    "fb.watch": PlatformInfo("facebook", "cookies_recommended", "YTDLP_COOKIES_FACEBOOK"),
    "threads.net": PlatformInfo("threads", "cookies_recommended", "YTDLP_COOKIES_THREADS"),
    "threads.com": PlatformInfo("threads", "cookies_recommended", "YTDLP_COOKIES_THREADS"),
    "vimeo.com": PlatformInfo("vimeo", "reliable"),
    "snapchat.com": PlatformInfo("snapchat", "best_effort"),
    "loom.com": PlatformInfo("loom", "reliable"),
    "pinterest.com": PlatformInfo("pinterest", "best_effort"),
    "pin.it": PlatformInfo("pinterest", "best_effort"),
    "pexels.com": PlatformInfo("pexels", "experimental"),
    "unsplash.com": PlatformInfo("unsplash", "experimental"),
    "tumblr.com": PlatformInfo("tumblr", "best_effort"),
}


def normalize_host(url: str) -> str:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if host.startswith("www."):
        host = host[4:]
    return host


def detect_platform(url: str) -> PlatformInfo | None:
    host = normalize_host(url)
    if host in HOST_MAP:
        return HOST_MAP[host]
    for key, info in HOST_MAP.items():
        if host.endswith(f".{key}") or host == key:
            return info
    return None


def platform_info_by_id(platform: str) -> PlatformInfo | None:
    for info in HOST_MAP.values():
        if info.platform == platform:
            return info
    return None
