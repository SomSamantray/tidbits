"use client";

import type { JobResponse } from "@/lib/api-client";

export function JobProgress({ job }: { job: JobResponse }) {
  return (
    <div className="comic-card p-4">
      <p className="mono-label mb-3">job::{job.id.slice(0, 8)}</p>
      <ul className="space-y-3">
        {job.items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-[var(--foreground)]/20 bg-white/70 p-3"
          >
            <p className="truncate font-mono text-xs">{item.url}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--accent-coral)] px-2 py-1 font-mono text-xs">
                {item.status}
              </span>
              {item.delivered_quality && item.requested_quality !== item.delivered_quality && (
                <span className="rounded-full bg-[var(--terminal)]/30 px-2 py-1 font-mono text-xs">
                  wanted {item.requested_quality} · got {item.delivered_quality}
                </span>
              )}
            </div>
            {item.error && <p className="mt-2 text-sm text-red-700">{item.error}</p>}
            {item.download_url && (
              <a
                href={item.download_url}
                className="comic-button mt-3 inline-block bg-[var(--accent-lavender)] px-4 py-2 text-sm"
                download
              >
                Download
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
