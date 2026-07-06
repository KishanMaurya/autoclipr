import type { Metadata } from "next";
import { ThumbnailExtractor } from "./thumbnail-extractor";
import { pageMetadata } from "@/lib/seo";

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

export default function ThumbnailExtractorPage() {
  return <ThumbnailExtractor />;
}
