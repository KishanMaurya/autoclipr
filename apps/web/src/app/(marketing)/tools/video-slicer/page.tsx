import type { Metadata } from "next";
import { VideoSlicer } from "./video-slicer";
import { pageMetadata } from "@/lib/seo";
import { ToolJsonLd } from "@/components/seo/json-ld";
import { RelatedTools } from "@/components/tools/related-tools";

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

const FAQS = [
  { q: "Does the Video Slicer upload my file to a server?", a: "No. All processing happens entirely in your browser using WebAssembly (FFmpeg). Your video never leaves your device." },
  { q: "What video formats does the Video Slicer support?", a: "It supports all major formats including MP4, MOV, AVI, MKV, WebM, FLV, TS, 3GP, WMV, and M4V." },
  { q: "Will cutting the video reduce its quality?", a: "No. The slicer uses stream-copy mode when possible, which cuts without re-encoding, preserving 100% of the original quality." },
  { q: "Is there a file size limit?", a: "There is no enforced file size limit — it depends on your device's available memory. Most modern computers handle files up to several GB." },
  { q: "Can I trim to exact milliseconds?", a: "Yes. You can set the start and end times to 0.1-second precision using the sliders or by typing exact timestamps." },
];

export default function VideoSlicerPage() {
  return (
    <>
      <ToolJsonLd
        name="Free Video Slicer"
        description="Trim and cut any video online, in your browser, for free. No upload required."
        path="/tools/video-slicer"
        faqs={FAQS}
      />
      <VideoSlicer />
      <div className="mx-auto max-w-6xl px-4 pb-16">
        <RelatedTools current="video-slicer" />
      </div>
    </>
  );
}
