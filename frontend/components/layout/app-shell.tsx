"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BotMessageSquare,
  BriefcaseBusiness,
  FileStack,
  LayoutDashboard,
  Search,
  Settings,
  Sparkles,
  UserCircle2,
  UsersRound,
  WandSparkles
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  { href: "/settings", label: "Settings", icon: Settings }
];

const pathLabels: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Recruiter Command Center",
    subtitle: "Monitor candidate intake, activity, and plan usage in one place."
  },
  "/intake": {
    title: "Document Intake",
    subtitle: "Upload, process, and track CV ingestion batches."
  },
  "/candidates": {
    title: "Candidate Management",
    subtitle: "Filter, review, and manage extracted candidate profiles."
  },
  "/chat": {
    title: "AI Chat With Candidates",
    subtitle: "Search the candidate knowledge base with streamed grounded answers."
  },
  "/match": {
    title: "JD Matching Engine",
    subtitle: "Parse job descriptions and rank the strongest candidate fits."
  },
  "/generate": {
    title: "Smart JD Generator",
    subtitle: "Turn a short hiring brief into a matching-optimized job description."
  },
  "/settings": {
    title: "Account And Plan Settings",
    subtitle: "Manage profile, plan usage, API keys, and workspace preferences."
  }
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
    const intervalId = window.setInterval(runHealthCheck, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const copy = useMemo(
    () =>
      pathLabels[pathname] ?? {
        title: "TalentCore AI Workspace",
        subtitle: "Enterprise recruitment intelligence platform."
      },
    [pathname]
  );

  return (
    <div className="relative min-h-screen overflow-hidden px-3 py-3 lg:px-4 lg:py-4">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1680px] gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="glass-panel hidden min-h-full rounded-[28px] p-5 xl:flex xl:flex-col">
          <Link href="/dashboard" className="mb-8 flex items-center gap-3 rounded-2xl px-1 py-2">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[radial-gradient(circle_at_top,rgba(108,99,255,0.7),rgba(108,99,255,0.2))] text-white shadow-[0_0_34px_rgba(108,99,255,0.32)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold tracking-tight text-white">TalentCore AI</p>
              <p className="text-xs uppercase tracking-[0.24em] text-white/45">Recruitment Intelligence</p>
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
                    "relative flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-3 text-sm transition-colors",
                    isActive ? "text-white" : "text-white/62 hover:text-white"
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="workspace-nav"
                      className="absolute inset-0 rounded-2xl bg-[linear-gradient(135deg,rgba(108,99,255,0.34),rgba(0,212,170,0.12))]"
                      transition={{ type: "spring", duration: 0.45 }}
                    />
                  )}
                  <Icon className="relative z-10 h-4 w-4" />
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-4 rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center justify-between text-sm text-white/78">
              <span>Growth Plan</span>
              <Badge variant="teal">Active</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-white/48">
                <span>Monthly usage</span>
                <span>72%</span>
              </div>
              <div className="h-2 rounded-full bg-white/6">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "72%" }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-[linear-gradient(90deg,#6C63FF,#00D4AA)]"
                />
              </div>
            </div>
            <p className="text-xs leading-relaxed text-white/52">
              AI chat, matching, and intake workflows are connected to your FastAPI backend.
            </p>
          </div>
        </aside>

        <div className="flex min-h-full flex-col gap-3">
          <header className="glass-panel sticky top-3 z-40 rounded-[28px] px-4 py-4 lg:px-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/35">TalentCore AI</p>
                  <h1 className="font-display text-2xl font-semibold text-white">{copy.title}</h1>
                  <p className="mt-1 text-sm text-white/52">{copy.subtitle}</p>
                </div>

                <div className="flex flex-1 items-center justify-end gap-3 max-lg:w-full max-lg:flex-wrap">
                  <div className="relative min-w-[220px] max-w-sm flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                    <Input
                      aria-label="Search workspace"
                      placeholder="Search candidates, files, or prompts"
                      className="pl-9"
                    />
                  </div>

                  <Badge variant={health === "healthy" ? "teal" : health === "loading" ? "outline" : "warning"}>
                    {health === "healthy" ? "Backend healthy" : health === "loading" ? "Checking backend" : "Backend issue"}
                  </Badge>

                  <button
                    type="button"
                    aria-label="Notifications"
                    className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/70 transition hover:text-white"
                  >
                    <Bell className="h-4 w-4" />
                  </button>

                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/78">
                    <UserCircle2 className="h-8 w-8 text-white/55" />
                    <div className="hidden sm:block">
                      <p className="font-medium text-white">Mariam Haddad</p>
                      <p className="text-xs text-white/45">Growth Workspace</p>
                    </div>
                  </div>
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
                        "whitespace-nowrap rounded-full border px-4 py-2 text-sm",
                        isActive
                          ? "border-primary/60 bg-primary/18 text-white"
                          : "border-white/10 bg-white/[0.03] text-white/60"
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
