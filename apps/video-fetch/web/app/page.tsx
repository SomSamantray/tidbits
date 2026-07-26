"use client";

import { useEffect, useMemo, useState } from "react";
import type { AudioMode, JobResponse, OutputFormat, QualityCap } from "@/lib/api-client";
import { createJob, getJob } from "@/lib/api-client";
import { AudioModePicker } from "@/components/audio-mode-picker";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { FormatQualityPicker } from "@/components/format-quality-picker";
import { JobProgress } from "@/components/job-progress";
import { Mascot } from "@/components/mascot";
import { UrlInput } from "@/components/url-input";

export default function HomePage() {
  const [urls, setUrls] = useState("");
  const [audioMode, setAudioMode] = useState<AudioMode>("audio_and_video");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("mp4");
  const [qualityCap, setQualityCap] = useState<QualityCap>("1080p");
  const [job, setJob] = useState<JobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const parsedUrls = useMemo(
    () =>
      urls
        .split(/\n|,/)
        .map((u) => u.trim())
        .filter(Boolean),
    [urls],
  );

  const mascotState = loading ? "loading" : error ? "error" : job ? "success" : "idle";

  useEffect(() => {
    if (!job) return;
    const terminal = job.items.every((item) => item.status === "ready" || item.status === "failed");
    if (terminal) return;

    const timer = setInterval(async () => {
      try {
        const updated = await getJob(job.id);
        setJob(updated);
      } catch {
        // keep polling until terminal or user leaves
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [job]);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      const created = await createJob({
        urls: parsedUrls,
        audio_mode: audioMode,
        output_format: outputFormat,
        quality_cap: qualityCap,
      });
      setJob(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10">
      <header className="mb-8 space-y-4">
        <p className="mono-label text-[var(--terminal)]">~/video-fetch</p>
        <h1 className="text-4xl font-black tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Video Fetch
        </h1>
        <p className="text-[var(--foreground-soft)]">
          Paste batch links. Pick audio mode + quality. Download to phone or desktop.
        </p>
        <Mascot state={mascotState} />
      </header>

      <DisclaimerBanner />

      <section className="comic-card space-y-6 p-6">
        <UrlInput value={urls} onChange={setUrls} />
        <AudioModePicker value={audioMode} onChange={setAudioMode} />
        <FormatQualityPicker
          audioMode={audioMode}
          outputFormat={outputFormat}
          qualityCap={qualityCap}
          gifDisabled
          onFormatChange={setOutputFormat}
          onQualityChange={setQualityCap}
        />

        {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}

        <button
          type="button"
          disabled={parsedUrls.length === 0 || loading}
          onClick={handleSubmit}
          className="comic-button w-full bg-[var(--terminal)] px-6 py-4 text-lg font-bold"
        >
          {loading ? "Queued..." : "Fetch my videos"}
        </button>
      </section>

      {job && (
        <section className="mt-8">
          <JobProgress job={job} />
        </section>
      )}
    </main>
  );
}
