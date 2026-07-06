import type { Metadata } from "next";
import { AudioExtractor } from "./audio-extractor";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Free Audio Extractor — Extract Audio from Any Video",
  description:
    "Extract audio from any video and save as MP3, AAC, WAV, FLAC, OGG, Opus or M4A. Trim, normalize, fade in/out. Supports MP4, MOV, AVI, MKV, WebM, FLV. Free, no upload.",
  path: "/tools/audio-extractor",
  keywords: [
    "audio extractor", "extract audio from video", "video to mp3", "video to wav",
    "mp4 to mp3", "extract audio online", "free audio extractor", "video to flac",
    "browser audio extractor", "no upload audio extractor",
  ],
});

export default function AudioExtractorPage() {
  return <AudioExtractor />;
}
