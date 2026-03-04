import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function GlobalLoading() {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="space-y-3">
          <Skeleton className="h-7 w-80" />
          <Skeleton className="h-4 w-2/3" />
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <Card key={item}>
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
