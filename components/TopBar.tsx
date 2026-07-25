"use client";

import { useState } from "react";
import { AboutModal } from "./AboutModal";
import { ThemeToggle } from "./ThemeToggle";
import posthog from "posthog-js";

export function TopBar() {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <>
      <nav className="top-bar" aria-label="Primary navigation">
        <span className="font-display text-2xl font-semibold text-ink">Tidbits</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="top-bar-link"
            onClick={() => { setAboutOpen(true); posthog.capture("about_opened"); }}
            aria-haspopup="dialog"
            aria-expanded={aboutOpen}
          >
            About
          </button>
          <ThemeToggle />
        </div>
      </nav>
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </>
  );
}
