from __future__ import annotations

QUALITY_HEIGHTS: dict[str, int] = {
    "8k_plus": 4320,
    "4k": 2160,
    "2160p": 2160,
    "1080p": 1080,
    "720p": 720,
    "480p": 480,
    "360p": 360,
}


def height_for_quality(quality_cap: str) -> int:
    return QUALITY_HEIGHTS.get(quality_cap, 1080)


def ytdlp_format_string(
    *,
    output_format: str,
    quality_cap: str,
    audio_mode: str,
) -> str:
    height = height_for_quality(quality_cap)

    if audio_mode == "audio_only" or output_format == "mp3":
        return "bestaudio/best"

    ext = "webm" if output_format == "webm" else "mp4"
    return (
        f"bv*[height<={height}][ext={ext}]+ba[ext=m4a]/"
        f"b[height<={height}][ext={ext}]/"
        f"b[height<={height}]/best"
    )


def map_height_to_quality(height: int | None) -> str:
    if height is None:
        return "720p"
    ordered = sorted(QUALITY_HEIGHTS.items(), key=lambda item: item[1], reverse=True)
    for name, cap in ordered:
        if height >= cap:
            return name
    return "360p"
