import type { Metadata } from "next";
import { ThumbnailExtractor } from "./thumbnail-extractor";

export const metadata: Metadata = {
  title: "Free Thumbnail Extractor — Grab Any Frame from Any Video | AutoClipr",
  description:
    "Extract any frame from any video as PNG, JPG or WebP. Scrub, snap, or auto-scan up to 60 frames at once. Supports MP4, MOV, AVI, MKV, WebM, FLV and all video formats. Free, no upload.",
};

export default function ThumbnailExtractorPage() {
  return <ThumbnailExtractor />;
}
