"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";

type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "tidbits-theme";

function getSystemTheme(): Theme {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      return stored === "dark" || stored === "light" ? stored : getSystemTheme();
    } catch {
      return getSystemTheme();
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
    posthog.capture("theme_toggled", { theme: nextTheme });
  }

  const dark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={dark}
      suppressHydrationWarning
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
    >
      <span aria-hidden="true" suppressHydrationWarning>{dark ? "☼" : "☾"}</span>
    </button>
  );
}
