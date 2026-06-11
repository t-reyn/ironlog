"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShojinIcon } from "./ShojinLogo";
import { Icon } from "./ShojinUI";

type Mode = "signin" | "signup";
type Status = "idle" | "busy" | "error";

export function Login() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (mode === "signup" && password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setStatus("busy");

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) { setError(error.message); setStatus("error"); }
      else setStatus("idle");
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) {
      setError(error.message);
      setStatus("error");
      return;
    }
    // Supabase returns a user with no identities when the email is already
    // registered (it won't reveal this via an error), so guide them to sign in.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError("An account with this email already exists. Sign in instead.");
      setStatus("error");
      return;
    }
    // No session means email confirmation is required.
    if (!data.session) {
      setNotice("Check your inbox to confirm your email, then sign in.");
    }
    setStatus("idle");
  }

  async function forgotPassword() {
    setError("");
    setNotice("");
    if (!email.trim()) { setError("Enter your email first."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
    });
    if (error) setError(error.message);
    else setNotice("Password reset link sent — check your inbox.");
  }

  function switchMode(m: Mode) {
    setMode(m);
    setError("");
    setNotice("");
    setPassword("");
    setConfirm("");
  }

  const fieldClass =
    "flex items-center gap-2.5 rounded-2xl border-[1.5px] border-line bg-surface px-4 h-14 focus-within:border-green-ink";

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-1 flex-col px-7 pt-24 pb-10">
      <div className="flex flex-col items-center gap-5">
        <ShojinIcon size={72} radius={18} />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          shōjin · beta
        </span>
        <div className="text-center">
          <h1 className="text-[30px] font-extrabold tracking-[-0.02em]">
            {mode === "signin" ? "Welcome back" : "Begin today"}
          </h1>
          <p className="mt-2 text-[15px] font-medium text-ink-soft">Consistency through devotion.</p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-10 flex flex-col gap-4">
        <div>
          <div className="mb-2 ml-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-faint">Email</div>
          <label className={fieldClass}>
            <Icon name="profile" size={19} color="var(--color-ink-faint)" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="min-w-0 flex-1 bg-transparent text-base font-medium text-ink outline-none placeholder:text-ink-faint"
            />
          </label>
        </div>

        <div>
          <div className="mb-2 ml-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-faint">Password</div>
          <label className={fieldClass}>
            <Icon name="bolt" size={19} color="var(--color-ink-faint)" />
            <input
              type={showPw ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="min-w-0 flex-1 bg-transparent text-base font-medium text-ink outline-none placeholder:text-ink-faint"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="shrink-0 text-[13px] font-semibold text-green-ink"
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </label>
        </div>

        {mode === "signup" && (
          <div>
            <div className="mb-2 ml-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-faint">Confirm</div>
            <label className={fieldClass}>
              <Icon name="bolt" size={19} color="var(--color-ink-faint)" />
              <input
                type={showPw ? "text" : "password"}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="min-w-0 flex-1 bg-transparent text-base font-medium text-ink outline-none placeholder:text-ink-faint"
              />
            </label>
          </div>
        )}

        {error && <p className="text-sm font-medium text-danger-soft">{error}</p>}
        {notice && <p className="text-sm font-medium text-green-ink">{notice}</p>}

        {mode === "signin" && (
          <button
            type="button"
            onClick={forgotPassword}
            className="-mt-1 self-start text-[13px] font-semibold text-green-ink"
          >
            Forgot password?
          </button>
        )}

        <button
          type="submit"
          disabled={status === "busy"}
          className="mt-3 h-14 w-full rounded-full bg-green font-bold text-on-green transition hover:opacity-95 disabled:opacity-60"
        >
          {status === "busy"
            ? mode === "signin" ? "Signing in…" : "Creating account…"
            : "Continue"}
        </button>
      </form>

      <div className="flex-1" />

      <div className="flex items-center justify-center gap-1.5 pt-6 text-[14.5px]">
        <span className="text-ink-faint">
          {mode === "signin" ? "New to shōjin?" : "Already training?"}
        </span>
        <button
          onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
          className="font-bold text-green-ink"
        >
          {mode === "signin" ? "Begin today" : "Sign in"}
        </button>
      </div>
    </div>
  );
}
