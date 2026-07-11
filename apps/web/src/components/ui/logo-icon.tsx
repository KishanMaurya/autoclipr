import Image from "next/image";

type LogoIconProps = {
  size?: number;
  className?: string;
};

export function LogoIcon({ size = 32, className }: LogoIconProps) {
  return (
    <Image
      src="/assets/brand/logo.png"
      alt="AutoClipr logo"
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: "inherit" }}
      priority
    />
  );
}
