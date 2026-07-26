"use client";

import type { AudioMode } from "@/lib/api-client";

const MODES: { id: AudioMode; label: string; hint: string }[] = [
  { id: "audio_only", label: "Audio only", hint: "MP3" },
  { id: "audio_and_video", label: "Audio + Video", hint: "Both tracks" },
  { id: "mute_video", label: "Mute video", hint: "No audio" },
];

export function AudioModePicker({
  value,
  onChange,
}: {
  value: AudioMode;
  onChange: (mode: AudioMode) => void;
}) {
  return (
    <div>
      <p className="mono-label mb-2">audio_mode</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => onChange(mode.id)}
            className={`comic-button px-4 py-3 text-left ${
              value === mode.id ? "bg-[var(--terminal)] text-[var(--foreground)]" : "bg-white"
            }`}
          >
            <span className="block font-bold">{mode.label}</span>
            <span className="font-mono text-xs opacity-70">{mode.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
