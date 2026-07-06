import type { Metadata } from "next";
import { CaptionTemplates } from "./caption-templates";
import { pageMetadata } from "@/lib/seo";

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

export default function CaptionTemplatesPage() {
  return <CaptionTemplates />;
}
