import type { Metadata } from "next";
import { AudioExtractor } from "./audio-extractor";

export const metadata: Metadata = {
  title: "Free Audio Extractor — Extract Audio from Any Video | AutoClipr",
  description:
    "Extract audio from any video and convert to MP3, AAC, WAV, FLAC, OGG, Opus, M4A and more. Trim, normalize, fade. Supports MP4, MOV, AVI, MKV, WebM, FLV and all video formats. Free, no upload.",
};

export default function AudioExtractorPage() {
  return <AudioExtractor />;
}
