"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="card-shell flex w-full max-w-sm flex-col gap-4 p-6">
      <h1 className="font-display text-2xl font-semibold text-ink">Admin login</h1>
      <label className="flex flex-col gap-1 text-sm text-ink-soft">
        Password
        <input
          type="password"
          name="password"
          required
          autoFocus
          className="rounded-xl border-2 border-ink/10 bg-white px-3 py-2 text-ink outline-none focus:border-ink/30"
        />
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-ink px-5 py-2 font-display font-semibold text-cream disabled:opacity-60"
      >
        {isPending ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}
