import type { CSSProperties } from "react";

/* Shojin (精進) brand marks — ported from the design handoff (shojin-brand.jsx).
   The mark is an ascending staircase of rounded rects: small consistent steps,
   the top tread (the "next step") in the accent colour. */

const STEPS = [
  { x: 21, y: 72, w: 31, h: 20, r: 7, accent: false },
  { x: 44.5, y: 50, w: 31, h: 20, r: 7, accent: false },
  { x: 68, y: 28, w: 31, h: 20, r: 7, accent: true },
];

export function ShojinMark({
  size = 80,
  mark = "#F5F1EA",
  accent = "#C0392B",
  style,
}: {
  size?: number;
  mark?: string;
  accent?: string;
  style?: CSSProperties;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" style={{ display: "block", ...style }}>
      {STEPS.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={b.r} fill={b.accent ? accent : mark} />
      ))}
    </svg>
  );
}

/** App icon — charcoal squircle with the mark centred (the "shoji" skin). */
export function ShojinIcon({
  size = 72,
  radius,
  shadow = true,
  style,
}: {
  size?: number;
  radius?: number;
  shadow?: boolean;
  style?: CSSProperties;
}) {
  const r = radius ?? Math.round(size * 0.2237);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background: "#2B2725",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: shadow ? "0 12px 34px rgba(13,28,20,0.34)" : "none",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(155deg, rgba(255,255,255,0.09), rgba(255,255,255,0) 46%)",
        }}
      />
      <div style={{ position: "absolute", inset: 0, borderRadius: r, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)" }} />
      <ShojinMark size={Math.round(size * 0.66)} mark="#F5F1EA" accent="#C0392B" />
    </div>
  );
}

/** Stylised lowercase wordmark "shōjin" with an accent dot. */
export function ShojinWordmark({
  size = 32,
  color = "currentColor",
  accent = "var(--color-amber)",
  dot = true,
}: {
  size?: number;
  color?: string;
  accent?: string;
  dot?: boolean;
}) {
  return (
    <span
      style={{
        fontWeight: 800,
        fontSize: size,
        letterSpacing: "-0.045em",
        color,
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "baseline",
      }}
    >
      shōjin
      {dot && <span style={{ color: accent, marginLeft: "0.02em" }}>.</span>}
    </span>
  );
}
