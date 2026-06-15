/** Shared brand mark for favicons, OG images, and JSON-LD (ImageResponse / next/og). */

export const BRAND_GRADIENT =
  "linear-gradient(135deg, #064e3b 0%, #047857 45%, #059669 100%)";

type BrandMarkProps = {
  size: number;
  radius: number;
};

/** Lucide-style scissors on brand gradient — matches navbar / sidebar logo. */
export function BrandMark({ size, radius }: BrandMarkProps) {
  const iconSize = Math.round(size * 0.58);

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND_GRADIENT,
        borderRadius: radius,
      }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <line x1="20" y1="4" x2="8.12" y2="15.88" />
        <line x1="14.47" y1="14.48" x2="20" y2="20" />
        <line x1="8.12" y1="8.12" x2="12" y2="12" />
      </svg>
    </div>
  );
}
