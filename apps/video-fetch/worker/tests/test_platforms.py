import pytest

from app.platforms import detect_platform


def test_detect_youtube():
    info = detect_platform("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    assert info is not None
    assert info.platform == "youtube"


def test_detect_unknown():
    assert detect_platform("https://example.com/video") is None


def test_detect_pexels_experimental():
    info = detect_platform("https://www.pexels.com/video/ocean-123/")
    assert info is not None
    assert info.tier == "experimental"


def test_platform_info_by_id_loom():
    from app.platforms import platform_info_by_id

    info = platform_info_by_id("loom")
    assert info is not None
    assert info.tier == "reliable"
    assert info.cookie_env is None
