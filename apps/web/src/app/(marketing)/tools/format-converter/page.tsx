import type { Metadata } from "next";
import { FormatConverter } from "./format-converter";
import { pageMetadata } from "@/lib/seo";
import { ToolJsonLd } from "@/components/seo/json-ld";
import { RelatedTools } from "@/components/tools/related-tools";

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

const FAQS = [
  { q: "Which video formats can I convert to and from?", a: "The converter supports MP4, WebM, MOV, AVI, MKV, FLV, TS, 3GP, WMV, M4V, and GIF as output formats, and accepts virtually any video file as input." },
  { q: "Does converting re-encode the video?", a: "Yes — format conversion re-encodes the video. For lossless trimming without re-encoding, use the Video Slicer tool instead." },
  { q: "Is my video uploaded anywhere?", a: "No. The entire conversion runs in your browser via WebAssembly (FFmpeg). Your file never touches our servers." },
  { q: "How long does conversion take?", a: "Conversion speed depends on your device's CPU. A typical 5-minute 1080p MP4 converts in 30–120 seconds on a modern laptop." },
  { q: "Can I convert audio files too?", a: "Yes. The Format Converter can extract and convert audio tracks. For more audio options (bitrate, normalize, fade), use the Audio Extractor tool." },
];

export default function FormatConverterPage() {
  return (
    <>
      <ToolJsonLd
        name="Free Video Format Converter"
        description="Convert any video between MP4, WebM, MOV, AVI, MKV, GIF and more — free, in your browser."
        path="/tools/format-converter"
        faqs={FAQS}
      />
      <FormatConverter />
      <div className="mx-auto max-w-6xl px-4 pb-16">
        <RelatedTools current="format-converter" />
      </div>
    </>
  );
}
