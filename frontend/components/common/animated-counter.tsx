"use client";

import { useEffect, useMemo, useState } from "react";
import { animate } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  duration?: number;
}

export function AnimatedCounter({ value, suffix = "", duration = 1.2 }: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);
  const roundedValue = useMemo(() => Math.max(0, value), [value]);

  useEffect(() => {
    const controls = animate(0, roundedValue, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(latest)
    });
    return () => controls.stop();
  }, [duration, roundedValue]);

  return (
    <span>
      {Math.round(display)}
      {suffix}
    </span>
  );
}
