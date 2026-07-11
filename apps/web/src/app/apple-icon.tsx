import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="https://autoclipr.com/assets/brand/logo.png"
        width={180}
        height={180}
        alt="AutoClipr"
        style={{ borderRadius: 36 }}
      />
    ),
    { ...size },
  );
}
