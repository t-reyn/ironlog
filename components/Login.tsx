"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export function Login() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState("");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setError(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-1 flex-col justify-center gap-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Iron<span className="text-ember">Log</span>
        </h1>
        <p className="mt-1 text-ink-soft">Track lifts, progress, and streaks.</p>
      </div>

      {status === "sent" ? (
        <div className="rounded-lg border border-mint/40 bg-mint/10 p-4 text-sm text-ink">
          Check <span className="font-medium">{email}</span> for a sign-in link.
        </div>
      ) : (
        <form onSubmit={sendLink} className="flex flex-col gap-3">
          <label className="text-sm text-ink-soft" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="rounded-lg border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-ember"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded-lg bg-ember px-4 py-2 font-medium text-night transition hover:bg-ember-soft disabled:opacity-60"
          >
            {status === "sending" ? "Sending…" : "Send magic link"}
          </button>
          {status === "error" && (
            <p className="text-sm text-ember-soft">{error}</p>
          )}
        </form>
      )}
    </div>
  );
}
