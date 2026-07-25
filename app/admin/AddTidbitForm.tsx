"use client";

import { useActionState, useRef, useEffect } from "react";
import { addTidbit, logout, type AddTidbitState } from "./actions";
import type { Category } from "@/lib/db/queries";

const initialState: AddTidbitState = { error: null, success: false };

export function AddTidbitForm({ categories }: { categories: Category[] }) {
  const [state, formAction, isPending] = useActionState(addTidbit, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <div className="flex w-full max-w-lg flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">Add a tidbit</h1>
        <form action={logout}>
          <button className="text-sm text-ink-soft underline">Log out</button>
        </form>
      </div>

      <form ref={formRef} action={formAction} className="card-shell flex flex-col gap-4 p-6">
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          Header
          <input
            type="text"
            name="header"
            required
            maxLength={120}
            className="rounded-xl border-2 border-ink/10 bg-white px-3 py-2 text-ink outline-none focus:border-ink/30"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          Trivia
          <textarea
            name="body"
            required
            rows={4}
            className="rounded-xl border-2 border-ink/10 bg-white px-3 py-2 text-ink outline-none focus:border-ink/30"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          Category
          <select
            name="categoryId"
            required
            className="rounded-xl border-2 border-ink/10 bg-white px-3 py-2 text-ink outline-none focus:border-ink/30"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="text-sm text-green-700">Added! It's live on the feed.</p>}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-ink px-5 py-2 font-display font-semibold text-cream disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Add tidbit"}
        </button>
      </form>
    </div>
  );
}
