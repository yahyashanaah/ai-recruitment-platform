"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  Files,
  MessageSquareText,
  Sparkles,
  UsersRound
} from "lucide-react";
import { toast } from "sonner";

import { AnimatedCounter } from "@/components/common/animated-counter";
import { EmptyState } from "@/components/common/empty-state";
import { UsageMeter } from "@/components/common/usage-meter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listCandidates } from "@/lib/api/client";
import { useStoredNumber } from "@/lib/storage";
import type { CandidateProfile } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";

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
        toast.error(error instanceof Error ? error.message : "Unable to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const stats = useMemo(
    () => [
      {
        label: "Total candidates",
        value: candidates.length,
        icon: UsersRound,
        hint: "Structured profiles synced from SQLite"
      },
      {
        label: "CVs processed",
        value: candidates.length,
        icon: Files,
        hint: "Current workspace intake volume"
      },
      {
        label: "Active matches",
        value: matchRuns,
        icon: BriefcaseBusiness,
        hint: "JD analyses started from this workspace"
      },
      {
        label: "AI chat queries",
        value: chatQueries,
        icon: MessageSquareText,
        hint: "Knowledge-base questions asked so far"
      }
    ],
    [candidates.length, matchRuns, chatQueries]
  );

  const recentActivity = useMemo(
    () =>
      candidates.slice(0, 5).map((candidate, index) => ({
        id: candidate.candidate_id,
        title: `${candidate.name} profile is ready`,
        description: `${candidate.current_position || "Candidate profile"} added from ${candidate.file_name}`,
        date: new Date(Date.now() - index * 86400000)
      })),
    [candidates]
  );

  return (
    <div className="grid gap-6">
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-6 p-6 md:p-7 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <Badge variant="teal">Dashboard</Badge>
            <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Recruiter operations, organized into one clean workspace.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/56 md:text-base">
              Track candidate volume, current activity, and plan usage without jumping across pages.
              The dashboard surfaces only the actions and signals recruiters need most.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/intake" className="gap-2">
                Upload CVs
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/match" className="gap-2">
                Start Match
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-4">
        {loading
          ? [1, 2, 3, 4].map((item) => (
              <Card key={item}>
                <CardContent className="space-y-4 p-6">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-14 w-full" />
                </CardContent>
              </Card>
            ))
          : stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label}>
                  <CardContent className="space-y-5 p-6">
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium text-white/72">{stat.label}</p>
                    </div>
                    <p className="font-display text-4xl text-white">
                      <AnimatedCounter value={stat.value} />
                    </p>
                    <p className="text-sm leading-6 text-white/46">{stat.hint}</p>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#00D4AA]" />
              Recent activity
            </CardTitle>
            <CardDescription>Latest candidate and workspace events derived from your current backend data.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <Skeleton key={item} className="h-20 w-full" />
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No activity yet"
                description="Start by uploading CVs or running a match to begin building recruiter activity."
              />
            ) : (
              <div className="space-y-3">
                {recentActivity.map((item) => (
                  <div key={item.id} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-white">{item.title}</p>
                        <p className="mt-1 text-sm text-white/52">{item.description}</p>
                      </div>
                      <Badge variant="outline">{formatDate(item.date)}</Badge>
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
              <CardDescription>Jump directly into the next recruiter workflow.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Link
                href="/intake"
                className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/78 transition hover:bg-white/[0.05]"
              >
                <span>Upload new CV batch</span>
                <ArrowRight className="h-4 w-4 text-primary" />
              </Link>
              <Link
                href="/match"
                className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/78 transition hover:bg-white/[0.05]"
              >
                <span>Run a new JD match</span>
                <ArrowRight className="h-4 w-4 text-primary" />
              </Link>
              <Link
                href="/generate"
                className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/78 transition hover:bg-white/[0.05]"
              >
                <span>Generate a Smart JD</span>
                <Sparkles className="h-4 w-4 text-primary" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usage meter</CardTitle>
              <CardDescription>Growth plan usage based on current recruiter activity in this browser session.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <UsageMeter label="CV uploads" used={candidates.length} total={300} />
              <UsageMeter label="Smart JDs generated" used={generatedJds} total={20} />
              <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
                AI chat is unlimited on Growth. You have used <span className="text-white">{chatQueries}</span> queries so far.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
