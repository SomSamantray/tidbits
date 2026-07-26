export type Platform =
  | "youtube"
  | "linkedin"
  | "instagram"
  | "x"
  | "reddit"
  | "ninegag"
  | "facebook"
  | "threads"
  | "vimeo"
  | "snapchat"
  | "loom"
  | "pinterest"
  | "pexels"
  | "unsplash"
  | "tumblr"
  | "unknown";

export type AudioMode = "audio_only" | "audio_and_video" | "mute_video";

export type OutputFormat = "mp3" | "mp4" | "webm" | "gif";

export type QualityCap =
  | "8k_plus"
  | "4k"
  | "2160p"
  | "1080p"
  | "720p"
  | "480p"
  | "360p";

export type JobItemStatus =
  | "queued"
  | "expanding"
  | "processing"
  | "uploading"
  | "ready"
  | "failed"
  | "expired";

export interface MetadataResponse {
  platform: Platform;
  title: string;
  duration_seconds: number;
  gif_eligible: boolean;
  qualities_available: QualityCap[];
  warnings: string[];
  tier: "reliable" | "cookies_recommended" | "best_effort" | "experimental";
  cookies_required?: boolean;
  cookies_configured?: boolean;
}

export interface CreateJobRequest {
  urls: string[];
  audio_mode: AudioMode;
  output_format: OutputFormat;
  quality_cap: QualityCap;
}

export interface JobItem {
  id: string;
  url: string;
  status: JobItemStatus;
  requested_quality: QualityCap;
  delivered_quality?: QualityCap;
  error?: string;
  download_url?: string;
  filename?: string;
}

export interface JobResponse {
  id: string;
  status: JobItemStatus;
  items: JobItem[];
  created_at: string;
}
