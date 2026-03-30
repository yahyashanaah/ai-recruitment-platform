import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="glass-panel flex min-h-[220px] flex-col items-center justify-center rounded-[24px] px-6 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/70">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-display text-xl font-semibold text-white">{title}</h3>
      <p className="mt-3 max-w-md text-sm leading-6 text-white/52">{description}</p>
    </div>
  );
}
