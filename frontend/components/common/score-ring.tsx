"use client";

import { motion } from "framer-motion";

import { formatPercent } from "@/lib/utils";

interface ScoreRingProps {
  value: number;
  label?: string;
  size?: number;
}

export function ScoreRing({ value, label = "Match", size = 88 }: ScoreRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#scoreRingGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          strokeDasharray={circumference}
        />
        <defs>
          <linearGradient id="scoreRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6C63FF" />
            <stop offset="100%" stopColor="#00D4AA" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-lg font-semibold text-white">{formatPercent(clamped)}</span>
        <span className="text-[10px] uppercase tracking-[0.25em] text-white/38">{label}</span>
      </div>
    </div>
  );
}
