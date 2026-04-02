"use client";

import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

const highlights = [
  {
    icon: BriefcaseBusiness,
    title: "Candidate management",
    description:
      "Review structured profiles, shortlist faster, and keep recruiter work organized.",
  },
  {
    icon: MessageSquareText,
    title: "AI chat and matching",
    description:
      "Search candidate knowledge, compare job descriptions, and move to decisions faster.",
  },
  {
    icon: ShieldCheck,
    title: "Protected recruiter workspace",
    description:
      "Supabase authentication and recruiter-scoped access keep every workspace isolated.",
  },
];

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <div className="marketing-shell flex min-h-screen items-center px-6 py-10 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr,0.95fr] lg:items-center">
        <div className="hidden lg:block">
          <Link href="/" className="inline-flex items-center gap-3">
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

          <div className="mt-10 max-w-xl">
            <span className="marketing-pill inline-flex rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]">
              Recruiter access
            </span>
            <h1 className="font-display mt-6 text-5xl font-semibold tracking-tight text-slate-950">
              Enter a cleaner hiring workspace.
            </h1>
            <p className="mt-5 text-base leading-8 text-slate-600">
              Sign in to manage candidate intake, recruiter chat, and job
              matching in the same product surface as the new landing
              experience.
            </p>
          </div>

          <div className="mt-10 grid gap-4">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="marketing-card flex items-start gap-4 rounded-[26px] p-5"
                >
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-orange-50 text-orange-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-950">
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-orange-600 transition hover:text-orange-700"
          >
            Back to home
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="w-full lg:justify-self-end lg:max-w-md">
          <div className="mb-8 flex items-center justify-center lg:hidden">
            <Link href="/" className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-[0_14px_28px_rgba(249,115,22,0.22)]">
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
          </div>

          <Card>
            <CardHeader className="space-y-2 text-center">
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>{children}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
