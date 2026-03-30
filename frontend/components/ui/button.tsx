"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 outline-none active:scale-[0.98] [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,rgba(108,99,255,0.95),rgba(80,72,255,0.88))] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_0_32px_rgba(108,99,255,0.26)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_0_40px_rgba(108,99,255,0.34)]",
        secondary:
          "border border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.09] hover:shadow-[0_0_28px_rgba(255,255,255,0.06)]",
        ghost: "text-white/70 hover:bg-white/[0.06] hover:text-white",
        outline:
          "border border-white/10 bg-transparent text-white/88 hover:border-primary/45 hover:bg-primary/10 hover:text-white",
        destructive:
          "bg-[linear-gradient(135deg,rgba(239,68,68,0.94),rgba(220,38,38,0.86))] text-white shadow-[0_0_24px_rgba(239,68,68,0.22)] hover:shadow-[0_0_34px_rgba(239,68,68,0.28)]"
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-xl px-3 text-xs",
        lg: "h-12 rounded-2xl px-6 text-sm",
        icon: "h-11 w-11"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
