import { ImageResponse } from "next/og";

/** 48×48 PNG — Google Search favicons prefer raster icons over SVG. */
export const size = { width: 48, height: 48 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #064e3b 0%, #047857 45%, #059669 100%)",
          borderRadius: 10,
        }}
      >
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <g
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="2.75" />
            <circle cx="21" cy="21" r="2.75" />
            <path d="M13.4 13.4l5.2 5.2" />
            <path d="M8.25 11h5.5" />
            <path d="M18.25 21h5.5" />
          </g>
        </svg>
      </div>
    ),
    { ...size },
  );
}
