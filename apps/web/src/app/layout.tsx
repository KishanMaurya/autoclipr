import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "AutoClipr — AI Video Clipping Platform",
    template: "%s | AutoClipr",
  },
  description:
    "Turn long videos into viral short clips with AI. Subtitles, exports, and credits — built for creators.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://autoclipr.ai"),
  applicationName: "AutoClipr",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans`}>{children}</body>
    </html>
  );
}
