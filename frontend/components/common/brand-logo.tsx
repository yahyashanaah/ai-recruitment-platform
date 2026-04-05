import Image from "next/image";

import { cn } from "@/lib/utils";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}

const sizeMap: Record<
  NonNullable<BrandLogoProps["size"]>,
  { container: string; image: string }
> = {
  sm: {
    container: "rounded-[18px] px-2.5 py-2",
    image: "w-[124px] sm:w-[138px]",
  },
  md: {
    container: "rounded-[20px] px-3 py-2.5",
    image: "w-[152px] sm:w-[170px]",
  },
  lg: {
    container: "rounded-[24px] px-4 py-3",
    image: "w-[198px] sm:w-[228px]",
  },
};

export function BrandLogo({
  size = "md",
  className,
  imageClassName,
  priority = false,
}: BrandLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center bg-[#1e0d02] shadow-[0_14px_32px_rgba(30,13,2,0.18)] ring-1 ring-black/5",
        sizeMap[size].container,
        className,
      )}
    >
      <Image
        src="/Logo-07.svg"
        alt="AI Recruiter logo"
        width={1956}
        height={768}
        priority={priority}
        className={cn("h-auto", sizeMap[size].image, imageClassName)}
      />
    </span>
  );
}
