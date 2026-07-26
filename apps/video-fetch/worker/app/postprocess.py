from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path


class PostProcessError(Exception):
    pass


def strip_audio(input_path: Path, output_path: Path) -> None:
    _run_ffmpeg(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(input_path),
            "-an",
            "-c:v",
            "copy",
            str(output_path),
        ]
    )


def extract_audio_mp3(input_path: Path, output_path: Path) -> None:
    _run_ffmpeg(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(input_path),
            "-vn",
            "-acodec",
            "libmp3lame",
            "-q:a",
            "0",
            str(output_path),
        ]
    )


def to_looping_gif(input_path: Path, output_path: Path, *, duration_seconds: float) -> None:
    if duration_seconds > 5:
        raise PostProcessError("GIF only for videos 5 seconds or shorter")

    palette_path = output_path.with_suffix(".palette.png")
    try:
        _run_ffmpeg(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(input_path),
                "-vf",
                "fps=12,scale=480:-1:flags=lanczos,palettegen",
                str(palette_path),
            ]
        )
        _run_ffmpeg(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(input_path),
                "-i",
                str(palette_path),
                "-lavfi",
                "fps=12,scale=480:-1:flags=lanczos[x];[x][1:v]paletteuse,loop=0",
                str(output_path),
            ]
        )
    finally:
        if palette_path.exists():
            palette_path.unlink()


def _run_ffmpeg(args: list[str]) -> None:
    if shutil.which("ffmpeg") is None:
        raise PostProcessError("ffmpeg is not installed on the worker")
    result = subprocess.run(args, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise PostProcessError(result.stderr.strip() or "ffmpeg failed")
