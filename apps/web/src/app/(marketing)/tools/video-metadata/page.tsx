import type { Metadata } from "next";
import { VideoMetadataViewer } from "./video-metadata";

export const metadata: Metadata = {
  title: "Free Video Metadata Viewer — Inspect Codec, Bitrate, FPS | AutoClipr",
  description:
    "Inspect every technical detail of any video or audio file — codec, resolution, bitrate, FPS, audio streams, tags and more. Supports MP4, MOV, AVI, MKV, WebM, FLV, MP3, WAV, FLAC. Free, no upload.",
};

export default function VideoMetadataPage() {
  return <VideoMetadataViewer />;
}
