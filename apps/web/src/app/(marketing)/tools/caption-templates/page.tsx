import type { Metadata } from "next";
import { CaptionTemplates } from "./caption-templates";
import { pageMetadata } from "@/lib/seo";
import { ToolJsonLd } from "@/components/seo/json-ld";
import { RelatedTools } from "@/components/tools/related-tools";

export const metadata: Metadata = pageMetadata({
  title: "Free Caption Templates — Burn Stylish Captions into Any Video",
  description:
    "Add stylish captions to any video with 8 templates — Bold, Neon, TikTok, Cinema, Karaoke and more. Import SRT, edit captions, burn permanently into MP4. Free, no upload.",
  path: "/tools/caption-templates",
  keywords: [
    "caption templates", "burn captions video", "styled subtitles", "tiktok captions",
    "neon captions", "karaoke captions", "srt burn video", "free caption burner",
    "hardcode subtitles", "caption video online",
  ],
});

const FAQS = [
  { q: "What caption templates are available?", a: "There are 8 templates: Bold, Minimal, Cinema (letterbox), Neon (glowing), Fire, TikTok (word-by-word highlight), Karaoke, and Classic Subtitle." },
  { q: "Can I import my own SRT file?", a: "Yes. You can upload an existing .srt file or paste SRT content directly. Captions can then be edited individually before burning." },
  { q: "Are the captions permanently burned into the video?", a: "Yes. The tool uses FFmpeg to hard-code (hardcode/burn) the captions into the video stream so they show on any player without a separate subtitle file." },
  { q: "Is my video uploaded anywhere?", a: "No. All processing happens in your browser using WebAssembly. Your video never leaves your device." },
  { q: "Can I customise the caption style?", a: "Yes. You can change text colour, outline colour, background opacity, and font size for each template." },
];

export default function CaptionTemplatesPage() {
  return (
    <>
      <ToolJsonLd
        name="Free Caption Templates"
        description="Burn Bold, Neon, TikTok, Karaoke and more caption styles permanently into any video — free, in your browser."
        path="/tools/caption-templates"
        faqs={FAQS}
      />
      <CaptionTemplates />
      <div className="mx-auto max-w-6xl px-4 pb-16">
        <RelatedTools current="caption-templates" />
      </div>
    </>
  );
}
