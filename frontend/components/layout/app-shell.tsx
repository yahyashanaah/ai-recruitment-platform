"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BotMessageSquare,
  BriefcaseBusiness,
  Files,
  HeartPulse,
  House,
  Users
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { checkHealth } from "@/lib/api/client";

interface AppShellProps {
  children: React.ReactNode;
}

type HealthState = "loading" | "healthy" | "error";

const navItems = [
  { href: "/", label: "Overview", icon: House },
  { href: "/upload", label: "Document Intake", icon: Files },
  { href: "/chat", label: "Recruiter Chat", icon: BotMessageSquare },
  { href: "/match", label: "JD Matching", icon: BriefcaseBusiness },
  { href: "/candidates", label: "Candidates", icon: Users }
];

const pathLabels: Record<string, string> = {
  "/": "Recruitment Intelligence Overview",
  "/upload": "CV Upload and Indexing",
  "/chat": "Recruiter Copilot Chat",
  "/match": "Job Matching Insights",
  "/candidates": "Candidate Intelligence Hub"
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [health, setHealth] = useState<HealthState>("loading");

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

    runHealthCheck();
    const id = window.setInterval(runHealthCheck, 20000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const pageLabel = useMemo(() => pathLabels[pathname] ?? "AI Recruitment Dashboard", [pathname]);

  return (
    <div className="relative min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-[1700px]">
        <aside className="sticky top-0 hidden h-screen w-[92px] flex-col border-r border-border/80 bg-white/70 px-3 py-5 backdrop-blur lg:flex xl:w-72">
          <div className="mb-7 flex items-center gap-3 rounded-xl border border-border/60 bg-white p-3 shadow-sm">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <div className="hidden xl:block">
              <p className="text-sm font-semibold tracking-tight">Recruitment AI</p>
              <p className="text-xs text-muted-foreground">Enterprise Console</p>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-background"
                      className="absolute inset-0 rounded-xl bg-primary"
                      transition={{ type: "spring", duration: 0.5 }}
                    />
                  )}
                  <Icon className="relative z-10 h-4 w-4 shrink-0" />
                  <span className="relative z-10 hidden xl:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-xl border border-border/70 bg-gradient-to-br from-orange-50 to-white p-3">
            <p className="text-xs font-semibold text-orange-600">Design System</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Next.js 16 + Tailwind + Framer Motion + shadcn/ui
            </p>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border/70 bg-white/85 px-4 py-3 backdrop-blur lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary lg:hidden">
                  <BriefcaseBusiness className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-sm font-semibold tracking-tight lg:text-base">{pageLabel}</h1>
                  <p className="text-xs text-muted-foreground">Connected to FastAPI backend services</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-primary" />
                {health === "healthy" && <Badge variant="success">Backend Healthy</Badge>}
                {health === "loading" && <Badge variant="outline">Checking Health</Badge>}
                {health === "error" && <Badge variant="warning">Backend Unreachable</Badge>}
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 lg:px-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
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
