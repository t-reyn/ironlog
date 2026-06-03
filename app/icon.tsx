import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

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
          background: "#1a4d2e",
        }}
      >
        <span
          style={{
            fontFamily: "sans-serif",
            fontWeight: 800,
            fontSize: 96,
            color: "#ff9f29",
            letterSpacing: "-4px",
          }}
        >
          R
        </span>
      </div>
    ),
    { ...size },
  );
}
