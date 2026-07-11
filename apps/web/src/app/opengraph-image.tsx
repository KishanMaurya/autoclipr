import { ImageResponse } from "next/og";
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
            gap: 28,
            marginBottom: 36,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://autoclipr.com/assets/brand/logo.png"
            width={96}
            height={96}
            alt="AutoClipr"
            style={{ borderRadius: 20 }}
          />
          <span style={{ fontSize: 80, fontWeight: 700, color: "#ffffff", letterSpacing: "-2px" }}>
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
            margin: 0,
          }}
        >
          Turn long videos into viral shorts with AI captions
        </p>
      </div>
    ),
    { ...size },
  );
}
