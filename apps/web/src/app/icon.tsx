import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brand-mark";

/** 48×48 PNG — Google Search favicons prefer raster icons (multiples of 48px). */
export const size = { width: 48, height: 48 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<BrandMark size={48} radius={10} />, { ...size });
}
