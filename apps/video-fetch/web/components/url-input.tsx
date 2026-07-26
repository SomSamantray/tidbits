"use client";

export function UrlInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mono-label mb-2 block">paste_urls[]</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        placeholder={"https://youtube.com/watch?v=...\nhttps://vimeo.com/...\n(one per line)"}
        className="w-full rounded-xl border-2 border-[var(--foreground)] bg-white px-4 py-3 font-mono text-sm shadow-[3px_3px_0_var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--terminal)]"
      />
    </label>
  );
}
