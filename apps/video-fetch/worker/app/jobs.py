from __future__ import annotations

import copy
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field, field_validator

from .download import download_error_message, download_item, expand_playlist_urls
from .extractors import validate_url
from .platforms import detect_platform
from .worker_settings import DOWNLOAD_DIR, JOB_DOWNLOAD_TIMEOUT, MAX_BATCH_SIZE, MAX_CONCURRENT_JOBS


class MetadataRequest(BaseModel):
    url: str


class CreateJobRequest(BaseModel):
    urls: list[str] = Field(min_length=1)
    audio_mode: str = "audio_and_video"
    output_format: str = "mp4"
    quality_cap: str = "1080p"

    @field_validator("urls")
    @classmethod
    def validate_urls(cls, urls: list[str]) -> list[str]:
        cleaned = [u.strip() for u in urls if u.strip()]
        if not cleaned:
            raise ValueError("At least one URL is required")
        if len(cleaned) > MAX_BATCH_SIZE:
            raise ValueError(f"Maximum {MAX_BATCH_SIZE} URLs per batch")
        for url in cleaned:
            validate_url(url)
        return cleaned


JOBS: dict[str, dict[str, Any]] = {}
_ITEM_FILES: dict[tuple[str, str], Path] = {}
_executor = ThreadPoolExecutor(max_workers=MAX_CONCURRENT_JOBS)
_lock = threading.Lock()


def _public_item(item: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in item.items() if not k.startswith("_")}


def _public_job(job: dict[str, Any]) -> dict[str, Any]:
    return {
        **{k: v for k, v in job.items() if k != "items"},
        "items": [_public_item(item) for item in job["items"]],
    }


def _aggregate_status(items: list[dict[str, Any]]) -> str:
    statuses = {item["status"] for item in items}
    if statuses <= {"ready"}:
        return "ready"
    if "failed" in statuses and "ready" in statuses:
        return "ready"
    if statuses <= {"failed"}:
        return "failed"
    if "processing" in statuses or "queued" in statuses:
        return "processing"
    return "processing"


def _process_item(job_id: str, item: dict[str, Any], request: dict[str, Any]) -> None:
    item["status"] = "processing"
    item_dir = DOWNLOAD_DIR / job_id / item["id"]
    platform = detect_platform(item["url"])
    platform_name = platform.platform if platform else None

    try:
        result = download_item(
            item["url"],
            audio_mode=request["audio_mode"],
            output_format=request["output_format"],
            quality_cap=request["quality_cap"],
            work_dir=item_dir,
            timeout=JOB_DOWNLOAD_TIMEOUT,
        )
        with _lock:
            _ITEM_FILES[(job_id, item["id"])] = result.file_path
        item["status"] = "ready"
        item["delivered_quality"] = result.delivered_quality
        item["filename"] = result.filename
        item["download_url"] = f"/api/jobs/{job_id}/items/{item['id']}/file"
        item["error"] = None
    except Exception as exc:  # noqa: BLE001
        item["status"] = "failed"
        item["error"] = download_error_message(exc, platform=platform_name)


def _process_job(job_id: str) -> None:
    job = JOBS.get(job_id)
    if job is None:
        return

    job["status"] = "processing"
    request = job["request"]

    for item in job["items"]:
        _process_item(job_id, item, request)
        job["status"] = _aggregate_status(job["items"])

    job["status"] = _aggregate_status(job["items"])


def _schedule_job(job_id: str) -> None:
    _executor.submit(_process_job, job_id)


def create_job(payload: CreateJobRequest) -> dict[str, Any]:
    expanded_urls = expand_playlist_urls(payload.urls, max_batch=MAX_BATCH_SIZE)
    job_id = str(uuid.uuid4())
    items = []
    for url in expanded_urls:
        items.append(
            {
                "id": str(uuid.uuid4()),
                "url": url,
                "status": "queued",
                "requested_quality": payload.quality_cap,
                "delivered_quality": None,
                "error": None,
                "download_url": None,
                "filename": None,
            }
        )

    record = {
        "id": job_id,
        "status": "queued",
        "items": items,
        "created_at": datetime.now(UTC).isoformat(),
        "request": payload.model_dump(),
    }
    JOBS[job_id] = record
    _schedule_job(job_id)
    return _public_job(copy.deepcopy(record))


def get_job(job_id: str) -> dict[str, Any] | None:
    job = JOBS.get(job_id)
    if job is None:
        return None
    return _public_job(copy.deepcopy(job))


def get_item_file(job_id: str, item_id: str) -> tuple[Path, str] | None:
    job = JOBS.get(job_id)
    if job is None:
        return None
    item = next((i for i in job["items"] if i["id"] == item_id), None)
    if item is None or item.get("status") != "ready":
        return None
    path = _ITEM_FILES.get((job_id, item_id))
    if path is None or not path.exists():
        return None
    filename = item.get("filename") or path.name
    return path, filename
