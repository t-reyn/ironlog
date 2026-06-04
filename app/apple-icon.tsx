import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const STEPS = [
  { x: 21, y: 72, w: 31, h: 20, c: "#F5F1EA" },
  { x: 44.5, y: 50, w: 31, h: 20, c: "#F5F1EA" },
  { x: 68, y: 28, w: 31, h: 20, c: "#C0392B" },
];

export default function AppleIcon() {
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
        <svg width="119" height="119" viewBox="0 0 120 120">
          {STEPS.map((b, i) => (
            <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={7} fill={b.c} />
          ))}
        </svg>
      </div>
    ),
    { ...size },
  );
}
