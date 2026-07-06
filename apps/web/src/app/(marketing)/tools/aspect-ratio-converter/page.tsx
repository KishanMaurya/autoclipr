import type { Metadata } from "next";
import { AspectRatioConverter } from "./aspect-ratio-converter";

export const metadata: Metadata = {
  title: "Free Aspect Ratio Converter — Resize Any Video Online | AutoClipr",
  description:
    "Convert any video to 16:9, 9:16, 1:1, 4:5 and more. Crop, pad or stretch to fit YouTube, TikTok, Instagram Reels and any platform. Supports MP4, MOV, AVI, MKV, WebM. Free, no upload.",
};

export default function AspectRatioConverterPage() {
  return <AspectRatioConverter />;
}
