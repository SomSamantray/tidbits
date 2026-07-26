from __future__ import annotations

import time
from pathlib import Path
from unittest.mock import patch

import pytest

from app.download import DownloadResult, resolve_delivered_quality
from app.jobs import JOBS, CreateJobRequest, create_job, get_item_file, get_job


@pytest.fixture(autouse=True)
def clear_jobs():
    JOBS.clear()
    yield
    JOBS.clear()


def test_create_job_batch_expands_to_items():
    payload = CreateJobRequest(
        urls=["https://youtube.com/watch?v=abc", "https://vimeo.com/123"],
        audio_mode="mute_video",
        output_format="mp4",
        quality_cap="720p",
    )
    with patch("app.jobs._schedule_job"):
        job = create_job(payload)
    assert job["id"]
    assert len(job["items"]) == 2
    assert job["items"][0]["requested_quality"] == "720p"


def test_resolve_delivered_quality_fallback():
    assert resolve_delivered_quality(["1080p", "720p"], "4k") == "1080p"
    assert resolve_delivered_quality(["720p"], "1080p") == "720p"


@patch("app.jobs.download_item")
@patch("app.jobs._schedule_job")
def test_job_processing_sets_download_url(mock_schedule, mock_download, tmp_path: Path):
    mock_download.return_value = DownloadResult(
        file_path=tmp_path / "video.mp4",
        filename="video.mp4",
        delivered_quality="1080p",
    )
    (tmp_path / "video.mp4").write_bytes(b"fake")

    payload = CreateJobRequest(
        urls=["https://www.loom.com/share/abc123"],
        quality_cap="4k",
    )
    job = create_job(payload)
    job_id = job["id"]

    # Run synchronously instead of thread pool
    from app.jobs import _process_job

    _process_job(job_id)

    finished = get_job(job_id)
    assert finished is not None
    assert finished["items"][0]["status"] == "ready"
    assert finished["items"][0]["delivered_quality"] == "1080p"
    assert finished["items"][0]["download_url"].endswith("/file")

    file_result = get_item_file(job_id, finished["items"][0]["id"])
    assert file_result is not None


@patch("app.jobs.download_item")
@patch("app.jobs._schedule_job")
def test_partial_failure(mock_schedule, mock_download):
    mock_download.side_effect = [
        DownloadResult(file_path=Path("a.mp4"), filename="a.mp4", delivered_quality="720p"),
        Exception("boom"),
    ]

    payload = CreateJobRequest(
        urls=["https://www.loom.com/share/1", "https://www.loom.com/share/2"],
    )
    job = create_job(payload)
    from app.jobs import _process_job

    with patch("app.jobs.get_item_file", return_value=(Path("a.mp4"), "a.mp4")):
        _process_job(job["id"])

    finished = get_job(job["id"])
    assert finished is not None
    statuses = {item["status"] for item in finished["items"]}
    assert statuses == {"ready", "failed"}
