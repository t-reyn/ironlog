"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Step = "email" | "sending" | "code" | "verifying" | "error";

export function Login() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [error, setError] = useState("");

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStep("sending");
    setError("");
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
    if (error) {
      setError(error.message);
      setStep("error");
    } else {
      setStep("code");
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setStep("verifying");
    setError("");
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    if (error) {
      setError(error.message);
      setStep("code");
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

      {step === "code" || step === "verifying" ? (
        <form onSubmit={verifyCode} className="flex flex-col gap-3">
          <p className="text-sm text-ink-soft">
            Enter the code sent to{" "}
            <span className="font-medium text-ink">{email}</span>
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            maxLength={8}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-center text-2xl tracking-widest text-ink outline-none focus:border-ember"
          />
          <button
            type="submit"
            disabled={step === "verifying"}
            className="rounded-lg bg-ember px-4 py-2 font-medium text-night transition hover:bg-ember-soft disabled:opacity-60"
          >
            {step === "verifying" ? "Verifying…" : "Sign in"}
          </button>
          <button
            type="button"
            onClick={() => { setStep("email"); setCode(""); setError(""); }}
            className="text-sm text-ink-faint hover:text-ink-soft"
          >
            Use a different email
          </button>
          {error && <p className="text-sm text-ember-soft">{error}</p>}
        </form>
      ) : (
        <form onSubmit={sendCode} className="flex flex-col gap-3">
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
            disabled={step === "sending"}
            className="rounded-lg bg-ember px-4 py-2 font-medium text-night transition hover:bg-ember-soft disabled:opacity-60"
          >
            {step === "sending" ? "Sending…" : "Send code"}
          </button>
          {step === "error" && (
            <p className="text-sm text-ember-soft">{error}</p>
          )}
        </form>
      )}
    </div>
  );
}
