"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BotMessageSquare,
  BriefcaseBusiness,
  FileStack,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  UserCircle2,
  UsersRound,
  WandSparkles,
} from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { checkHealth } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

type HealthState = "loading" | "healthy" | "error";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/intake", label: "Document Intake", icon: FileStack },
  { href: "/candidates", label: "Candidates", icon: UsersRound },
  { href: "/chat", label: "AI Chat", icon: BotMessageSquare },
  { href: "/match", label: "JD Matching", icon: BriefcaseBusiness },
  { href: "/generate", label: "JD Generator", icon: WandSparkles },
  { href: "/settings", label: "Settings", icon: Settings },
];

const pathLabels: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Recruiter Workspace",
    subtitle:
      "Track hiring activity, candidate volume, and next actions from one focused view.",
  },
  "/intake": {
    title: "Document Intake",
    subtitle: "Upload resumes, process batches, and review file history.",
  },
  "/candidates": {
    title: "Candidates",
    subtitle: "Filter, review, and manage structured candidate profiles.",
  },
  "/chat": {
    title: "AI Chat",
    subtitle:
      "Ask recruiter questions and stream grounded answers from uploaded candidate documents.",
  },
  "/match": {
    title: "JD Matching",
    subtitle:
      "Parse job descriptions and compare the strongest candidate fits.",
  },
  "/generate": {
    title: "JD Generator",
    subtitle:
      "Create matching-ready job descriptions from a short hiring brief.",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Manage profile, usage, and workspace preferences.",
  },
};

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [health, setHealth] = useState<HealthState>("loading");
  const [signingOut, setSigningOut] = useState(false);
  const { recruiter, signOut } = useAuth();

  useEffect(() => {
    let cancelled = false;

    const runHealthCheck = async () => {
      try {
        const response = await checkHealth();
        if (!cancelled) {
          setHealth(response.status === "ok" ? "healthy" : "error");
        }
      } catch {
        if (!cancelled) {
          setHealth("error");
        }
      }
    };

    void runHealthCheck();
    const intervalId = window.setInterval(runHealthCheck, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const copy = useMemo(
    () =>
      pathLabels[pathname] ?? {
        title: "AI Recruiter Workspace",
        subtitle:
          "A focused recruiter workspace for intake, search, and matching.",
      },
    [pathname],
  );

  const handleSignOut = async () => {
    if (signingOut) {
      return;
    }

    setSigningOut(true);
    try {
      await signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffdf9_0%,#f7f3ec_100%)] px-3 py-3 text-slate-950 lg:px-4 lg:py-4">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1680px] gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="marketing-card hidden min-h-full rounded-[28px] p-5 xl:flex xl:flex-col">
          <Link
            href="/dashboard"
            className="mb-8 flex items-center gap-3 rounded-2xl px-1 py-2"
          >
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-[0_14px_28px_rgba(249,115,22,0.22)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold tracking-tight text-slate-950">
                AI Recruiter
              </p>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                Recruitment Intelligence
              </p>
            </div>
          </Link>

          <nav className="grid gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "text-slate-950"
                      : "text-slate-600 hover:text-slate-950",
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="workspace-nav"
                      className="absolute inset-0 rounded-2xl bg-orange-50"
                      transition={{ type: "spring", duration: 0.45 }}
                    />
                  )}
                  <Icon
                    className={cn(
                      "relative z-10 h-4 w-4",
                      isActive ? "text-orange-600" : "text-slate-400",
                    )}
                  />
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-[24px] border border-orange-100 bg-orange-50/70 p-4">
            <div className="flex items-center justify-between text-sm font-medium text-slate-700">
              <span>Workspace status</span>
              <Badge
                variant={
                  health === "healthy"
                    ? "success"
                    : health === "loading"
                      ? "outline"
                      : "warning"
                }
              >
                {health === "healthy"
                  ? "Healthy"
                  : health === "loading"
                    ? "Checking"
                    : "Issue"}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Your recruiter workspace is connected to the protected backend for
              uploads, chat, matching, and candidate management.
            </p>
          </div>
        </aside>

        <div className="flex min-h-full flex-col gap-3">
          <header className="marketing-card sticky top-3 z-40 rounded-[28px] px-4 py-4 lg:px-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    AI Recruiter
                  </p>
                  <h1 className="font-display text-2xl font-semibold text-slate-950">
                    {copy.title}
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">{copy.subtitle}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Badge
                    variant={
                      health === "healthy"
                        ? "success"
                        : health === "loading"
                          ? "outline"
                          : "warning"
                    }
                  >
                    {health === "healthy"
                      ? "Backend healthy"
                      : health === "loading"
                        ? "Checking backend"
                        : "Backend issue"}
                  </Badge>

                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                    <UserCircle2 className="h-8 w-8 text-orange-500" />
                    <div className="hidden sm:block">
                      <p className="font-medium text-slate-950">
                        {recruiter?.full_name ?? "Recruiter"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {recruiter?.email ?? "Authenticated workspace"}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Sign out"
                    disabled={signingOut}
                    onClick={() => {
                      void handleSignOut();
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 xl:hidden">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium",
                        isActive
                          ? "border-orange-200 bg-orange-50 text-orange-700"
                          : "border-slate-200 bg-white text-slate-600",
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </header>

          <main className="flex-1 pb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
