import type { Metadata } from "next";
import { ThumbnailExtractor } from "./thumbnail-extractor";
import { pageMetadata } from "@/lib/seo";
import { ToolJsonLd } from "@/components/seo/json-ld";
import { RelatedTools } from "@/components/tools/related-tools";

export const metadata: Metadata = pageMetadata({
  title: "Free Thumbnail Extractor — Grab Any Frame from Any Video",
  description:
    "Extract any frame from any video as PNG, JPG or WebP. Scrub, snap, or auto-scan up to 60 frames at once. Supports MP4, MOV, AVI, MKV, WebM, FLV and all video formats. Free, no upload.",
  path: "/tools/thumbnail-extractor",
  keywords: [
    "thumbnail extractor", "video frame extractor", "grab video thumbnail",
    "screenshot from video", "video to image", "extract frame video",
    "free thumbnail extractor", "video frame capture", "png from video", "jpg from video",
  ],
});

const FAQS = [
  { q: "What image formats can I export frames to?", a: "PNG (lossless, best quality), JPG (smaller file, slight compression), and WebP (modern format, excellent compression with high quality)." },
  { q: "Can I extract multiple frames at once?", a: "Yes. The Auto Scan feature captures 2–60 evenly-spaced frames across the video automatically. You can then select any or all of them for bulk download." },
  { q: "Is my video uploaded anywhere?", a: "No. For native formats (MP4, WebM, MOV), frames are captured directly via the browser's canvas API with zero network activity. For other formats, FFmpeg runs locally in WebAssembly." },
  { q: "What is the maximum resolution of extracted frames?", a: "Frames are extracted at the video's native resolution. A 4K video will produce 4K (3840×2160) PNG frames." },
  { q: "What video formats are supported?", a: "All major formats: MP4, WebM, MOV (native browser capture), plus AVI, MKV, FLV, WMV, TS, MTS, 3GP, M4V via FFmpeg conversion." },
];

export default function ThumbnailExtractorPage() {
  return (
    <>
      <ToolJsonLd
        name="Free Thumbnail Extractor"
        description="Extract any frame from any video as PNG, JPG or WebP — scrub, snap or auto-scan — free, in your browser."
        path="/tools/thumbnail-extractor"
        faqs={FAQS}
      />
      <ThumbnailExtractor />
      <div className="mx-auto max-w-6xl px-4 pb-16">
        <RelatedTools current="thumbnail-extractor" />
      </div>
    </>
  );
}
