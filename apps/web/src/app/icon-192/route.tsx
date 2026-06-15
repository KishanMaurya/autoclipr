import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brand-mark";

export const runtime = "edge";

/** 192×192 PNG for Google / PWA manifest (multiples of 48px). */
export async function GET() {
  return new ImageResponse(<BrandMark size={192} radius={40} />, {
    width: 192,
    height: 192,
  });
}
