import type { Metadata } from "next";
import { VideoCompressor } from "./video-compressor";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Free Video Compressor — Reduce Video File Size Online",
  description:
    "Compress any video without losing quality. Choose H.264, H.265 or VP9. Target file size, CRF quality or bitrate mode. Supports MP4, MOV, AVI, MKV, WebM, FLV. Free, no upload.",
  path: "/tools/video-compressor",
  keywords: [
    "video compressor", "compress video online", "reduce video size", "video size reducer",
    "h264 compressor", "h265 compressor", "free video compressor", "mp4 compressor",
    "video bitrate reducer", "browser video compressor",
  ],
});

export default function VideoCompressorPage() {
  return <VideoCompressor />;
}
