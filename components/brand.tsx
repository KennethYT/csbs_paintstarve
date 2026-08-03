import Image from "next/image";

export const BRAND_NAME = "選課搶課系統";
export const BRAND_LOGO_SRC = "/school_logo-d04_6Mii.png";

export function BrandLogo({ size = 36, priority = false, className }: Readonly<{ size?: number; priority?: boolean; className?: string }>) {
  return (
    <Image
      src={BRAND_LOGO_SRC}
      alt="校徽"
      width={size}
      height={size}
      className={className}
      priority={priority}
      style={{ objectFit: "contain" }}
    />
  );
}
