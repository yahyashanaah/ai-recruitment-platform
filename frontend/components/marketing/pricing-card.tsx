import Link from "next/link";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

interface PricingCardProps {
  title: string;
  price: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  featured?: boolean;
}

export function PricingCard({
  title,
  price,
  description,
  features,
  ctaLabel,
  ctaHref,
  featured = false
}: PricingCardProps) {
  return (
    <div
      className={cn(
        "marketing-card flex h-full flex-col rounded-[28px] p-6 md:p-7",
        featured && "border-orange-200 shadow-[0_24px_50px_rgba(249,115,22,0.14)]"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-slate-950">{title}</p>
          <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p>
        </div>
        {featured ? (
          <span className="marketing-pill rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
            Most Popular
          </span>
        ) : null}
      </div>

      <div className="mt-8">
        <span className="text-4xl font-semibold tracking-tight text-slate-950">{price}</span>
      </div>

      <div className="mt-8 space-y-3">
        {features.map((feature) => (
          <div key={feature} className="flex items-start gap-3 text-sm text-slate-600">
            <div className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-orange-100 text-orange-600">
              <Check className="h-3.5 w-3.5" />
            </div>
            <span>{feature}</span>
          </div>
        ))}
      </div>

      <Link
        href={ctaHref}
        className={cn(
          "mt-8 inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium transition-all",
          featured ? "marketing-primary-btn" : "marketing-secondary-btn"
        )}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
