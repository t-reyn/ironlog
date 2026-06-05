import { ImageResponse } from "next/og";

// Maskable PWA icon for Android adaptive icons: full-bleed charcoal field with
// the Shojin "steps" mark kept inside the central safe zone (~60%) so Android's
// circle/squircle mask never clips it.
export const dynamic = "force-static";

const STEPS = [
  { x: 21, y: 72, w: 31, h: 20, c: "#F5F1EA" },
  { x: 44.5, y: 50, w: 31, h: 20, c: "#F5F1EA" },
  { x: 68, y: 28, w: 31, h: 20, c: "#C0392B" },
];

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2B2725",
        }}
      >
        {/* 300px mark on a 512 canvas ≈ 59%, well within the maskable safe zone */}
        <svg width="300" height="300" viewBox="0 0 120 120">
          {STEPS.map((b, i) => (
            <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={7} fill={b.c} />
          ))}
        </svg>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
