import { cn } from "@/lib/utils";

interface SectionToolbarProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export function SectionToolbar({ left, right, className }: SectionToolbarProps) {
  return (
    <div className={cn("mt-6 flex flex-wrap items-center justify-between gap-3", className)}>
      {left ? <div className="flex flex-wrap items-center gap-3">{left}</div> : <div />}
      {right ? <div className="flex flex-wrap items-center gap-3">{right}</div> : null}
    </div>
  );
}
