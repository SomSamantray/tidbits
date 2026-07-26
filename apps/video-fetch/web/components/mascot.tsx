type MascotState = "idle" | "loading" | "success" | "error";

const faces: Record<MascotState, { emoji: string; label: string }> = {
  idle: { emoji: "🧙‍♂️", label: "Ready to fetch" },
  loading: { emoji: "⚙️", label: "Downloading..." },
  success: { emoji: "🎉", label: "Done!" },
  error: { emoji: "😵", label: "Oops" },
};

export function Mascot({ state }: { state: MascotState }) {
  const face = faces[state];
  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-[var(--foreground)] bg-[var(--accent-lavender)] px-4 py-3 shadow-[3px_3px_0_var(--foreground)]">
      <span className="text-3xl" aria-hidden>
        {face.emoji}
      </span>
      <div>
        <p className="mono-label text-[var(--foreground-soft)]">fetch-wizard.exe</p>
        <p className="font-semibold">{face.label}</p>
      </div>
    </div>
  );
}
