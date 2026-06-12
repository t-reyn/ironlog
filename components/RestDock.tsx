"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";

function beep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    osc.onended = () => ctx.close();
  } catch {
    /* audio not available — visual flash still fires */
  }
}

/** Charcoal rest card docked in the logger footer (the floating RestTimer
 *  pill covers the closed-logger case — only one of the two is mounted). */
export function RestDock({ nextHint }: { nextHint: string | null }) {
  const rest = useStore((s) => s.rest);
  const startRest = useStore((s) => s.startRest);
  const stopRest = useStore((s) => s.stopRest);
  const [now, setNow] = useState(() => Date.now());
  const beepedRef = useRef(false);

  const active = rest.endsAt !== null;
  const remainingMs = rest.endsAt ? rest.endsAt - now : 0;
  const remaining = Math.max(0, Math.ceil(remainingMs / 1000));
  const done = active && remainingMs <= 0;

  useEffect(() => {
    if (!active) return;
    beepedRef.current = false;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [active, rest.endsAt]);

  useEffect(() => {
    if (done && !beepedRef.current) {
      beepedRef.current = true;
      beep();
      const id = setTimeout(() => stopRest(), 2500);
      return () => clearTimeout(id);
    }
  }, [done, stopRest]);

  if (!active) return null;

  const pct = rest.duration > 0 ? Math.min(100, ((rest.duration - remaining) / rest.duration) * 100) : 100;
  const mm = String(Math.floor(remaining / 60));
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div
      className={[
        "sheet-up overflow-hidden rounded-3xl bg-green px-4 pt-3.5 shadow-[var(--rp-shadow)]",
        done ? "timer-done" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rp-eyebrow" style={{ color: "color-mix(in srgb, var(--rp-on-green) 55%, transparent)" }}>
          RESTING
        </span>
        {nextHint && (
          <span
            className="truncate font-mono text-[10.5px] uppercase"
            style={{ color: "color-mix(in srgb, var(--rp-on-green) 55%, transparent)" }}
          >
            {nextHint}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2.5 pb-3.5 pt-2">
        <span className="font-mono text-[32px] font-bold tabular-nums tracking-[-0.02em] text-on-green">
          {done ? "0:00" : `${mm}:${ss}`}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => startRest(Math.max(5, remaining - 15))}
          aria-label="Subtract 15 seconds"
          className="rounded-full border px-3 py-2 font-mono text-[13px] font-semibold"
          style={{ borderColor: "color-mix(in srgb, var(--rp-on-green) 28%, transparent)", color: "color-mix(in srgb, var(--rp-on-green) 85%, transparent)" }}
        >
          −15
        </button>
        <button
          onClick={() => startRest(remaining + 15)}
          aria-label="Add 15 seconds"
          className="rounded-full border px-3 py-2 font-mono text-[13px] font-semibold"
          style={{ borderColor: "color-mix(in srgb, var(--rp-on-green) 28%, transparent)", color: "color-mix(in srgb, var(--rp-on-green) 85%, transparent)" }}
        >
          +15
        </button>
        <button
          onClick={stopRest}
          className="rounded-full bg-amber px-4 py-2 font-mono text-[13px] font-bold text-on-amber"
        >
          Skip
        </button>
      </div>
      <div
        className="-mx-4 h-[5px]"
        style={{ background: "color-mix(in srgb, var(--rp-on-green) 16%, transparent)" }}
      >
        <div
          className="h-full bg-amber transition-[width] duration-200"
          style={{ width: `${done ? 100 : pct}%` }}
        />
      </div>
    </div>
  );
}
