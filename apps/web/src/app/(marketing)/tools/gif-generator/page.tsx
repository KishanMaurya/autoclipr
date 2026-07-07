import type { Metadata } from "next";
import { GifGenerator } from "./gif-generator";
import { pageMetadata } from "@/lib/seo";
import { ToolJsonLd } from "@/components/seo/json-ld";
import { RelatedTools } from "@/components/tools/related-tools";

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

const FAQS = [
  { q: "How do I make a high-quality GIF from a video?", a: "Upload your video, set the trim points, choose your FPS (10–15 is the sweet spot), set the width (480px recommended), and click Generate. The tool uses a 2-pass palette — first generating an optimised colour palette, then rendering the GIF — for far better quality than single-pass tools." },
  { q: "What is Boomerang mode?", a: "Boomerang plays the clip forward then backward in a seamless loop — like Instagram Boomerang. Great for reaction GIFs and social media content." },
  { q: "Why are GIFs so large?", a: "GIFs store each frame uncompressed with a 256-colour palette. Keep clips under 6 seconds, use 15 FPS or less, and choose 480px width for the best file-size-to-quality ratio." },
  { q: "Is my video uploaded anywhere?", a: "No. The GIF is generated entirely in your browser using WebAssembly (FFmpeg). Your file never leaves your device." },
  { q: "What video formats can I create GIFs from?", a: "Any format: MP4, MOV, AVI, MKV, WebM, FLV, TS, 3GP, WMV, M4V and more." },
];

export default function GifGeneratorPage() {
  return (
    <>
      <ToolJsonLd
        name="Free GIF Generator"
        description="Convert any video to a high-quality animated GIF — trim, loop, boomerang, 2-pass palette — free, in your browser."
        path="/tools/gif-generator"
        faqs={FAQS}
      />
      <GifGenerator />
      <div className="mx-auto max-w-6xl px-4 pb-16">
        <RelatedTools current="gif-generator" />
      </div>
    </>
  );
}
