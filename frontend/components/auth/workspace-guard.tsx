"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";

export function WorkspaceGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { session, loading } = useAuth();
  const nextPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  useEffect(() => {
    if (!loading && !session) {
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      router.refresh();
    }
  }, [loading, nextPath, router, session]);

  if (loading || !session) {
    return (
      <div className="marketing-shell grid min-h-screen place-items-center px-6">
        <div className="marketing-card w-full max-w-md rounded-[32px] p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-orange-100 bg-orange-50 text-orange-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <p className="font-display mt-6 text-2xl text-slate-950">Loading workspace</p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Preparing your recruiter workspace.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
