import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/og";
import "./globals.css";

const description =
  "Free school games to play with friends in the browser. Race to the canteen and dodge prefects in Breaktime Battle, or live a whole Nigerian school life in Student Life.";

export const metadata: Metadata = {
  // Lets shared links find the preview image (opengraph-image.tsx) at a full web address.
  metadataBase: new URL(SITE_URL),
  title: "School Breaktime Battle",
  description,
  openGraph: { title: "School Breaktime Battle", description, type: "website", siteName: "School Breaktime Battle" },
  twitter: { card: "summary_large_image", title: "School Breaktime Battle", description },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1e3a8a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-school min-h-dvh antialiased">{children}</body>
    </html>
  );
}
