from __future__ import annotations

from unittest.mock import patch

import pytest

from app.extractors import ExtractorError, fetch_metadata


YOUTUBE_JSON = """
{
  "title": "Test Video",
  "duration": 120,
  "height": 1080,
  "formats": [{"height": 1080, "vcodec": "avc1"}]
}
"""


def test_fetch_metadata_includes_cookie_flags(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("YTDLP_COOKIES_INSTAGRAM", raising=False)

    with patch("app.extractors._run_ytdlp") as run:
        run.return_value = {
            "title": "Reel",
            "duration": 6,
            "height": 720,
            "formats": [{"height": 720, "vcodec": "avc1"}],
        }
        result = fetch_metadata("https://www.instagram.com/reel/ABC123/")

    assert result["platform"] == "instagram"
    assert result["cookies_required"] is True
    assert result["cookies_configured"] is False
    assert any("YTDLP_COOKIES_INSTAGRAM" in w for w in result["warnings"])
    run.assert_called_once()
    assert run.call_args.kwargs["platform"] == "instagram"


def test_fetch_metadata_loom_no_cookies_required() -> None:
    with patch("app.extractors._run_ytdlp") as run:
        run.return_value = {
            "title": "Loom share",
            "duration": 30,
            "height": 720,
            "formats": [{"height": 720, "vcodec": "avc1"}],
        }
        result = fetch_metadata("https://www.loom.com/share/abc123")

    assert result["platform"] == "loom"
    assert result["cookies_required"] is False
    assert result["cookies_configured"] is False
    run.assert_called_once_with(["--dump-single-json", "https://www.loom.com/share/abc123"], platform="loom")


def test_run_ytdlp_passes_cookie_args(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    cookie_file = tmp_path / "instagram.txt"
    cookie_file.write_text("# Netscape\n", encoding="utf-8")
    monkeypatch.setenv("YTDLP_COOKIES_INSTAGRAM", str(cookie_file))

    with patch("app.extractors.subprocess.run") as run:
        run.return_value.returncode = 0
        run.return_value.stdout = YOUTUBE_JSON
        run.return_value.stderr = ""
        from app.extractors import _run_ytdlp

        _run_ytdlp(["--dump-single-json", "https://www.instagram.com/reel/x/"], platform="instagram")

    cmd = run.call_args.args[0]
    assert "--cookies" in cmd
    assert str(cookie_file) in cmd


def test_extractor_error_carries_platform() -> None:
    err = ExtractorError("empty media response", platform="instagram")
    assert err.platform == "instagram"
