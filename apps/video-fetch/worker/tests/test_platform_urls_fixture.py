import json
from pathlib import Path

import pytest

from app.platforms import detect_platform

FIXTURES = Path(__file__).parent / "fixtures" / "platform_urls.json"


@pytest.fixture
def platform_urls() -> list[dict[str, str]]:
    return json.loads(FIXTURES.read_text())


def test_fixture_count(platform_urls: list[dict[str, str]]) -> None:
    assert len(platform_urls) == 30


def test_all_platforms_detected(platform_urls: list[dict[str, str]]) -> None:
    failures = []
    for entry in platform_urls:
        info = detect_platform(entry["url"])
        detected = info.platform if info else "unknown"
        if detected != entry["platform"]:
            failures.append(f"{entry['url']}: expected {entry['platform']}, got {detected}")
    assert not failures, "\n".join(failures)
