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
        <svg
          width="118"
          height="118"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <polygon
            points="24,14 24,86 86,50"
            fill="white"
            stroke="black"
            stroke-width="10"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    ),
    { width: 192, height: 192 },
  );
}
