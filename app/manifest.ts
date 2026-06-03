import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "REPPA",
    short_name: "REPPA",
    description: "Log lifts, templates, and progress.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf3e3",
    theme_color: "#1a4d2e",
    orientation: "portrait",
    icons: [
      { src: "/icon", sizes: "192x192", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
