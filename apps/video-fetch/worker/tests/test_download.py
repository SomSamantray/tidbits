from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import pytest

from app.download import (
    DownloadResult,
    build_ytdlp_extra_args,
    download_item,
    resolve_delivered_quality,
    run_ytdlp_download,
)


def test_run_ytdlp_download_includes_cookies(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    cookie_file = tmp_path / "instagram.txt"
    cookie_file.write_text("# Netscape\n", encoding="utf-8")
    monkeypatch.setenv("YTDLP_COOKIES_INSTAGRAM", str(cookie_file))

    with patch("app.download.subprocess.run") as run:
        run.return_value.returncode = 0
        run.return_value.stdout = ""
        run.return_value.stderr = ""
        run_ytdlp_download(
            "https://www.instagram.com/reel/abc/",
            platform="instagram",
            output_template=str(tmp_path / "out.%(ext)s"),
            extra_args=["-f", "best"],
        )

    cmd = run.call_args.args[0]
    assert "--cookies" in cmd
    assert str(cookie_file) in cmd


def test_build_ytdlp_extra_args_mp3():
    args = build_ytdlp_extra_args(
        audio_mode="audio_only",
        output_format="mp3",
        quality_cap="1080p",
    )
    assert "-x" in args
    assert "mp3" in args


def test_resolve_delivered_quality_caps_to_1080():
    assert resolve_delivered_quality(["2160p", "1080p", "720p"], "1080p") == "1080p"


@patch("app.download.run_ytdlp_download")
@patch("app.download.fetch_metadata")
def test_download_item_mute_video(mock_meta, mock_run, tmp_path: Path):
    mock_meta.return_value = {
        "title": "Clip",
        "duration_seconds": 10,
        "qualities_available": ["720p"],
    }
    source = tmp_path / "clip.mp4"
    source.write_bytes(b"not-real-video")

    def fake_run(*_args, **kwargs):
        template = kwargs["output_template"]
        Path(template.replace("%(ext)s", "mp4")).write_bytes(b"x")

    mock_run.side_effect = fake_run

    with patch("app.download.strip_audio") as strip:
        muted = tmp_path / "clip-muted.mp4"
        muted.write_bytes(b"muted")
        strip.side_effect = lambda src, dst: dst.write_bytes(b"muted")

        result = download_item(
            "https://www.loom.com/share/abc",
            audio_mode="mute_video",
            output_format="mp4",
            quality_cap="1080p",
            work_dir=tmp_path,
        )

    assert result.delivered_quality == "720p"
    strip.assert_called_once()
