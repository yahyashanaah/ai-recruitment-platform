import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
  align?: "left" | "center";
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
  align = "left"
}: SectionHeadingProps) {
  return (
    <div className={cn(align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl", className)}>
      <span className="marketing-pill inline-flex rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]">
        {eyebrow}
      </span>
      <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
        {title}
      </h2>
      <p className="mt-5 text-base leading-8 text-slate-600 md:text-lg">{description}</p>
    </div>
  );
}
