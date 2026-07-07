import type { Metadata } from "next";
import { VideoMetadataViewer } from "./video-metadata";
import { pageMetadata } from "@/lib/seo";
import { ToolJsonLd } from "@/components/seo/json-ld";
import { RelatedTools } from "@/components/tools/related-tools";

export const metadata: Metadata = pageMetadata({
  title: "Free Video Metadata Viewer — Inspect Codec, Bitrate & FPS",
  description:
    "Inspect every technical detail of any video or audio file — codec, resolution, bitrate, FPS, audio streams, tags and more. Supports MP4, MOV, AVI, MKV, WebM, FLV, MP3, WAV, FLAC. Free, no upload.",
  path: "/tools/video-metadata",
  keywords: [
    "video metadata viewer", "video codec info", "check video bitrate",
    "video file info", "ffprobe online", "video details viewer",
    "audio metadata viewer", "free metadata viewer", "inspect video file", "video fps checker",
  ],
});

const FAQS = [
  { q: "What information does the Video Metadata Viewer show?", a: "It shows the container format, duration, total bitrate, all video streams (codec, resolution, FPS, colour space, bitrate), all audio streams (codec, sample rate, channels, bitrate), subtitle streams, and embedded tags (title, artist, date, etc.)." },
  { q: "Does it support audio-only files?", a: "Yes. It supports MP3, WAV, FLAC, AAC, OGG, Opus, M4A, AIFF and other audio formats in addition to video files." },
  { q: "Is my file uploaded anywhere?", a: "No. The tool runs FFmpeg locally in your browser via WebAssembly. Your file never leaves your device." },
  { q: "Can I export the metadata?", a: "Yes. You can copy all metadata as a formatted JSON object with one click, or view the raw FFmpeg log for full technical detail." },
  { q: "What video formats are supported?", a: "All formats FFmpeg supports: MP4, MOV, AVI, MKV, WebM, FLV, TS, MTS, WMV, 3GP, M4V, MP3, WAV, FLAC, and many more." },
];

export default function VideoMetadataPage() {
  return (
    <>
      <ToolJsonLd
        name="Free Video Metadata Viewer"
        description="Inspect codec, bitrate, FPS, resolution, audio streams and tags for any video or audio file — free, in your browser."
        path="/tools/video-metadata"
        faqs={FAQS}
      />
      <VideoMetadataViewer />
      <div className="mx-auto max-w-6xl px-4 pb-16">
        <RelatedTools current="video-metadata" />
      </div>
    </>
  );
}
