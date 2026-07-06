import type { Metadata } from "next";
import { GifGenerator } from "./gif-generator";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Free GIF Generator — Convert Any Video to Animated GIF",
  description:
    "Turn any video into a high-quality animated GIF in your browser. Trim, resize, set FPS, loop, boomerang, reverse. 2-pass palette for best colour quality. Supports MP4, MOV, AVI, MKV, WebM. Free, no upload.",
  path: "/tools/gif-generator",
  keywords: [
    "gif generator", "video to gif", "make gif from video", "free gif maker",
    "mp4 to gif", "animated gif creator", "browser gif generator",
    "gif from youtube", "loop gif", "boomerang gif maker",
  ],
});

export default function GifGeneratorPage() {
  return <GifGenerator />;
}
