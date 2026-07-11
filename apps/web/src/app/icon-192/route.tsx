import { ImageResponse } from "next/og";

export const runtime = "edge";

/** 192×192 PNG for Google / PWA manifest (multiples of 48px). */
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#3CC252",
          borderRadius: 40,
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            marginLeft: 16,
            borderTop: "52px solid transparent",
            borderBottom: "52px solid transparent",
            borderLeft: "90px solid white",
          }}
        />
      </div>
    ),
    { width: 192, height: 192 },
  );
}
