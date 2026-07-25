"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 350;

export function SearchBar({ initialValue }: { initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  // Adjust state during render (React's documented escape hatch) rather than
  // in an effect: keeps the box in sync when the URL's `q` changes from
  // outside this component (e.g. back/forward navigation) without an extra
  // render pass.
  const [prevInitialValue, setPrevInitialValue] = useState(initialValue);
  if (initialValue !== prevInitialValue) {
    setPrevInitialValue(initialValue);
    setValue(initialValue);
  }

  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear a pending debounced navigation on unmount so a stale search from
  // before the visitor navigated away doesn't fire router.push() later.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function navigate(term: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (term.trim()) {
      params.set("q", term.trim());
    } else {
      params.delete("q");
    }
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  function handleChange(nextValue: string) {
    setValue(nextValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate(nextValue), DEBOUNCE_MS);
  }

  return (
    <div className="mx-auto mb-8 w-full max-w-md">
      <input
        type="search"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search tidbits…"
        aria-label="Search tidbits"
        className="w-full rounded-full border-2 border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-ink outline-none placeholder:text-ink-soft focus:border-ink/50"
      />
    </div>
  );
}
