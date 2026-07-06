import type { Metadata } from "next";
import { VideoMetadataViewer } from "./video-metadata";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Free Video Metadata Viewer — Inspect Codec, Bitrate & FPS",
  description:
    "Inspect every technical detail of any video or audio file — codec, resolution, bitrate, FPS, audio streams, tags and more. Supports MP4, MOV, AVI, MKV, WebM, FLV, MP3, WAV, FLAC. Free, no upload.",
  path: "/tools/video-metadata",
  keywords: [
    "video metadata viewer", "video codec info", "check video bitrate",
    "video file info", "ffprobe online", "video details viewer",
    "audio metadata viewer", "free metadata viewer", "inspect video file", "video fps checker",
  ],
});

export default function VideoMetadataPage() {
  return <VideoMetadataViewer />;
}
