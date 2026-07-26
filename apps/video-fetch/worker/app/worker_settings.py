from __future__ import annotations

import os
from pathlib import Path

DOWNLOAD_DIR = Path(os.getenv("DOWNLOAD_DIR", "downloads"))
MAX_CONCURRENT_JOBS = int(os.getenv("MAX_CONCURRENT_JOBS", "2"))
MAX_BATCH_SIZE = int(os.getenv("MAX_BATCH_SIZE", "50"))
JOB_DOWNLOAD_TIMEOUT = int(os.getenv("JOB_DOWNLOAD_TIMEOUT", "300"))
