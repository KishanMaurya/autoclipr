import type { Metadata } from "next";
import { AudioExtractor } from "./audio-extractor";
import { pageMetadata } from "@/lib/seo";
import { ToolJsonLd } from "@/components/seo/json-ld";
import { RelatedTools } from "@/components/tools/related-tools";

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

const FAQS = [
  { q: "What audio formats can I export to?", a: "You can export to MP3, AAC, M4A, OGG, Opus, WAV, FLAC, and AIFF. Each format has adjustable bitrate and sample rate options." },
  { q: "Is the audio extraction lossless?", a: "WAV and FLAC exports are lossless. MP3, AAC, OGG and Opus are lossy but you can choose high bitrates (up to 320 kbps) for near-transparent quality." },
  { q: "Does this upload my video to a server?", a: "No. All audio extraction happens locally in your browser using WebAssembly (FFmpeg). Your file never leaves your device." },
  { q: "Can I extract just a portion of the audio?", a: "Yes. Use the Trim controls to set a start and end time before extracting — only that section will be exported." },
  { q: "What video formats are supported?", a: "Any video format your browser can read is supported as input: MP4, MOV, AVI, MKV, WebM, FLV, TS, 3GP, WMV, M4V and more." },
];

export default function AudioExtractorPage() {
  return (
    <>
      <ToolJsonLd
        name="Free Audio Extractor"
        description="Extract audio from any video as MP3, WAV, FLAC, AAC and more — free, in your browser."
        path="/tools/audio-extractor"
        faqs={FAQS}
      />
      <AudioExtractor />
      <div className="mx-auto max-w-6xl px-4 pb-16">
        <RelatedTools current="audio-extractor" />
      </div>
    </>
  );
}
