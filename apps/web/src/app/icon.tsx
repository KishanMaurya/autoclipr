import { ImageResponse } from "next/og";

/** 48×48 PNG favicon */
export const size = { width: 48, height: 48 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 48,
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#3CC252",
          borderRadius: 10,
        }}
      >
        {/* CSS triangle — play button, pure HTML/CSS for Satori */}
        <div
          style={{
            width: 0,
            height: 0,
            marginLeft: 4,
            borderTop: "13px solid transparent",
            borderBottom: "13px solid transparent",
            borderLeft: "22px solid white",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
