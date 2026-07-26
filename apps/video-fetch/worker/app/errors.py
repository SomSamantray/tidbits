from __future__ import annotations

import re

PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"sign in to confirm", re.I), "YouTube bot check — add YouTube cookies to the worker."),
    (re.compile(r"empty media", re.I), "Instagram blocked this request — add Instagram cookies to the worker."),
    (re.compile(r"login", re.I), "This content may require login; only public URLs are supported."),
    (re.compile(r"403|forbidden", re.I), "Platform blocked the request — try again or add cookies."),
    (re.compile(r"unsupported", re.I), "This URL is from an unsupported platform."),
]


def friendly_error(raw: str, *, platform: str | None = None) -> str:
    for pattern, message in PATTERNS:
        if pattern.search(raw):
            return message
    if platform == "reddit":
        return "Reddit blocked this download — public posts only; impersonation may help."
    if platform == "linkedin":
        return "LinkedIn public videos only; private posts are not supported."
    if platform == "instagram":
        return "Instagram needs worker cookies — set YTDLP_COOKIES_INSTAGRAM to a Netscape cookie file."
    return raw or "Download failed"
