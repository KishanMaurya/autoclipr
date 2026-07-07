import type { Metadata } from "next";
import { CaptionGenerator } from "./caption-generator";
import { pageMetadata } from "@/lib/seo";
import { ToolJsonLd } from "@/components/seo/json-ld";
import { RelatedTools } from "@/components/tools/related-tools";

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

const FAQS = [
  { q: "How does the automatic caption generation work?", a: "The tool uses your browser's built-in Web Speech API to transcribe audio in real-time. The video audio is extracted and streamed through the speech recognition engine to generate timestamped captions." },
  { q: "What languages are supported?", a: "12 languages including English, Spanish, French, German, Portuguese, Italian, Japanese, Korean, Chinese, Hindi, Arabic, and Russian." },
  { q: "What caption formats can I export?", a: "You can export as SRT (SubRip, works in most video players and editors), VTT (WebVTT, for web players), or plain TXT." },
  { q: "Is my video uploaded anywhere?", a: "No. Audio extraction and transcription both run locally in your browser. Nothing is sent to a server." },
  { q: "Can I edit the captions after they're generated?", a: "Yes. Each caption line is editable inline. You can correct any transcript errors before exporting." },
];

export default function CaptionGeneratorPage() {
  return (
    <>
      <ToolJsonLd
        name="Free AI Caption Generator"
        description="Auto-generate SRT, VTT and TXT captions for any video using AI speech recognition — free, in your browser."
        path="/tools/caption-generator"
        faqs={FAQS}
      />
      <CaptionGenerator />
      <div className="mx-auto max-w-6xl px-4 pb-16">
        <RelatedTools current="caption-generator" />
      </div>
    </>
  );
}
