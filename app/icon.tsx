import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

// Shojin "steps" mark on a charcoal field — scaled from the 120×120 design grid.
const STEPS = [
  { x: 21, y: 72, w: 31, h: 20, c: "#F5F1EA" },
  { x: 44.5, y: 50, w: 31, h: 20, c: "#F5F1EA" },
  { x: 68, y: 28, w: 31, h: 20, c: "#C0392B" },
];

export default function Icon() {
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
        <svg width="127" height="127" viewBox="0 0 120 120">
          {STEPS.map((b, i) => (
            <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={7} fill={b.c} />
          ))}
        </svg>
      </div>
    ),
    { ...size },
  );
}
