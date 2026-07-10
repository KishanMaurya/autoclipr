/** Shared brand mark for favicons, OG images, and JSON-LD (ImageResponse / next/og). */

export const BRAND_COLOR = "#3CC252";

type BrandMarkProps = {
  size: number;
  radius: number;
};

/** Play-button logo on bright green — matches navbar / sidebar logo. */
export function BrandMark({ size, radius }: BrandMarkProps) {
  const pad = Math.round(size * 0.18);
  const inner = size - pad * 2;

  // Play triangle points (within inner square)
  const ax = Math.round(pad + inner * 0.24);
  const ay = Math.round(pad + inner * 0.16);
  const bx = ax;
  const by = Math.round(pad + inner * 0.84);
  const cx = Math.round(pad + inner * 0.84);
  const cy = Math.round(pad + inner * 0.50);

  const sw = Math.round(size * 0.085);

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND_COLOR,
        borderRadius: radius,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon
          points={`${ax},${ay} ${bx},${by} ${cx},${cy}`}
          fill="white"
          stroke="black"
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
