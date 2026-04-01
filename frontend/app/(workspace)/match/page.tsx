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
import { isAuthenticationRequiredError, matchJobDescription } from "@/lib/api/client";
import type { MatchCandidate, MatchResponse } from "@/lib/api/types";
import { incrementStoredNumber } from "@/lib/storage";
import { downloadTextFile, exportHtmlToPrintWindow } from "@/lib/utils";

function describeBreakdown(candidate: MatchCandidate) {
  const descriptions: string[] = [];

  descriptions.push(
    candidate.skill_overlap.overlap_percentage >= 80
      ? "Skill alignment is strong against the required stack."
      : candidate.skill_overlap.overlap_percentage >= 50
        ? "Skill alignment is moderate and covers a meaningful share of the required stack."
        : "Skill alignment is limited and will require closer review."
  );

  descriptions.push(
    candidate.years_of_experience > 0
      ? `Experience profile shows ${candidate.years_of_experience} years in relevant roles.`
      : "Experience history is not clearly specified in the candidate profile."
  );

  descriptions.push(
    candidate.certifications.length > 0
      ? `Certifications add extra signal: ${candidate.certifications.slice(0, 2).join(", ")}.`
      : "No certification boost is available for this candidate."
  );

  return descriptions;
}

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
      if (isAuthenticationRequiredError(error)) {
        return;
      }
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
      "rank,candidate,score,location,current_position,matched_skills,missing_skills",
      ...rows
    ].join("\n");
  }, [result]);

  const printableContent = useMemo(() => {
    if (!result) {
      return "";
    }

    return [
      "Parsed job description",
      `Required skills: ${result.parsed_jd.required_skills.join(", ") || "Not identified"}`,
      `Preferred skills: ${result.parsed_jd.nice_to_have_skills.join(", ") || "Not identified"}`,
      `Minimum experience: ${result.parsed_jd.min_experience} years`,
      `Education: ${result.parsed_jd.education_required || "Not specified"}`,
      "",
      ...result.top_candidates.flatMap((candidate, index) => [
        `${index + 1}. ${candidate.candidate_name} (${candidate.overall_score}%)`,
        `Role: ${candidate.current_position || "Not specified"}`,
        `Location: ${candidate.location || "Not specified"}`,
        `Matched skills: ${candidate.skills_match.join(", ") || "None"}`,
        `Missing skills: ${candidate.missing_skills.join(", ") || "None"}`,
        `Reasoning: ${candidate.reasoning}`,
        ""
      ])
    ].join("\n");
  }, [result]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="JD Matching"
        title="Analyze a job description and review ranked candidates in one vertical list"
        description="Parse the JD, inspect required versus preferred skills, and compare scored candidates with clearer reasoning."
        action={
          result ? (
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => downloadTextFile("jd-match-results.csv", csvContent, "text/csv") }>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={() => exportHtmlToPrintWindow("JD Match Results", printableContent)}>
                <FileText className="h-4 w-4" />
                Export PDF
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Job description</CardTitle>
              <CardDescription>Paste the hiring brief or full JD and choose how many candidates to return.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Textarea
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste the full job description here..."
                className="min-h-[300px]"
              />

              <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
                <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
                  <span>Top candidates</span>
                  <span>{candidateLimit}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={candidateLimit}
                  onChange={(event) => setCandidateLimit(Number(event.target.value))}
                  className="mt-3 h-2 w-full accent-orange-500"
                />
              </div>

              <Button onClick={runMatch} disabled={loading || !jobDescription.trim()}>
                <Sparkles className="h-4 w-4" />
                {loading ? "Analyzing JD..." : "Analyze JD"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Parsed JD</CardTitle>
              <CardDescription>Structured interpretation generated from the job description.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid gap-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-20 rounded-[22px]" />
                  ))}
                </div>
              ) : result ? (
                <div className="grid gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Required skills</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {result.parsed_jd.required_skills.map((skill) => (
                        <Badge key={skill} className="normal-case tracking-normal">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Preferred skills</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {result.parsed_jd.nice_to_have_skills.length > 0 ? (
                        result.parsed_jd.nice_to_have_skills.map((skill) => (
                          <Badge key={skill} variant="outline" className="normal-case tracking-normal">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">No preferred skills identified.</p>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Min experience</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">{result.parsed_jd.min_experience} years</p>
                    </div>
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Education</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">{result.parsed_jd.education_required || "Not specified"}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-7 text-slate-600">Run a match to see the parsed JD breakdown here.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ranked candidates</CardTitle>
            <CardDescription>Recruiter-facing shortlist with overlap, missing skills, and reasoning.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-64 rounded-[28px]" />
                ))}
              </div>
            ) : !result || result.top_candidates.length === 0 ? (
              <p className="text-sm leading-7 text-slate-600">Analyze a JD to populate ranked candidate results.</p>
            ) : (
              <div className="grid gap-4">
                {result.top_candidates.map((candidate, index) => (
                  <div key={candidate.candidate_id} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge className="normal-case tracking-normal">Rank #{index + 1}</Badge>
                          <p className="text-lg font-semibold text-slate-950">{candidate.candidate_name}</p>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                          {candidate.current_position || "Candidate profile"} {candidate.location ? `• ${candidate.location}` : ""}
                        </p>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Matched skills</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {candidate.skills_match.length > 0 ? (
                                candidate.skills_match.map((skill) => (
                                  <Badge key={skill} className="normal-case tracking-normal">
                                    {skill}
                                  </Badge>
                                ))
                              ) : (
                                <p className="text-sm text-slate-500">No matched skills identified.</p>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Missing skills</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {candidate.missing_skills.length > 0 ? (
                                candidate.missing_skills.map((skill) => (
                                  <Badge key={skill} variant="warning" className="normal-case tracking-normal">
                                    {skill}
                                  </Badge>
                                ))
                              ) : (
                                <p className="text-sm text-slate-500">No major skill gaps identified.</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Clear reasoning</p>
                          <p className="mt-3 text-sm leading-7 text-slate-700">{candidate.reasoning}</p>
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                          {describeBreakdown(candidate).map((line) => (
                            <div key={line} className="rounded-[22px] border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-600">
                              {line}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex w-full shrink-0 flex-col items-center rounded-[24px] border border-orange-100 bg-orange-50/60 p-5 lg:w-[200px]">
                        <ScoreRing value={candidate.overall_score} label="Match" size={96} />
                        <div className="mt-5 w-full space-y-3 text-sm text-slate-600">
                          <p>
                            Skill overlap: {candidate.skill_overlap.matched_required_skills}/{candidate.skill_overlap.total_required_skills}
                          </p>
                          <p>Experience score: {candidate.score_breakdown.experience_score} pts</p>
                          <p>Education score: {candidate.score_breakdown.education_score} pts</p>
                          <p>Certification score: {candidate.score_breakdown.certifications_score} pts</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
