"use client";

import { useState } from "react";
import { like, share } from "@/app/actions/engagement";
import { formatCompact } from "@/lib/format";

export function EngagementButtons({
  tidbitId,
  header,
  initialLikeCount,
  initialShareCount,
}: {
  tidbitId: number;
  header: string;
  initialLikeCount: number;
  initialShareCount: number;
}) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [liked, setLiked] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [shareCount, setShareCount] = useState(initialShareCount);
  const [toast, setToast] = useState<string | null>(null);

  async function handleLike() {
    if (liked || likePending) return; // protect both the session and the in-flight request
    setLikePending(true);
    setLiked(true);
    setLikeCount((n) => n + 1);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);

    try {
      const result = await like(tidbitId);
      setLikeCount(result.likeCount);
    } catch {
      setLiked(false);
      setLikeCount((n) => n - 1);
      setToast("Couldn't like this tidbit. Try again.");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLikePending(false);
    }
  }

  async function handleShare() {
    const shareData = { title: "Tidbits", text: header, url: typeof window !== "undefined" ? window.location.href : undefined };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        return; // user cancelled the native share sheet — don't count it
      }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareData.url ?? header);
        setToast("Link copied!");
        setTimeout(() => setToast(null), 2000);
      } catch {
        return;
      }
    } else {
      return;
    }

    try {
      const result = await share(tidbitId);
      setShareCount(result.shareCount);
    } catch {
      // Share already happened from the visitor's perspective; a failed
      // count bump isn't worth surfacing as an error.
    }
  }

  return (
    <div className="relative mt-1 flex items-center gap-4 text-sm text-ink-soft">
      <button
        type="button"
        onClick={handleLike}
        disabled={likePending}
        aria-pressed={liked}
        aria-label={liked ? "Liked" : "Like this tidbit"}
        className="flex items-center gap-1 disabled:opacity-70"
      >
        <span className={animating ? "heart-pop" : undefined}>{liked ? "❤️" : "🤍"}</span>
        {formatCompact(likeCount)}
      </button>
      <button type="button" onClick={handleShare} aria-label="Share this tidbit" className="flex items-center gap-1">
        <span>🔗</span>
        {formatCompact(shareCount)}
      </button>
      {toast && (
        <span className="absolute -top-8 left-0 rounded-full bg-ink px-3 py-1 text-xs text-cream">
          {toast}
        </span>
      )}
    </div>
  );
}
