from app.formats import height_for_quality, map_height_to_quality, ytdlp_format_string


def test_height_mapping():
    assert height_for_quality("1080p") == 1080
    assert height_for_quality("8k_plus") == 4320


def test_format_string_mp4():
    fmt = ytdlp_format_string(
        output_format="mp4",
        quality_cap="720p",
        audio_mode="audio_and_video",
    )
    assert "height<=720" in fmt


def test_map_height_to_quality():
    assert map_height_to_quality(1920) == "1080p"
    assert map_height_to_quality(400) == "360p"
