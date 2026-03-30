"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { ScoreRing } from "@/components/common/score-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { matchJobDescription } from "@/lib/api/client";
import { incrementStoredNumber } from "@/lib/storage";
import type { MatchResponse } from "@/lib/api/types";
import { downloadTextFile, exportHtmlToPrintWindow, formatPercent } from "@/lib/utils";

export default function MatchPage() {
  const [jobDescription, setJobDescription] = useState("");
  const [candidateLimit, setCandidateLimit] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResponse | null>(null);

  useEffect(() => {
    const draft = window.localStorage.getItem("tc_match_draft");
    if (draft) {
      setJobDescription(draft);
      window.localStorage.removeItem("tc_match_draft");
    }
  }, []);

  const runMatch = async () => {
    if (!jobDescription.trim() || loading) {
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const response = await matchJobDescription({
        job_description: jobDescription.trim(),
        top_n: candidateLimit
      });
      setResult(response);
      incrementStoredNumber("tc_match_runs");
      toast.success("JD analyzed successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to match candidates");
    } finally {
      setLoading(false);
    }
  };

  const csvContent = useMemo(() => {
    if (!result) {
      return "";
    }

    const rows = result.top_candidates.map((candidate, index) =>
      [
        index + 1,
        candidate.candidate_name,
        candidate.overall_score,
        candidate.location,
        candidate.current_position,
        candidate.skills_match.join(" | "),
        candidate.missing_skills.join(" | ")
      ].join(",")
    );

    return [
      "rank,candidate_name,overall_score,location,current_position,skills_match,missing_skills",
      ...rows
    ].join("\n");
  }, [result]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Matching"
        title="Rank the right candidates against any job description"
        description="Paste a JD, parse its hiring signals, and review a premium ranked shortlist with score rings, skill overlap, and recruiter-friendly reasoning."
        action={
          <div className="flex gap-2">
            <Button variant="outline" disabled={!result} onClick={() => result && downloadTextFile("talentcore-match-results.csv", csvContent, "text/csv") }>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="secondary" disabled={!result} onClick={() => result && exportHtmlToPrintWindow("TalentCore Match Results", JSON.stringify(result, null, 2))}>
              <FileText className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Analyze job description</CardTitle>
            <CardDescription>Paste the JD below, then TalentCore will parse the requirements and rank the best-fit candidates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the job description here..."
              className="min-h-[360px]"
            />
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-2 flex items-center justify-between text-sm text-white/52">
                <span>Result list size</span>
                <span>Top {candidateLimit}</span>
              </div>
              <input type="range" min={1} max={20} value={candidateLimit} onChange={(event) => setCandidateLimit(Number(event.target.value))} className="w-full accent-[#6C63FF]" />
            </div>
            <Button onClick={runMatch} disabled={!jobDescription.trim() || loading} className="w-full">
              {loading ? "Analyzing JD..." : "Analyze JD"}
              <Sparkles className="h-4 w-4" />
            </Button>

            {result && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/35">Required skills</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.parsed_jd.required_skills.map((skill) => (
                      <Badge key={skill} variant="teal">{skill}</Badge>
                    ))}
                  </div>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/35">Preferred skills</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.parsed_jd.nice_to_have_skills.map((skill) => (
                      <Badge key={skill} variant="outline">{skill}</Badge>
                    ))}
                  </div>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/35">Minimum experience</p>
                  <p className="mt-3 text-white">{result.parsed_jd.min_experience} years</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/35">Education requirement</p>
                  <p className="mt-3 text-white">{result.parsed_jd.education_required || "Not specified"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {loading ? (
            [1, 2, 3].map((item) => (
              <Card key={item}>
                <CardContent className="space-y-4 p-6">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-28 w-full" />
                </CardContent>
              </Card>
            ))
          ) : result ? (
            result.top_candidates.map((candidate, index) => {
              const skillsPoints = candidate.score_breakdown.skills_score * 0.5;
              const experiencePoints = candidate.score_breakdown.experience_score * 0.3;
              const educationPoints = candidate.score_breakdown.education_score * 0.1;
              const certificationPoints = candidate.score_breakdown.certifications_score * 0.1;

              return (
                <Card key={`${candidate.candidate_name}-${index}`}>
                  <CardContent className="grid gap-5 p-6 xl:grid-cols-[120px_minmax(0,1fr)]">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <ScoreRing value={candidate.overall_score} />
                    </div>
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-display text-2xl text-white">{candidate.candidate_name}</p>
                          <p className="mt-1 text-sm text-white/50">{candidate.current_position || "Position unavailable"} • {candidate.location || "Unknown location"}</p>
                        </div>
                        <Badge variant="teal">Match score {formatPercent(candidate.overall_score)}</Badge>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-white/35">Skill overlap</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {candidate.skills_match.map((skill) => (
                              <Badge key={skill} variant="teal">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-white/35">Missing skills</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {candidate.missing_skills.length === 0 && <span className="text-sm text-white/48">No major gaps</span>}
                            {candidate.missing_skills.map((skill) => (
                              <Badge key={skill} variant="warning">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-white/72">
                        <p className="mb-2 text-xs uppercase tracking-[0.24em] text-white/35">AI reasoning</p>
                        {candidate.reasoning}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-white/35">Skills</p>
                          <p className="mt-3 text-white">{skillsPoints.toFixed(1)} pts</p>
                        </div>
                        <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-white/35">Experience</p>
                          <p className="mt-3 text-white">{experiencePoints.toFixed(1)} pts</p>
                        </div>
                        <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-white/35">Education</p>
                          <p className="mt-3 text-white">{educationPoints.toFixed(1)} pts</p>
                        </div>
                        <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-white/35">Certifications</p>
                          <p className="mt-3 text-white">{certificationPoints.toFixed(1)} pts</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="p-10 text-center text-white/52">Run a JD analysis to see ranked candidate results.</CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
