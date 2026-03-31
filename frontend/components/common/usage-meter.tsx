"use client";

import { motion } from "framer-motion";

interface UsageMeterProps {
  label: string;
  used: number;
  total: number;
}

export function UsageMeter({ label, used, total }: UsageMeterProps) {
  const percent = total <= 0 ? 0 : Math.min(100, (used / total) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>{label}</span>
        <span>
          {used} / {total}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.75, ease: "easeOut" }}
          className="h-full rounded-full bg-[linear-gradient(90deg,#f97316,#fb923c)]"
        />
      </div>
    </div>
  );
}
