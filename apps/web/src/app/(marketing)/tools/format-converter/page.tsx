import type { Metadata } from "next";
import { FormatConverter } from "./format-converter";

export const metadata: Metadata = {
  title: "Free Video Format Converter — MP4, WebM, GIF, MOV & More | AutoClipr",
  description:
    "Convert videos between any format instantly in your browser. MP4, WebM, MOV, AVI, MKV, GIF, M4A and more. No upload, 100% private, powered by FFmpeg.",
};

export default function FormatConverterPage() {
  return <FormatConverter />;
}
