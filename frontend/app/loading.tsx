import { Skeleton } from "@/components/ui/skeleton";

export default function GlobalLoading() {
  return (
    <div className="grid gap-6">
      <div className="glass-panel rounded-[28px] p-6 md:p-8">
        <Skeleton className="h-4 w-32 bg-white/10" />
        <Skeleton className="mt-4 h-12 w-3/4 bg-white/10" />
        <Skeleton className="mt-3 h-5 w-1/2 bg-white/10" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="glass-panel rounded-[24px] p-5">
            <Skeleton className="h-4 w-24 bg-white/10" />
            <Skeleton className="mt-4 h-8 w-20 bg-white/10" />
            <Skeleton className="mt-6 h-24 w-full bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
