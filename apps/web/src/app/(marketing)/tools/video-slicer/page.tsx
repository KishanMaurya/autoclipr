import type { Metadata } from "next";
import { VideoSlicer } from "./video-slicer";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Free Video Slicer — Trim & Cut Any Video Online",
  description:
    "Trim and cut videos online for free. Precise frame-level cutting with no quality loss. Supports MP4, MOV, AVI, MKV, WebM and all popular formats. No upload, runs entirely in your browser.",
  path: "/tools/video-slicer",
  keywords: [
    "video slicer", "trim video online", "cut video free", "online video cutter",
    "mp4 trimmer", "video clip maker", "browser video editor", "no upload video slicer",
    "ffmpeg trim", "free video trimmer",
  ],
});

export default function VideoSlicerPage() {
  return <VideoSlicer />;
}
