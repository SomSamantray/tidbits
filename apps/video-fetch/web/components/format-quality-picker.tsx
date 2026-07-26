"use client";

import type { AudioMode, OutputFormat, QualityCap } from "@/lib/api-client";

const FORMATS: OutputFormat[] = ["mp4", "webm", "mp3", "gif"];
const QUALITIES: QualityCap[] = [
  "8k_plus",
  "4k",
  "2160p",
  "1080p",
  "720p",
  "480p",
  "360p",
];

export function FormatQualityPicker({
  audioMode,
  outputFormat,
  qualityCap,
  gifDisabled,
  onFormatChange,
  onQualityChange,
}: {
  audioMode: AudioMode;
  outputFormat: OutputFormat;
  qualityCap: QualityCap;
  gifDisabled: boolean;
  onFormatChange: (format: OutputFormat) => void;
  onQualityChange: (quality: QualityCap) => void;
}) {
  const showQuality = audioMode !== "audio_only" && outputFormat !== "mp3";

  return (
    <div className="space-y-4">
      <div>
        <p className="mono-label mb-2">container</p>
        <div className="flex flex-wrap gap-2">
          {FORMATS.map((format) => {
            const disabled =
              (audioMode === "audio_only" && format !== "mp3") ||
              (format === "gif" && gifDisabled);
            return (
              <button
                key={format}
                type="button"
                disabled={disabled}
                title={format === "gif" && gifDisabled ? "GIF only for clips ≤5s" : undefined}
                onClick={() => onFormatChange(format)}
                className={`comic-button px-4 py-2 font-mono text-sm uppercase ${
                  outputFormat === format ? "bg-[var(--accent-sky)]" : "bg-white"
                }`}
              >
                {format}
              </button>
            );
          })}
        </div>
      </div>

      {showQuality && (
        <label className="block">
          <span className="mono-label mb-2 block">quality_cap</span>
          <select
            value={qualityCap}
            onChange={(e) => onQualityChange(e.target.value as QualityCap)}
            className="w-full rounded-xl border-2 border-[var(--foreground)] bg-white px-4 py-3 font-mono text-sm shadow-[3px_3px_0_var(--foreground)]"
          >
            {QUALITIES.map((q) => (
              <option key={q} value={q}>
                {q.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
