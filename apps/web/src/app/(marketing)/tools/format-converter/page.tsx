import type { Metadata } from "next";
import { FormatConverter } from "./format-converter";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Free Video Format Converter — MP4, WebM, MOV & More",
  description:
    "Convert videos between any format instantly in your browser. MP4, WebM, MOV, AVI, MKV, GIF, M4A and more. No upload, 100% private, powered by FFmpeg.",
  path: "/tools/format-converter",
  keywords: [
    "video format converter", "convert video online", "mp4 to webm", "mov to mp4",
    "avi to mp4", "mkv converter", "free video converter", "browser video converter",
    "ffmpeg online", "no upload video converter",
  ],
});

export default function FormatConverterPage() {
  return <FormatConverter />;
}
