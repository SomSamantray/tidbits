from __future__ import annotations

import os
from pathlib import Path

import pytest

from app.cookies import cookie_args_for_platform, cookies_configured
from app.platforms import platform_info_by_id


def test_cookie_args_when_file_exists(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    cookie_file = tmp_path / "instagram.txt"
    cookie_file.write_text("# Netscape HTTP Cookie File\n", encoding="utf-8")
    monkeypatch.setenv("YTDLP_COOKIES_INSTAGRAM", str(cookie_file))

    assert cookie_args_for_platform("instagram") == ["--cookies", str(cookie_file)]
    assert cookies_configured("instagram") is True


def test_cookie_args_missing_env() -> None:
    assert cookie_args_for_platform("instagram") == []
    assert cookies_configured("instagram") is False


def test_cookie_args_missing_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("YTDLP_COOKIES_INSTAGRAM", str(tmp_path / "missing.txt"))
    assert cookie_args_for_platform("instagram") == []
    assert cookies_configured("instagram") is False


def test_loom_has_no_cookie_env() -> None:
    info = platform_info_by_id("loom")
    assert info is not None
    assert info.cookie_env is None
    assert cookie_args_for_platform("loom") == []
