import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brand-mark";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #022c22 0%, #064e3b 40%, #047857 100%)",
          padding: 64,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 32,
          }}
        >
          <BrandMark size={80} radius={18} />
          <span style={{ fontSize: 72, fontWeight: 700, color: "#ffffff" }}>
            {SITE_NAME}
          </span>
        </div>
        <p
          style={{
            fontSize: 36,
            color: "#a7f3d0",
            textAlign: "center",
            maxWidth: 900,
            lineHeight: 1.3,
          }}
        >
          Turn long videos into viral shorts with AI captions
        </p>
      </div>
    ),
    { ...size },
  );
}
