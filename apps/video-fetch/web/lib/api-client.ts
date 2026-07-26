import type {
  AudioMode,
  CreateJobRequest,
  JobResponse,
  MetadataResponse,
  OutputFormat,
  QualityCap,
} from "@video-fetch/shared-types";

const serverWorkerUrl = process.env.WORKER_URL || "http://localhost:8000";

function apiBase() {
  if (typeof window === "undefined") {
    return serverWorkerUrl;
  }
  return "/api";
}

async function workerFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }

  return res.json() as Promise<T>;
}

export function fetchMetadata(url: string) {
  return workerFetch<MetadataResponse>("/metadata", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export function createJob(payload: CreateJobRequest) {
  return workerFetch<JobResponse>("/jobs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getJob(id: string) {
  return workerFetch<JobResponse>(`/jobs/${id}`);
}

export type { AudioMode, OutputFormat, QualityCap, JobResponse, MetadataResponse };
