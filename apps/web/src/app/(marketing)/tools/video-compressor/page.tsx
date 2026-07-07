import type { Metadata } from "next";
import { VideoCompressor } from "./video-compressor";
import { pageMetadata } from "@/lib/seo";
import { ToolJsonLd } from "@/components/seo/json-ld";
import { RelatedTools } from "@/components/tools/related-tools";

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

const FAQS = [
  { q: "Which video codecs are supported for compression?", a: "H.264 (most compatible, fast), H.265/HEVC (50% smaller than H.264, slower), and VP9 (open-source, great for web). H.264 is recommended for general use." },
  { q: "What compression modes are available?", a: "Three modes: Quality (CRF) lets you set a quality target and the size adjusts automatically; File Size lets you specify a target MB and the tool calculates the right bitrate; Bitrate lets you set a specific kbps." },
  { q: "Will compressing reduce my video quality?", a: "A small amount of quality loss is unavoidable with compression. CRF 22–26 for H.264 is visually lossless for most content. CRF 28–32 gives significant size reduction with minor visible quality loss." },
  { q: "Is my video uploaded to a server?", a: "No. The entire compression runs in your browser using WebAssembly (FFmpeg). Your file never touches any server." },
  { q: "What formats can I output to?", a: "MP4 (H.264 or H.265) and WebM (VP9). The output container is determined by the codec you choose." },
];

export default function VideoCompressorPage() {
  return (
    <>
      <ToolJsonLd
        name="Free Video Compressor"
        description="Compress any video with H.264, H.265 or VP9 — target file size, quality or bitrate — free, in your browser."
        path="/tools/video-compressor"
        faqs={FAQS}
      />
      <VideoCompressor />
      <div className="mx-auto max-w-6xl px-4 pb-16">
        <RelatedTools current="video-compressor" />
      </div>
    </>
  );
}
