import { memo, type CSSProperties } from "react";
import type { MovementPattern } from "@/lib/types";
import { type IconKey, iconForExercise } from "@/lib/exerciseIcons";

// Line-art movement icons on a 48×48 grid — one drawing per movement pattern.
// Geometry ported verbatim from the design handoff (exercise-icons.jsx). Stroke
// and filled cues (plates / dumbbell blobs) both use `color`, which defaults to
// currentColor so a wrapping `style={{ color }}` tints the whole glyph.
interface Props {
  /** Exercise display name — resolved to a drawing via the built-in mapping. */
  name?: string | null;
  /** Movement pattern fallback when the name isn't in the mapping (custom exercises). */
  pattern?: MovementPattern | null;
  /** Bypass resolution and render a specific drawing. */
  icon?: IconKey;
  color?: string;
  size?: number;
  /** Stroke width — handoff passes ~2.3 at size 40. */
  sw?: number;
  className?: string;
  title?: string;
  style?: CSSProperties;
}

function glyphs(color: string, sw: number) {
  const p = {
    fill: "none",
    stroke: color,
    strokeWidth: sw,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const plate = (cx: number, cy: number, r = 2.7) => (
    <circle cx={cx} cy={cy} r={r} fill={color} stroke="none" />
  );
  const head = (cx: number, cy: number, r = 3) => <circle cx={cx} cy={cy} r={r} {...p} />;
  const db = (cx: number, cy: number, ang = 0, len = 4.5) => {
    const a = (ang * Math.PI) / 180,
      dx = Math.cos(a) * len,
      dy = Math.sin(a) * len;
    return (
      <>
        <line x1={cx - dx} y1={cy - dy} x2={cx + dx} y2={cy + dy} {...p} />
        <circle cx={cx - dx} cy={cy - dy} r={2.1} fill={color} stroke="none" />
        <circle cx={cx + dx} cy={cy + dy} r={2.1} fill={color} stroke="none" />
      </>
    );
  };
  const gnd = (x1 = 9, x2 = 39, y = 42.5) => (
    <line x1={x1} y1={y} x2={x2} y2={y} {...p} strokeWidth={sw * 0.8} />
  );

  const icons: Record<IconKey, React.ReactNode> = {
    // ── CHEST ──
    bench: (
      <>
        <line x1="12" y1="11" x2="30" y2="11" {...p} />
        {plate(12, 11, 3)}
        {plate(30, 11, 3)}
        <path d="M16 25 L16.5 12.5" {...p} />
        <path d="M21 25 L21.5 12.5" {...p} />
        {head(11.5, 24, 3)}
        <line x1="15" y1="25.5" x2="27" y2="25.5" {...p} />
        <path d="M27 25.5 L31 20.5 L33 25" {...p} />
        <line x1="11" y1="30" x2="31" y2="30" {...p} />
      </>
    ),
    inclineBench: (
      <>
        <line x1="15" y1="9" x2="33" y2="9" {...p} />
        {plate(15, 9, 2.8)}
        {plate(33, 9, 2.8)}
        <path d="M23 23 L23.5 10.5" {...p} />
        <path d="M27 23 L27 10.5" {...p} />
        <line x1="14" y1="37" x2="24" y2="37" {...p} />
        <path d="M24 37 L31 21" {...p} />
        {head(31, 18, 2.8)}
        <line x1="20" y1="28" x2="29" y2="24" {...p} />
      </>
    ),
    dbPress: (
      <>
        {db(17, 12, 0)}
        {db(24, 12, 0)}
        <path d="M17 24 L17 13.5" {...p} />
        <path d="M24 24 L24 13.5" {...p} />
        {head(11.5, 24, 3)}
        <line x1="15" y1="25.5" x2="27" y2="25.5" {...p} />
        <path d="M27 25.5 L31 20.5 L33 25" {...p} />
        <line x1="11" y1="30" x2="31" y2="30" {...p} />
      </>
    ),
    fly: (
      <>
        {head(24, 9, 3)}
        <line x1="24" y1="12" x2="24" y2="27" {...p} />
        <path d="M24 16 C18 15 14 13 11 11" {...p} />
        {plate(11, 11, 2.2)}
        <path d="M24 16 C30 15 34 13 37 11" {...p} />
        {plate(37, 11, 2.2)}
        <path d="M24 27 L19 40 M24 27 L29 40" {...p} />
      </>
    ),
    pushup: (
      <>
        {head(11, 25, 2.8)}
        <path d="M14 26 L33 31" {...p} />
        <path d="M17 27 L16 39 M31 31 L31 39" {...p} />
        <path d="M33 31 L37 34" {...p} />
        {gnd(12, 40, 39.5)}
      </>
    ),
    dip: (
      <>
        {head(22, 11, 3)}
        <path d="M22 14 L23 27" {...p} />
        <path d="M23 27 L20 33 L25 35" {...p} />
        <path d="M19 19 L13 27 M27 19 L33 27" {...p} />
        <line x1="11" y1="25" x2="16" y2="25" {...p} />
        <line x1="30" y1="25" x2="35" y2="25" {...p} />
      </>
    ),
    machinePress: (
      <>
        {head(20, 13, 3)}
        <path d="M20 16 L20 27" {...p} />
        <path d="M20 19 L30 21 M20 22 L30 24" {...p} />
        {plate(30, 21, 2.1)}
        {plate(30, 24, 2.1)}
        <line x1="14" y1="28" x2="22" y2="28" {...p} />
        <path d="M14 28 L14 35" {...p} />
        <path d="M34 12 L34 36" {...p} strokeWidth={sw * 0.85} />
        {gnd(11, 37, 36)}
      </>
    ),
    // ── BACK ──
    deadlift: (
      <>
        {head(17, 12, 3)}
        <path d="M19 14.5 L30 21" {...p} />
        <path d="M30 21 L27 31 L28.5 39" {...p} />
        <path d="M20 15.5 L20 34" {...p} />
        <circle cx="20" cy="35" r="6.5" {...p} />
        {plate(20, 35, 1.8)}
        {gnd(8, 34)}
      </>
    ),
    row: (
      <>
        {head(15, 13, 3)}
        <path d="M17 15 L29 20" {...p} />
        <path d="M29 20 L27 31 L28.5 39" {...p} />
        <path d="M20 17 L19 26" {...p} />
        <line x1="11" y1="27" x2="29" y2="27" {...p} />
        {plate(11, 27, 2.6)}
        {plate(29, 27, 2.6)}
        {gnd(8, 34)}
      </>
    ),
    pulldown: (
      <>
        <line x1="11" y1="9" x2="37" y2="9" {...p} />
        {plate(11, 9, 2.6)}
        {plate(37, 9, 2.6)}
        <path d="M16 9 L20 19 M32 9 L28 19" {...p} />
        {head(24, 18, 3)}
        <path d="M24 21 L24 31" {...p} />
        <path d="M24 31 L19 39 M24 31 L29 39" {...p} />
      </>
    ),
    pullup: (
      <>
        <line x1="10" y1="9" x2="38" y2="9" {...p} />
        <path d="M18 9 L20 18 M30 9 L28 18" {...p} />
        {head(24, 20, 3)}
        <path d="M24 23 L24 33" {...p} />
        <path d="M24 33 L20 41 M24 33 L28 41" {...p} />
      </>
    ),
    seatedRow: (
      <>
        {head(15, 16, 3)}
        <path d="M15 19 L15 28" {...p} />
        <path d="M16 22 L28 23" {...p} />
        {plate(29, 23, 2.2)}
        <path d="M15 28 L26 30 L26 35" {...p} />
        <path d="M33 12 L33 36" {...p} strokeWidth={sw * 0.85} />
        {gnd(11, 37, 36)}
      </>
    ),
    backExt: (
      <>
        {head(13, 16, 3)}
        <path d="M15 18 L27 26" {...p} />
        <path d="M22 23 L22 35" {...p} />
        <line x1="15" y1="30" x2="29" y2="30" {...p} />
        <path d="M20 30 L19 39 M26 30 L27 39" {...p} />
        {gnd(11, 37, 39.5)}
      </>
    ),
    // ── LEGS ──
    squat: (
      <>
        <line x1="10" y1="15.5" x2="38" y2="15.5" {...p} />
        {plate(10, 15.5, 3)}
        {plate(38, 15.5, 3)}
        {head(24, 9, 3.2)}
        <path d="M19 17.5 L13.5 15.5 M29 17.5 L34.5 15.5" {...p} />
        <line x1="24" y1="16.5" x2="24" y2="24" {...p} />
        <path d="M24 24 L16 27 L18 40" {...p} />
        <path d="M24 24 L32 27 L30 40" {...p} />
        {gnd(12, 36, 40.5)}
      </>
    ),
    frontSquat: (
      <>
        {head(24, 9, 3.2)}
        <line x1="14" y1="18" x2="34" y2="18" {...p} />
        {plate(14, 18, 2.6)}
        {plate(34, 18, 2.6)}
        <path d="M20 16 L21 18 M28 16 L27 18" {...p} />
        <line x1="24" y1="13" x2="24" y2="24" {...p} />
        <path d="M24 24 L16 27 L18 40" {...p} />
        <path d="M24 24 L32 27 L30 40" {...p} />
        {gnd(12, 36, 40.5)}
      </>
    ),
    lunge: (
      <>
        {head(22, 10, 3)}
        <path d="M22 13 L23 24" {...p} />
        <path d="M23 24 L15 30 L15 40" {...p} />
        <path d="M23 24 L31 31 L31 40" {...p} />
        <path d="M18 16 L18 25 M26 16 L26 25" {...p} strokeWidth={sw * 0.9} />
        {gnd(11, 37, 40.5)}
      </>
    ),
    legPress: (
      <>
        {head(11, 28, 3)}
        <line x1="14" y1="29" x2="24" y2="27" {...p} />
        <path d="M24 27 L31 21 L29 31" {...p} />
        <line x1="28" y1="16" x2="38" y2="14" {...p} />
        {plate(38, 14, 2.6)}
        <path d="M27 17 L31 24" {...p} strokeWidth={sw * 0.85} />
        {gnd(9, 26, 33)}
      </>
    ),
    legCurl: (
      <>
        {head(10, 27, 2.8)}
        <line x1="13" y1="28" x2="28" y2="28" {...p} />
        <path d="M28 28 L33 28 L33 18" {...p} />
        <circle cx="33" cy="16" r="2.4" fill={color} stroke="none" />
        <line x1="14" y1="31" x2="30" y2="31" {...p} />
        {gnd(11, 37, 35)}
      </>
    ),
    legExt: (
      <>
        {head(15, 16, 3)}
        <path d="M15 19 L15 28" {...p} />
        <line x1="15" y1="28" x2="25" y2="28" {...p} />
        <path d="M25 28 L33 22" {...p} />
        <circle cx="34" cy="21" r="2.4" fill={color} stroke="none" />
        <line x1="11" y1="33" x2="20" y2="33" {...p} />
        {gnd(11, 37, 36)}
      </>
    ),
    hipThrust: (
      <>
        <path d="M11 32 L18 22 L27 22 L33 33" {...p} />
        <line x1="14" y1="20" x2="31" y2="20" {...p} />
        {plate(14, 20, 2.6)}
        {plate(31, 20, 2.6)}
        <line x1="9" y1="32" x2="14" y2="32" {...p} />
        {gnd(9, 37, 35)}
      </>
    ),
    calfRaise: (
      <>
        {head(24, 10, 3)}
        <line x1="24" y1="13" x2="24" y2="29" {...p} />
        <path d="M24 29 L21 36 M24 29 L27 36" {...p} />
        <path d="M19 36 L21 33 M29 36 L27 33" {...p} />
        <path d="M18 17 L18 26 M30 17 L30 26" {...p} strokeWidth={sw * 0.9} />
        {gnd(12, 36, 36.5)}
      </>
    ),
    rdl: (
      <>
        {head(15, 13, 3)}
        <path d="M17 15 L28 21" {...p} />
        <path d="M28 21 L27 31 L28.5 39" {...p} />
        <path d="M21 17 L20 28" {...p} />
        <line x1="11" y1="29" x2="29" y2="29" {...p} />
        {plate(11, 29, 2.6)}
        {plate(29, 29, 2.6)}
        {gnd(8, 34)}
      </>
    ),
    hipAbd: (
      <>
        {head(24, 12, 3)}
        <path d="M24 15 L24 26" {...p} />
        <path d="M24 26 L15 31 L14 39" {...p} />
        <path d="M24 26 L33 31 L34 39" {...p} />
        <path d="M11 33 L15 31 M37 33 L33 31" {...p} strokeWidth={sw * 0.9} />
        {gnd(10, 38, 40.5)}
      </>
    ),
    // ── SHOULDERS ──
    ohp: (
      <>
        <line x1="14" y1="8" x2="34" y2="8" {...p} />
        {plate(14, 8, 2.8)}
        {plate(34, 8, 2.8)}
        {head(24, 14, 3)}
        <path d="M21 16 L20 9 M27 16 L28 9" {...p} />
        <line x1="24" y1="17" x2="24" y2="29" {...p} />
        <path d="M24 29 L20 40 M24 29 L28 40" {...p} />
      </>
    ),
    lateralRaise: (
      <>
        {head(24, 10, 3)}
        <line x1="24" y1="13" x2="24" y2="28" {...p} />
        <path d="M24 17 L13 16 M24 17 L35 16" {...p} />
        {db(11, 16, 90, 3)}
        {db(37, 16, 90, 3)}
        <path d="M24 28 L20 40 M24 28 L28 40" {...p} />
      </>
    ),
    frontRaise: (
      <>
        {head(24, 11, 3)}
        <line x1="24" y1="14" x2="24" y2="28" {...p} />
        <path d="M24 17 L14 11 M24 17 L34 11" {...p} />
        {db(12, 10, 30, 3)}
        {db(36, 10, -30, 3)}
        <path d="M24 28 L20 40 M24 28 L28 40" {...p} />
      </>
    ),
    facePull: (
      <>
        {head(26, 12, 3)}
        <path d="M26 15 L26 28" {...p} />
        <path d="M24 14 L14 11 M24 17 L14 14" {...p} />
        {plate(12, 12.5, 2.4)}
        <path d="M26 28 L22 40 M26 28 L30 40" {...p} />
      </>
    ),
    uprightRow: (
      <>
        {head(24, 9, 3)}
        <line x1="24" y1="12" x2="24" y2="28" {...p} />
        <path d="M24 19 L15 14 M24 19 L33 14" {...p} />
        <line x1="20" y1="20" x2="28" y2="20" {...p} />
        {plate(19, 20, 2.2)}
        {plate(29, 20, 2.2)}
        <path d="M24 28 L20 40 M24 28 L28 40" {...p} />
      </>
    ),
    // ── ARMS ──
    curl: (
      <>
        {head(24, 9, 3)}
        <line x1="24" y1="12" x2="24" y2="27" {...p} />
        <path d="M21 14 L20 21 L24 19 M27 14 L28 21 L24 19" {...p} />
        <line x1="18" y1="19" x2="30" y2="19" {...p} />
        {plate(18, 19, 2.4)}
        {plate(30, 19, 2.4)}
        <path d="M24 27 L20 40 M24 27 L28 40" {...p} />
      </>
    ),
    preacher: (
      <>
        {head(15, 13, 3)}
        <path d="M15 16 L17 25" {...p} />
        <path d="M17 22 L27 17 L24 24" {...p} />
        {plate(28, 16, 2.4)}
        <path d="M20 24 L31 28" {...p} />
        <path d="M31 28 L31 38" {...p} />
        {gnd(13, 35, 38.5)}
      </>
    ),
    pushdown: (
      <>
        {head(24, 10, 3)}
        <line x1="24" y1="13" x2="24" y2="28" {...p} />
        <path d="M22 15 L21 21 L23 27 M26 15 L27 21 L25 27" {...p} />
        <line x1="24" y1="6" x2="24" y2="20" {...p} strokeWidth={sw * 0.8} />
        <line x1="20" y1="26" x2="28" y2="26" {...p} />
        <path d="M24 28 L20 40 M24 28 L28 40" {...p} />
      </>
    ),
    tricepExt: (
      <>
        {head(24, 13, 3)}
        <line x1="24" y1="16" x2="24" y2="29" {...p} />
        <path d="M21 18 L20 10 L25 13 M27 18 L28 10 L23 13" {...p} />
        {db(22, 9, 0, 4)}
        <path d="M24 29 L20 40 M24 29 L28 40" {...p} />
      </>
    ),
    skullcrusher: (
      <>
        {head(11.5, 24, 3)}
        <line x1="15" y1="25.5" x2="27" y2="25.5" {...p} />
        <path d="M27 25.5 L31 20.5 L33 25" {...p} />
        <path d="M18 24 L20 16 M22 24 L21 16" {...p} />
        <line x1="16" y1="14" x2="26" y2="14" {...p} />
        {plate(16, 14, 2.4)}
        {plate(26, 14, 2.4)}
        <line x1="11" y1="30" x2="31" y2="30" {...p} />
      </>
    ),
    // ── CORE ──
    plank: (
      <>
        {head(11, 24, 2.8)}
        <path d="M14 25 L34 30" {...p} />
        <path d="M15 26 L15 33 L20 33" {...p} />
        <path d="M34 30 L37 33" {...p} />
        {gnd(12, 40, 33.5)}
      </>
    ),
    sidePlank: (
      <>
        {head(13, 16, 2.8)}
        <path d="M15 18 L33 33" {...p} />
        <path d="M16 19 L15 33" {...p} />
        <path d="M33 33 L37 33" {...p} />
        {gnd(12, 40, 33.5)}
      </>
    ),
    crunch: (
      <>
        <path d="M11 33 C14 27 18 25 22 25" {...p} />
        {head(24, 22, 3)}
        <path d="M22 31 L29 26 L33 33" {...p} />
        {gnd(9, 37, 33.5)}
      </>
    ),
    legRaise: (
      <>
        <line x1="11" y1="9" x2="37" y2="9" {...p} />
        {head(20, 17, 2.8)}
        <path d="M20 11 L20 14" {...p} />
        <path d="M20 20 L20 30" {...p} />
        <path d="M20 30 L31 30 L31 24" {...p} />
      </>
    ),
    abWheel: (
      <>
        {head(14, 17, 3)}
        <path d="M16 19 L22 27" {...p} />
        <path d="M16 20 L31 30" {...p} />
        <path d="M22 27 L20 36 L26 36" {...p} />
        <circle cx="33" cy="33" r="4" {...p} />
        {plate(33, 33, 1.3)}
        {gnd(11, 39, 37)}
      </>
    ),
    russianTwist: (
      <>
        {head(17, 14, 3)}
        <path d="M18 16 L24 26" {...p} />
        <path d="M24 26 L33 22 L31 31" {...p} />
        <path d="M19 19 L27 23" {...p} />
        {plate(28, 24, 2.4)}
        {gnd(11, 37, 33)}
      </>
    ),
    pallof: (
      <>
        {head(22, 10, 3)}
        <line x1="22" y1="13" x2="22" y2="28" {...p} />
        <path d="M22 17 L32 18" {...p} />
        <line x1="33" y1="16" x2="33" y2="20" {...p} />
        <path d="M22 17 L13 13" {...p} strokeWidth={sw * 0.8} />
        {plate(12, 12.5, 2.2)}
        <path d="M22 28 L18 40 M22 28 L26 40" {...p} />
      </>
    ),
  };

  return icons;
}

function ExerciseIconBase({
  name,
  pattern,
  icon,
  color = "currentColor",
  size = 40,
  sw = 2.3,
  className,
  title,
  style,
}: Props) {
  const key = icon ?? iconForExercise({ name, movement_pattern: pattern });
  // The icon is decorative wherever the exercise name is rendered next to it
  // (every current call site), so hide it from screen readers unless a caller
  // supplies an explicit `title` — otherwise AT would read internal keys.
  const a11y = title
    ? { role: "img" as const, "aria-label": title }
    : { "aria-hidden": true as const };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      {...a11y}
      className={className}
      style={{ display: "block", ...style }}
    >
      {glyphs(color, sw)[key]}
    </svg>
  );
}

// Props are primitives at every call site, so memo skips the (expensive) glyph
// rebuild on unrelated parent re-renders — e.g. the logger's per-second tick and
// the picker's per-keystroke filtering.
export const ExerciseIcon = memo(ExerciseIconBase);
