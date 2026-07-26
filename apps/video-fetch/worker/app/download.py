from __future__ import annotations

import re
import subprocess
import uuid
from dataclasses import dataclass
from pathlib import Path

from .cookies import cookie_args_for_platform
from .errors import friendly_error
from .extractors import ExtractorError, _run_ytdlp, fetch_metadata
from .formats import height_for_quality, map_height_to_quality, ytdlp_format_string
from .platforms import detect_platform
from .postprocess import PostProcessError, extract_audio_mp3, strip_audio, to_looping_gif


@dataclass(frozen=True)
class DownloadResult:
    file_path: Path
    filename: str
    delivered_quality: str


def run_ytdlp_download(
    url: str,
    *,
    platform: str,
    output_template: str,
    extra_args: list[str] | None = None,
    timeout: int = 300,
) -> None:
    """Run yt-dlp download with platform cookies when configured."""
    cmd = [
        "yt-dlp",
        "--no-warnings",
        "--no-playlist",
        *cookie_args_for_platform(platform),
        "-o",
        output_template,
        *(extra_args or []),
        url,
    ]
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False,
            timeout=timeout,
        )
    except FileNotFoundError as exc:
        raise ExtractorError("yt-dlp is not installed on the worker") from exc
    except subprocess.TimeoutExpired as exc:
        raise ExtractorError("Download timed out") from exc

    if result.returncode != 0:
        stderr = (result.stderr or "").strip()
        raise ExtractorError(stderr or "Download failed", platform=platform)


def find_downloaded_files(output_template: str) -> list[Path]:
    """Find files matching a yt-dlp output template with %(ext)s placeholder."""
    pattern = output_template.replace("%(ext)s", "*")
    parent = Path(pattern).parent
    glob_pattern = Path(pattern).name
    if not parent.exists():
        return []
    return sorted(parent.glob(glob_pattern))


def resolve_delivered_quality(qualities_available: list[str], quality_cap: str) -> str:
    cap_height = height_for_quality(quality_cap)
    best: str | None = None
    best_height = -1
    for quality in qualities_available:
        height = height_for_quality(quality)
        if height <= cap_height and height > best_height:
            best = quality
            best_height = height
    if best:
        return best
    if qualities_available:
        return min(qualities_available, key=height_for_quality)
    return quality_cap


def build_ytdlp_extra_args(
    *,
    audio_mode: str,
    output_format: str,
    quality_cap: str,
) -> list[str]:
    if audio_mode == "audio_only" or output_format == "mp3":
        return ["-f", "bestaudio/best", "-x", "--audio-format", "mp3"]

    fmt = ytdlp_format_string(
        output_format=output_format,
        quality_cap=quality_cap,
        audio_mode=audio_mode,
    )
    merge_format = "webm" if output_format == "webm" else "mp4"
    return ["-f", fmt, "--merge-output-format", merge_format]


def _sanitize_filename(title: str, ext: str) -> str:
    safe = re.sub(r'[\\/:*?"<>|]', "", title).strip()[:100]
    return f"{safe or 'download'}{ext}"


def _pick_primary_file(files: list[Path], output_format: str, audio_mode: str) -> Path:
    if not files:
        raise ExtractorError("Download completed but no file was found")

    if audio_mode == "audio_only" or output_format == "mp3":
        mp3 = [f for f in files if f.suffix == ".mp3"]
        return mp3[0] if mp3 else files[0]

    if output_format == "gif":
        gif = [f for f in files if f.suffix == ".gif"]
        return gif[0] if gif else files[0]

    preferred_ext = ".webm" if output_format == "webm" else ".mp4"
    preferred = [f for f in files if f.suffix == preferred_ext]
    return preferred[0] if preferred else files[0]


def expand_playlist_urls(urls: list[str], *, max_batch: int) -> list[str]:
    expanded: list[str] = []
    for url in urls:
        if "list=" not in url:
            expanded.append(url)
            continue
        try:
            platform_info = detect_platform(url)
            platform_name = platform_info.platform if platform_info else None
            data = _run_ytdlp(["--flat-playlist", "-J", url], platform=platform_name)
        except ExtractorError:
            expanded.append(url)
            continue
        for entry in data.get("entries") or []:
            entry_url = entry.get("url") or entry.get("webpage_url")
            if entry_url:
                expanded.append(entry_url)
            if len(expanded) >= max_batch:
                return expanded[:max_batch]
    return expanded[:max_batch]


def download_item(
    url: str,
    *,
    audio_mode: str,
    output_format: str,
    quality_cap: str,
    work_dir: Path,
    timeout: int = 300,
) -> DownloadResult:
    info = detect_platform(url)
    if info is None:
        raise ExtractorError("Unsupported platform", platform="unknown")

    metadata = fetch_metadata(url)
    delivered_quality = resolve_delivered_quality(metadata["qualities_available"], quality_cap)

    work_dir.mkdir(parents=True, exist_ok=True)
    stem = uuid.uuid4().hex[:12]
    output_template = str(work_dir / f"{stem}.%(ext)s")
    extra_args = build_ytdlp_extra_args(
        audio_mode=audio_mode,
        output_format=output_format,
        quality_cap=quality_cap,
    )

    run_ytdlp_download(
        url,
        platform=info.platform,
        output_template=output_template,
        extra_args=extra_args,
        timeout=timeout,
    )

    files = find_downloaded_files(output_template)
    source = _pick_primary_file(files, output_format, audio_mode)
    title = metadata.get("title") or "download"
    duration = float(metadata.get("duration_seconds") or 0)

    final_path = source
    if output_format == "gif":
        gif_path = work_dir / f"{stem}.gif"
        to_looping_gif(source, gif_path, duration_seconds=duration)
        final_path = gif_path
        for f in files:
            if f != gif_path and f.exists():
                f.unlink(missing_ok=True)
    elif audio_mode == "mute_video" and source.suffix in {".mp4", ".webm", ".mkv"}:
        muted_path = work_dir / f"{stem}-muted{source.suffix}"
        strip_audio(source, muted_path)
        final_path = muted_path
        if source != muted_path and source.exists():
            source.unlink(missing_ok=True)
    elif (audio_mode == "audio_only" or output_format == "mp3") and source.suffix != ".mp3":
        mp3_path = work_dir / f"{stem}.mp3"
        extract_audio_mp3(source, mp3_path)
        final_path = mp3_path
        if source != mp3_path and source.exists():
            source.unlink(missing_ok=True)

    ext = final_path.suffix or (".mp3" if output_format == "mp3" else ".mp4")
    filename = _sanitize_filename(str(title), ext)

    return DownloadResult(
        file_path=final_path,
        filename=filename,
        delivered_quality=delivered_quality,
    )


def download_error_message(exc: Exception, *, platform: str | None) -> str:
    if isinstance(exc, (ExtractorError, PostProcessError)):
        return friendly_error(str(exc), platform=platform or getattr(exc, "platform", None))
    return friendly_error(str(exc), platform=platform)
