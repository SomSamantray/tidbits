from __future__ import annotations

import os
from pathlib import Path

from .platforms import PlatformInfo, platform_info_by_id


def _cookie_path(info: PlatformInfo) -> Path | None:
    if not info.cookie_env:
        return None
    raw = os.environ.get(info.cookie_env, "").strip()
    if not raw:
        return None
    path = Path(raw)
    if path.is_file():
        return path
    return None


def cookie_args_for_platform(platform: str) -> list[str]:
    info = platform_info_by_id(platform)
    if info is None:
        return []
    path = _cookie_path(info)
    if path is None:
        return []
    return ["--cookies", str(path)]


def cookies_configured(platform: str) -> bool:
    info = platform_info_by_id(platform)
    if info is None:
        return False
    return _cookie_path(info) is not None
