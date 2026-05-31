import type { MovementPattern } from "@/lib/types";

interface Props {
  pattern: MovementPattern;
  size?: number;
  className?: string;
  title?: string;
}

// Schematic stick figures, one per movement pattern. Lines use currentColor so
// the caller can tint by muscle group. viewBox is 0 0 64 64.
const POSES: Record<MovementPattern, React.ReactNode> = {
  squat: (
    <>
      <circle cx="32" cy="12" r="5" />
      <path d="M32 17 V32" />
      <path d="M20 22 H44" />
      <path d="M32 32 L24 42 L24 52" />
      <path d="M32 32 L40 42 L40 52" />
    </>
  ),
  hinge: (
    <>
      <circle cx="20" cy="16" r="5" />
      <path d="M24 18 L40 28" />
      <path d="M40 28 L36 50" />
      <path d="M40 28 L46 50" />
      <path d="M30 36 H50" />
    </>
  ),
  lunge: (
    <>
      <circle cx="30" cy="12" r="5" />
      <path d="M30 17 V34" />
      <path d="M30 34 L18 52" />
      <path d="M30 34 L44 44 L44 52" />
      <path d="M22 24 H38" />
    </>
  ),
  horizontal_press: (
    <>
      <circle cx="16" cy="40" r="5" />
      <path d="M21 40 H40" />
      <path d="M40 40 V28" />
      <path d="M40 40 V52" />
      <path d="M40 34 L54 34" />
      <circle cx="54" cy="34" r="4" />
    </>
  ),
  vertical_press: (
    <>
      <circle cx="32" cy="16" r="5" />
      <path d="M32 21 V44" />
      <path d="M32 26 L22 14" />
      <path d="M32 26 L42 14" />
      <path d="M18 12 H46" />
      <path d="M32 44 L26 56 M32 44 L38 56" />
    </>
  ),
  horizontal_pull: (
    <>
      <circle cx="20" cy="18" r="5" />
      <path d="M24 20 L40 30" />
      <path d="M40 30 L34 50 M40 30 L46 50" />
      <path d="M24 20 L12 26" />
      <path d="M12 26 H4" />
    </>
  ),
  vertical_pull: (
    <>
      <circle cx="32" cy="26" r="5" />
      <path d="M32 31 V48" />
      <path d="M32 32 L24 16 M32 32 L40 16" />
      <path d="M18 14 H46" />
      <path d="M32 48 L28 58 M32 48 L36 58" />
    </>
  ),
  curl: (
    <>
      <circle cx="32" cy="14" r="5" />
      <path d="M32 19 V42" />
      <path d="M32 26 L24 34 L30 24" />
      <path d="M32 26 L40 34 L34 24" />
      <path d="M32 42 L27 54 M32 42 L37 54" />
    </>
  ),
  triceps_extension: (
    <>
      <circle cx="32" cy="14" r="5" />
      <path d="M32 19 V42" />
      <path d="M32 24 L26 14 L30 26" />
      <path d="M32 24 L38 14 L34 26" />
      <path d="M32 42 L27 54 M32 42 L37 54" />
    </>
  ),
  core: (
    <>
      <circle cx="44" cy="40" r="5" />
      <path d="M40 40 H16" />
      <path d="M16 40 L22 30" />
      <path d="M40 40 L36 30" />
    </>
  ),
  calf: (
    <>
      <circle cx="32" cy="14" r="5" />
      <path d="M32 19 V40" />
      <path d="M22 24 H42" />
      <path d="M32 40 L28 54 M32 40 L36 54" />
      <path d="M24 54 H32 M32 54 H40" />
    </>
  ),
  other: (
    <>
      <circle cx="32" cy="14" r="5" />
      <path d="M32 19 V40" />
      <path d="M22 26 H42" />
      <path d="M32 40 L26 54 M32 40 L38 54" />
    </>
  ),
};

export function ExerciseFigure({ pattern, size = 40, className, title }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={title ?? `${pattern} figure`}
      className={className}
    >
      {POSES[pattern] ?? POSES.other}
    </svg>
  );
}
