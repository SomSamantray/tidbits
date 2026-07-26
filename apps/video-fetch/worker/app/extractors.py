from __future__ import annotations

import json
import subprocess
from typing import Any

from .cookies import cookie_args_for_platform, cookies_configured
from .formats import map_height_to_quality
from .platforms import PlatformInfo, detect_platform


class ExtractorError(Exception):
    def __init__(self, message: str, *, platform: str | None = None) -> None:
        super().__init__(message)
        self.platform = platform


def _run_ytdlp(args: list[str], *, platform: str | None = None) -> dict[str, Any]:
    cookie_args = cookie_args_for_platform(platform) if platform else []
    cmd = ["yt-dlp", "--no-warnings", "--no-playlist", *cookie_args, *args]
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False,
            timeout=120,
        )
    except FileNotFoundError as exc:
        raise ExtractorError("yt-dlp is not installed on the worker") from exc
    except subprocess.TimeoutExpired as exc:
        raise ExtractorError("Timed out fetching video metadata") from exc

    if result.returncode != 0:
        stderr = (result.stderr or "").strip()
        raise ExtractorError(stderr or "Failed to extract metadata", platform=platform)

    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise ExtractorError("Invalid metadata response from yt-dlp") from exc


def _cookie_warnings(info: PlatformInfo) -> tuple[list[str], bool, bool]:
    warnings: list[str] = []
    cookies_required = info.tier == "cookies_recommended"
    configured = cookies_configured(info.platform)

    if cookies_required and not configured:
        warnings.append(
            f"{info.platform} needs worker cookies — set {info.cookie_env} to a Netscape cookie file path."
        )
    elif cookies_required and configured:
        warnings.append(f"{info.platform} cookies are configured.")

    return warnings, cookies_required, configured


def fetch_metadata(url: str) -> dict[str, Any]:
    info = detect_platform(url)
    if info is None:
        raise ExtractorError("Unsupported platform", platform="unknown")

    data = _run_ytdlp(["--dump-single-json", url], platform=info.platform)
    duration = float(data.get("duration") or 0)
    height = data.get("height")
    if isinstance(height, str) and height.isdigit():
        height = int(height)

    qualities = []
    for fmt in data.get("formats") or []:
        fmt_height = fmt.get("height")
        if isinstance(fmt_height, int):
            qualities.append(map_height_to_quality(fmt_height))

    unique_qualities = list(dict.fromkeys(qualities)) or [map_height_to_quality(height if isinstance(height, int) else None)]

    warnings: list[str] = []
    if info.tier == "best_effort":
        warnings.append(f"{info.platform} downloads are best-effort on public URLs only.")
    if info.tier == "experimental":
        warnings.append(f"{info.platform} is experimental — direct MP4 URL parsing may be required.")

    cookie_warnings, cookies_required, cookies_configured_flag = _cookie_warnings(info)
    warnings.extend(cookie_warnings)

    return {
        "platform": info.platform,
        "title": data.get("title") or "Untitled",
        "duration_seconds": duration,
        "gif_eligible": duration > 0 and duration <= 5,
        "qualities_available": unique_qualities,
        "warnings": warnings,
        "tier": info.tier,
        "cookies_required": cookies_required,
        "cookies_configured": cookies_configured_flag,
    }


def validate_url(url: str) -> PlatformInfo:
    info = detect_platform(url)
    if info is None:
        raise ExtractorError("Unsupported platform", platform="unknown")
    return info
