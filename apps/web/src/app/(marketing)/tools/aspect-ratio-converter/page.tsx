import type { Metadata } from "next";
import { AspectRatioConverter } from "./aspect-ratio-converter";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Free Aspect Ratio Converter — Resize Any Video Online",
  description:
    "Convert any video to 16:9, 9:16, 1:1, 4:5 and more. Crop, pad or stretch to fit YouTube, TikTok, Instagram Reels and any platform. Supports MP4, MOV, AVI, MKV, WebM. Free, no upload.",
  path: "/tools/aspect-ratio-converter",
  keywords: [
    "aspect ratio converter", "resize video online", "9:16 video", "16:9 video",
    "square video", "TikTok video size", "Instagram Reels size", "YouTube Shorts format",
    "crop video online", "free video resizer",
  ],
});

export default function AspectRatioConverterPage() {
  return <AspectRatioConverter />;
}
