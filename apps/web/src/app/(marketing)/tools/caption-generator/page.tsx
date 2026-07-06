import type { Metadata } from "next";
import { CaptionGenerator } from "./caption-generator";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Free AI Caption Generator — Auto-Transcribe Any Video",
  description:
    "Generate captions and subtitles from any video automatically using AI speech recognition. Export as SRT, VTT, or TXT. Supports MP4, MOV, AVI, MKV, WebM. Free, no upload.",
  path: "/tools/caption-generator",
  keywords: [
    "caption generator", "auto caption video", "ai subtitles", "video transcription",
    "srt generator", "vtt captions", "subtitle maker", "free caption generator",
    "speech to text video", "auto subtitle generator",
  ],
});

export default function CaptionGeneratorPage() {
  return <CaptionGenerator />;
}
