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
          "bg-[linear-gradient(135deg,#f97316,#fb923c)] text-white shadow-[0_14px_28px_rgba(249,115,22,0.22)] hover:shadow-[0_18px_34px_rgba(249,115,22,0.28)]",
        secondary:
          "border border-slate-200 bg-white text-slate-800 shadow-[0_8px_20px_rgba(15,23,42,0.05)] hover:bg-orange-50 hover:border-orange-200",
        ghost: "text-slate-600 hover:bg-orange-50 hover:text-slate-950",
        outline:
          "border border-slate-200 bg-transparent text-slate-700 hover:border-orange-200 hover:bg-orange-50 hover:text-slate-950",
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
