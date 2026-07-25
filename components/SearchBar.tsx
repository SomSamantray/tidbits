"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 350;

export function SearchBar({ initialValue }: { initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

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
        className="w-full rounded-full border-2 border-ink/10 bg-white px-5 py-2.5 text-ink outline-none focus:border-ink/30"
      />
    </div>
  );
}
