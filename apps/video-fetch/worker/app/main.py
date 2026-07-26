from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .errors import friendly_error
from .extractors import ExtractorError, fetch_metadata
from .jobs import CreateJobRequest, create_job, get_item_file, get_job
from .rate_limit import RateLimiter

app = FastAPI(title="video-fetch worker", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

limiter = RateLimiter(int(os.getenv("RATE_LIMIT_PER_MINUTE", "30")))


def client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/metadata")
def metadata(request: Request, body: dict) -> dict:
    if not limiter.allow(client_key(request)):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    url = (body.get("url") or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="url is required")

    try:
        return fetch_metadata(url)
    except ExtractorError as exc:
        raise HTTPException(
            status_code=400,
            detail=friendly_error(str(exc), platform=getattr(exc, "platform", None)),
        ) from exc


@app.post("/jobs")
def post_job(request: Request, payload: CreateJobRequest) -> dict:
    if not limiter.allow(client_key(request)):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    return create_job(payload)


@app.get("/jobs/{job_id}")
def read_job(job_id: str) -> dict:
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.get("/jobs/{job_id}/items/{item_id}/file")
def download_item_file(job_id: str, item_id: str) -> FileResponse:
    result = get_item_file(job_id, item_id)
    if result is None:
        raise HTTPException(status_code=404, detail="File not ready")
    path, filename = result
    return FileResponse(path, filename=filename, media_type="application/octet-stream")
