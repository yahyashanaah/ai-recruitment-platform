"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, BriefcaseBusiness, Files, MessageSquareText, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { AnimatedCounter } from "@/components/common/animated-counter";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
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
      { label: "Total Candidates", value: candidates.length, icon: UsersRound },
      { label: "CVs Processed This Month", value: candidates.length, icon: Files },
      { label: "Active Job Matches", value: matchRuns, icon: BriefcaseBusiness },
      { label: "AI Chat Queries Used", value: chatQueries, icon: MessageSquareText }
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
      <PageHeader
        eyebrow="Overview"
        title="Enterprise recruiter operations at a glance"
        description="Track usage, intake volume, recent candidate activity, and jump into the next high-value action without leaving the dashboard."
        action={
          <Button asChild>
            <Link href="/intake" className="gap-2">
              Upload CVs
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

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
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-white/45">{stat.label}</p>
                        <p className="mt-4 font-display text-4xl text-white">
                          <AnimatedCounter value={stat.value} />
                        </p>
                      </div>
                      <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
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
              <Button asChild className="justify-between">
                <Link href="/intake">
                  Upload CVs
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary" className="justify-between">
                <Link href="/match">
                  Start New Match
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-between">
                <Link href="/generate">
                  Generate JD
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usage meter</CardTitle>
              <CardDescription>Current Growth plan utilization based on tracked workspace actions.</CardDescription>
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
