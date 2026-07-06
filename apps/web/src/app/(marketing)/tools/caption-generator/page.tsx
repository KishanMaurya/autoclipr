import type { Metadata } from "next";
import { CaptionGenerator } from "./caption-generator";

export const metadata: Metadata = {
  title: "Free AI Caption Generator — Auto-Transcribe Any Video | AutoClipr",
  description:
    "Generate captions and subtitles from any video automatically. Export as SRT, VTT, or TXT. Supports MP4, MOV, AVI, MKV, WebM and more. Free, no upload.",
};

export default function CaptionGeneratorPage() {
  return <CaptionGenerator />;
}
