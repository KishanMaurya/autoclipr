import type { Metadata } from "next";
import { VideoCompressor } from "./video-compressor";

export const metadata: Metadata = {
  title: "Free Video Compressor — Reduce Video File Size Online | AutoClipr",
  description:
    "Compress any video without losing quality. H.264, H.265, VP9. Target file size, CRF quality or bitrate mode. Supports MP4, MOV, AVI, MKV, WebM, FLV and all video formats. Free, no upload.",
};

export default function VideoCompressorPage() {
  return <VideoCompressor />;
}
