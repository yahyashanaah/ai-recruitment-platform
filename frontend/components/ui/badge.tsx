import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary/30 bg-primary/16 text-primary-foreground",
        secondary: "border-white/8 bg-white/[0.05] text-white/74",
        outline: "border-white/10 bg-transparent text-white/70",
        success: "border-teal-400/20 bg-teal-400/12 text-teal-200",
        warning: "border-amber-400/20 bg-amber-400/12 text-amber-200",
        teal: "border-[#00D4AA]/20 bg-[#00D4AA]/12 text-[#8DF5DF]"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
