import type { Metadata } from "next";
import { GifGenerator } from "./gif-generator";

export const metadata: Metadata = {
  title: "Free GIF Generator — Convert Any Video to GIF | AutoClipr",
  description:
    "Turn any video into a high-quality animated GIF in your browser. Trim, resize, set FPS, loop, boomerang, reverse. Supports MP4, MOV, AVI, MKV, WebM and more. Free, no upload.",
};

export default function GifGeneratorPage() {
  return <GifGenerator />;
}
