"use client";

import { useState } from "react";
import { AboutModal } from "./AboutModal";
import { ThemeToggle } from "./ThemeToggle";
import { BrandMark } from "./BrandMark";
import posthog from "posthog-js";

export function TopBar() {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <>
      <nav className="top-bar" aria-label="Primary navigation">
        <BrandMark />
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
