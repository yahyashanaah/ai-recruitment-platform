"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  FileStack,
  MessageSquareText,
  Sparkles,
  UsersRound,
  WandSparkles
} from "lucide-react";
import { toast } from "sonner";

import { AnimatedCounter } from "@/components/common/animated-counter";
import { EmptyState } from "@/components/common/empty-state";
import { UsageMeter } from "@/components/common/usage-meter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { isAuthenticationRequiredError, listCandidates } from "@/lib/api/client";
import type { CandidateProfile } from "@/lib/api/types";
import { useStoredNumber } from "@/lib/storage";
import { formatDate } from "@/lib/utils";

const quickActions = [
  {
    href: "/intake",
    title: "Upload CVs",
    description: "Add resume files and create structured candidate records.",
    icon: FileStack
  },
  {
    href: "/match",
    title: "Start a new match",
    description: "Paste a job description and compare the strongest candidates.",
    icon: BriefcaseBusiness
  },
  {
    href: "/generate",
    title: "Generate a JD",
    description: "Turn a short hiring brief into a structured job description.",
    icon: WandSparkles
  }
];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const chatQueries = useStoredNumber("tc_chat_queries_used");
  const matchRuns = useStoredNumber("tc_match_runs");
  const generatedJds = useStoredNumber("tc_generated_jds");

  useEffect(() => {
    const run = async () => {
      try {
        const response = await listCandidates();
        setCandidates(response);
      } catch (error) {
        if (isAuthenticationRequiredError(error)) {
          return;
        }
        toast.error(error instanceof Error ? error.message : "Unable to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  const uploadedFiles = useMemo(() => new Set(candidates.map((candidate) => candidate.file_name)).size, [candidates]);

  const activity = useMemo(
    () =>
      [...candidates]
        .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
        .slice(0, 5),
    [candidates]
  );

  const stats = [
    {
      label: "Candidates",
      value: candidates.length,
      hint: "Profiles currently available in your workspace.",
      icon: UsersRound
    },
    {
      label: "Uploaded files",
      value: uploadedFiles,
      hint: "Source documents grouped by file name.",
      icon: FileStack
    },
    {
      label: "AI chats",
      value: chatQueries,
      hint: "Questions asked from this browser session.",
      icon: MessageSquareText
    },
    {
      label: "JD runs",
      value: matchRuns + generatedJds,
      hint: "Matching and Smart JD actions triggered here.",
      icon: Sparkles
    }
  ];

  return (
    <div className="grid gap-6">
      <Card className="overflow-hidden bg-gradient-to-br from-white via-orange-50/55 to-amber-50/70">
        <CardContent className="grid gap-8 p-6 md:p-8 lg:grid-cols-[1.1fr,0.9fr] lg:items-end">
          <div>
            <Badge>Workspace overview</Badge>
            <h2 className="font-display mt-5 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              Manage intake, review candidates, and move to matches faster.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              This workspace stays aligned with your new landing experience: clean, recruiter-focused, and centered on the core actions that drive hiring forward.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/intake">
                  Go to intake
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/candidates">Review candidates</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-orange-100 bg-white/90 p-5 shadow-[0_18px_40px_rgba(251,146,60,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Focus now</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">{uploadedFiles > 0 ? "Continue candidate review" : "Start document intake"}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {uploadedFiles > 0
                  ? "Your recruiter workspace already has uploaded candidate data ready for chat and matching."
                  : "Upload your first resume files to activate chat, candidate review, and JD matching."}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white/90 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Latest signal</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">
                {activity[0]?.name ?? "No candidate activity yet"}
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {activity[0]
                  ? `${activity[0].current_position || "Candidate profile"} from ${activity[0].file_name}`
                  : "Recent upload activity will appear here once your workspace has candidates."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4 pt-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{item.label}</p>
                    <p className="font-display mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                      {loading ? <Skeleton className="h-9 w-20" /> : <AnimatedCounter value={item.value} />}
                    </p>
                  </div>
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-orange-600">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">{item.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent candidate activity</CardTitle>
            <CardDescription>Profiles created in your recruiter workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 rounded-[22px]" />
                ))}
              </div>
            ) : activity.length === 0 ? (
              <EmptyState
                icon={UsersRound}
                title="No candidate activity yet"
                description="Upload resumes from Document Intake and this feed will show the newest structured profiles."
              />
            ) : (
              <div className="grid gap-3">
                {activity.map((candidate) => (
                  <div
                    key={candidate.candidate_id}
                    className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-slate-950">{candidate.name}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {candidate.current_position || "Candidate profile"} {candidate.location ? `• ${candidate.location}` : ""}
                        </p>
                      </div>
                      <Badge variant="secondary">{formatDate(candidate.created_at ?? Date.now())}</Badge>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-600">Source file: {candidate.file_name}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {candidate.skills.slice(0, 4).map((skill) => (
                        <Badge key={skill} variant="outline" className="normal-case tracking-normal">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>Start from the most common recruiter workflows.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="rounded-[24px] border border-slate-200 bg-white p-5 transition hover:border-orange-200 hover:bg-orange-50/60"
                  >
                    <div className="flex items-start gap-4">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-orange-600">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-slate-950">{action.title}</p>
                        <p className="mt-2 text-sm leading-7 text-slate-600">{action.description}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usage snapshot</CardTitle>
              <CardDescription>Current activity against Growth plan limits.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <UsageMeter label="CV uploads" used={uploadedFiles} total={300} />
              <UsageMeter label="AI chats" used={chatQueries} total={1000} />
              <UsageMeter label="Smart JD runs" used={generatedJds} total={20} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
