from __future__ import annotations

import time
from collections import defaultdict

WINDOW_SECONDS = 60


class RateLimiter:
    def __init__(self, limit_per_minute: int) -> None:
        self.limit = limit_per_minute
        self.hits: dict[str, list[float]] = defaultdict(list)

    def allow(self, key: str) -> bool:
        now = time.time()
        window_start = now - WINDOW_SECONDS
        self.hits[key] = [t for t in self.hits[key] if t >= window_start]
        if len(self.hits[key]) >= self.limit:
            return False
        self.hits[key].append(now)
        return True
