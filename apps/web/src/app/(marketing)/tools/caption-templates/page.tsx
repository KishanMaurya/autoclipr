import type { Metadata } from "next";
import { CaptionTemplates } from "./caption-templates";

export const metadata: Metadata = {
  title: "Free Caption Templates — Burn Stylish Captions into Any Video | AutoClipr",
  description:
    "Add stylish captions to any video with 8 templates — Bold, Neon, TikTok, Cinema, Karaoke and more. Import SRT, edit captions, burn permanently into MP4. Free, no upload.",
};

export default function CaptionTemplatesPage() {
  return <CaptionTemplates />;
}
