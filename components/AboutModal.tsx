"use client";

import { useEffect, useRef } from "react";

export function AboutModal({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        event.preventDefault();
        closeRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="about-modal" role="dialog" aria-modal="true" aria-labelledby="about-title">
        <button ref={closeRef} type="button" className="modal-close" onClick={onClose} aria-label="Close About">
          ×
        </button>
        <p className="eyebrow">A tiny curiosity break</p>
        <h2 id="about-title" className="font-display text-2xl font-semibold">About Tidbits</h2>
        <p className="mt-3 text-ink-soft">
          Tidbits is a colorful collection of bite-sized trivia, made for those little moments when you want to learn something delightfully unexpected.
        </p>
        <p className="mt-3 text-ink-soft">
          Browse, search, like, and share the facts that make you pause and smile.
        </p>
      </section>
    </div>
  );
}
