import type { Metadata } from "next";
import { VideoSlicer } from "./video-slicer";

export const metadata: Metadata = {
  title: "Free Video Slicer — Cut Any Video Online | AutoClipr",
  description:
    "Trim and cut videos online for free. Supports MP4, MOV, AVI, MKV, WebM, and all popular formats. No upload, runs entirely in your browser.",
};

export default function VideoSlicerPage() {
  return <VideoSlicer />;
}
