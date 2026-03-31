import { Skeleton } from "@/components/ui/skeleton";

export default function GlobalLoading() {
  return (
    <div className="grid gap-6">
      <div className="marketing-card rounded-[28px] p-6 md:p-8">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-12 w-3/4" />
        <Skeleton className="mt-3 h-5 w-1/2" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="marketing-card rounded-[24px] p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-8 w-20" />
            <Skeleton className="mt-6 h-24 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
