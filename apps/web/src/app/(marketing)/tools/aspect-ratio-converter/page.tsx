import type { Metadata } from "next";
import { AspectRatioConverter } from "./aspect-ratio-converter";
import { pageMetadata } from "@/lib/seo";
import { ToolJsonLd } from "@/components/seo/json-ld";
import { RelatedTools } from "@/components/tools/related-tools";

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

const FAQS = [
  { q: "What aspect ratios can I convert my video to?", a: "You can convert to 16:9 (YouTube/landscape), 9:16 (TikTok/Reels/Shorts), 1:1 (square/Instagram), 4:5 (portrait), 21:9 (cinematic), 4:3 (classic), or any custom ratio you type in." },
  { q: "What happens to the parts of the video that don't fit the new ratio?", a: "You choose: Crop (cuts off the edges), Pad (adds black/coloured bars), or Stretch (distorts to fill). Crop and Pad are the most common choices." },
  { q: "Is my video uploaded anywhere?", a: "No. Everything runs in your browser using WebAssembly. Your video file never leaves your device." },
  { q: "Can I change the colour of the padding bars?", a: "Yes. When using Pad mode you can pick any custom colour for the letterbox/pillarbox bars using the colour picker." },
  { q: "Which formats does the Aspect Ratio Converter support?", a: "It supports MP4, MOV, AVI, MKV, WebM, FLV, TS, 3GP, WMV, M4V and more." },
];

export default function AspectRatioConverterPage() {
  return (
    <>
      <ToolJsonLd
        name="Free Aspect Ratio Converter"
        description="Resize any video to 16:9, 9:16, 1:1, 4:5 and more — crop, pad or stretch — free, in your browser."
        path="/tools/aspect-ratio-converter"
        faqs={FAQS}
      />
      <AspectRatioConverter />
      <div className="mx-auto max-w-6xl px-4 pb-16">
        <RelatedTools current="aspect-ratio-converter" />
      </div>
    </>
  );
}
