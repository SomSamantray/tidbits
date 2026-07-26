"use client";

import { useEffect, useState } from "react";

export function DisclaimerBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("vf-disclaimer");
    setVisible(!accepted);
  }, []);

  if (!visible) return null;

  return (
    <div className="comic-card mb-6 border-[var(--accent-coral)] bg-[#fff1f1] p-4">
      <p className="font-semibold">Personal use only</p>
      <p className="mt-1 text-sm text-[var(--foreground-soft)]">
        Download only content you have the right to save. Platform terms may prohibit
        downloading.
      </p>
      <button
        type="button"
        className="comic-button mt-3 bg-white px-4 py-2 text-sm"
        onClick={() => {
          localStorage.setItem("vf-disclaimer", "1");
          setVisible(false);
        }}
      >
        I understand
      </button>
    </div>
  );
}
