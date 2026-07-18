import Image from "next/image";

const LOGO_SRC = "/branding/cumberland-cup-logo.png";

type BrandLogoProps = {
  /** Display size in pixels (width & height). */
  size?: number;
  className?: string;
  priority?: boolean;
};

export function BrandLogo({
  size = 160,
  className = "",
  priority = false,
}: BrandLogoProps) {
  return (
    <Image
      src={LOGO_SRC}
      alt="The Cumberland Cup"
      width={size}
      height={size}
      priority={priority}
      className={["rounded-full bg-white object-contain", className]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
