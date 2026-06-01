import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IronLog",
  description: "Track lifts, templates, and progress.",
  appleWebApp: {
    capable: true,
    title: "IronLog",
    statusBarStyle: "black",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
