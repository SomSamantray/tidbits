#!/usr/bin/env python3
"""Test platform detection and optional metadata extraction for fixture URLs."""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.extractors import ExtractorError, fetch_metadata  # noqa: E402
from app.platforms import detect_platform  # noqa: E402

FIXTURES = ROOT / "tests" / "fixtures" / "platform_urls.json"
DEFAULT_REPORT = ROOT / "tests" / "reports" / "platform_url_results.json"


def has_ytdlp() -> bool:
    return shutil.which("yt-dlp") is not None


def fetch_metadata_cli(url: str) -> tuple[bool, str]:
    try:
        fetch_metadata(url)
    except ExtractorError as exc:
        return False, str(exc)[:200]
    except Exception as exc:  # noqa: BLE001
        return False, str(exc)[:200]
    else:
        info = detect_platform(url)
        platform = info.platform if info else "unknown"
        return True, f"metadata ok ({platform})"


def main() -> int:
    parser = argparse.ArgumentParser(description="Test platform URL fixtures")
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT, help="JSON report path")
    parser.add_argument("--skip-metadata", action="store_true", help="Only test hostname detection")
    args = parser.parse_args()

    entries = json.loads(FIXTURES.read_text())
    ytdlp = has_ytdlp() and not args.skip_metadata

    results: list[dict] = []
    detect_ok = 0
    detect_fail = 0
    meta_ok = 0
    meta_fail = 0
    meta_skip = 0

    print(f"Testing {len(entries)} URLs from {FIXTURES.name}")
    print(f"yt-dlp metadata: {'on' if ytdlp else 'off'}\n")

    for i, entry in enumerate(entries, 1):
        expected = entry["platform"]
        url = entry["url"]
        info = detect_platform(url)
        detected = info.platform if info else "unknown"

        detect_pass = detected == expected
        if detect_pass:
            detect_ok += 1
            detect_status = "OK"
        else:
            detect_fail += 1
            detect_status = f"FAIL (got {detected})"

        meta_pass: bool | None = None
        meta_detail = "skipped"
        if not ytdlp:
            meta_skip += 1
        else:
            ok, detail = fetch_metadata_cli(url)
            meta_pass = ok
            meta_detail = detail
            if ok:
                meta_ok += 1
                meta_status = f"OK — {detail}"
            else:
                meta_fail += 1
                meta_status = f"FAIL — {detail}"

        if ytdlp:
            print(f"{i:02d}. [{expected}] {detect_status} | meta: {meta_status}")
        else:
            print(f"{i:02d}. [{expected}] {detect_status}")
        print(f"    {url}\n")

        results.append(
            {
                "index": i,
                "platform": expected,
                "url": url,
                "source": entry.get("source", "unknown"),
                "detected_platform": detected,
                "detect_pass": detect_pass,
                "metadata_pass": meta_pass,
                "metadata_detail": meta_detail,
            }
        )

    summary = {
        "total": len(entries),
        "detection_passed": detect_ok,
        "detection_failed": detect_fail,
        "metadata_passed": meta_ok if ytdlp else None,
        "metadata_failed": meta_fail if ytdlp else None,
        "metadata_skipped": meta_skip if not ytdlp else 0,
    }

    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps({"summary": summary, "results": results}, indent=2))

    print("=" * 60)
    print(f"Detection:  {detect_ok}/{len(entries)} passed, {detect_fail} failed")
    if ytdlp:
        print(f"Metadata:   {meta_ok}/{len(entries)} passed, {meta_fail} failed")
    else:
        print("Metadata:   skipped")
    print(f"Report:     {args.report}")

    return 0 if detect_fail == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
