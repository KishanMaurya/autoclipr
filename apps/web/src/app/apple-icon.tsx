import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#3CC252",
          borderRadius: 36,
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            marginLeft: 14,
            borderTop: "48px solid transparent",
            borderBottom: "48px solid transparent",
            borderLeft: "82px solid white",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
