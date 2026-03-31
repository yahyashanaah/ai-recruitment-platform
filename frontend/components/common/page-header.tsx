import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn("mt-2 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between", className)}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {eyebrow && <p className="text-xs uppercase tracking-[0.32em] text-slate-400">{eyebrow}</p>}
        <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">{title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">{description}</p>
      </motion.div>
      {action ? <div className="flex items-center gap-3">{action}</div> : null}
    </div>
  );
}
