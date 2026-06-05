import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shojin",
    short_name: "Shojin",
    description: "Log lifts, templates, and progress.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f1ea",
    theme_color: "#2b2725",
    orientation: "portrait",
    icons: [
      { src: "/icon", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
