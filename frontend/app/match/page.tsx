"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  BriefcaseBusiness,
  GraduationCap,
  LoaderCircle,
  SlidersHorizontal,
  Sparkles
} from "lucide-react";

import { matchJobDescription } from "@/lib/api/client";
import type { MatchCandidate, MatchResponse } from "@/lib/api/types";
import { formatPercent } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

function scoreLevel(value: number) {
  if (value >= 85) return "strong";
  if (value >= 60) return "moderate";
  if (value >= 35) return "limited";
  return "weak";
}

function describeMetric(metric: "skills" | "experience" | "education" | "certifications", value: number) {
  const level = scoreLevel(value);

  if (metric === "skills") {
    if (level === "strong") return "Skills alignment is strong with most required abilities covered.";
    if (level === "moderate") return "Skills alignment is moderate with several core requirements matched.";
    if (level === "limited") return "Skills alignment is limited and key requirements are partially covered.";
    return "Skills alignment is weak with major capability gaps.";
  }

  if (metric === "experience") {
    if (level === "strong") return "Experience level is fully aligned with the role requirements.";
    if (level === "moderate") return "Experience level is close to requirements with minor gaps.";
    if (level === "limited") return "Experience level is below the target range for this role.";
    return "Experience level is significantly below the required threshold.";
  }

  if (metric === "education") {
    if (level === "strong") return "Education background aligns with the stated requirements.";
    if (level === "moderate") return "Education background is partially aligned with the requirement.";
    if (level === "limited") return "Education alignment is limited against the stated criteria.";
    return "Education alignment is not evident from available profile data.";
  }

  if (level === "strong") return "Certification relevance is strong for this job scope.";
  if (level === "moderate") return "Certification relevance is acceptable with useful alignment.";
  if (level === "limited") return "Certification relevance is limited for this position.";
  return "Certification relevance is minimal or not demonstrated.";
}

export default function MatchPage() {
  const [jobDescription, setJobDescription] = useState("");
  const [candidateLimit, setCandidateLimit] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runMatch = async () => {
    if (!jobDescription.trim() || loading) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await matchJobDescription({
        job_description: jobDescription.trim(),
        top_n: candidateLimit
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to match candidates");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Card className="border-primary/20 bg-gradient-to-r from-orange-50 via-white to-orange-100/60">
        <CardHeader>
          <CardTitle className="text-2xl">JD Matching Engine</CardTitle>
          <CardDescription>
            Submit a job description and return a vertical ranked shortlist with configurable size.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            placeholder="Paste job description here..."
            className="min-h-40"
          />

          <div className="rounded-xl border border-border/70 bg-white p-4">
            <div className="mb-2 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Matching Candidate Count</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <input
                type="range"
                min={1}
                max={20}
                value={candidateLimit}
                onChange={(event) => setCandidateLimit(Number(event.target.value))}
                className="w-full accent-orange-500 sm:w-72"
              />
              <Badge variant="outline">Top {candidateLimit} candidates</Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={runMatch} disabled={loading || !jobDescription.trim()}>
              {loading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Matching...
                </>
              ) : (
                <>
                  Run Match
                  <Sparkles className="h-4 w-4" />
                </>
              )}
            </Button>
            <Badge variant="warning">Endpoint: /api/v1/match-jd</Badge>
          </div>
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </CardContent>
      </Card>

      {loading && (
        <div className="grid gap-4">
          {[1, 2, 3].map((item) => (
            <Card key={item}>
              <CardContent className="space-y-3 p-5">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-14 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {result && (
        <div className="grid gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BriefcaseBusiness className="h-4 w-4 text-primary" />
                Parsed Job Description
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Required Skills</p>
                <div className="flex flex-wrap gap-2">
                  {result.parsed_jd.required_skills.length === 0 && <span>None detected</span>}
                  {result.parsed_jd.required_skills.map((skill) => (
                    <Badge key={skill} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Nice to Have</p>
                <div className="flex flex-wrap gap-2">
                  {result.parsed_jd.nice_to_have_skills.length === 0 && <span>None detected</span>}
                  {result.parsed_jd.nice_to_have_skills.map((skill) => (
                    <Badge key={skill} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Min Experience</p>
                <p>{result.parsed_jd.min_experience} years</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Education Required</p>
                <p>{result.parsed_jd.education_required || "Not specified"}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {result.top_candidates.map((candidate: MatchCandidate, index) => (
              <motion.div
                key={`${candidate.candidate_name}-${index}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
              >
                <Card className="border-primary/20 bg-white shadow-premium">
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">Rank #{index + 1}</Badge>
                      <Badge>Overall fit: {formatPercent(candidate.overall_score)}</Badge>
                    </div>
                    <CardTitle>{candidate.candidate_name}</CardTitle>
                    <CardDescription>
                      {candidate.current_position || "Role not extracted"} •{" "}
                      {candidate.location || "Unknown location"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 text-sm lg:grid-cols-[1.15fr,0.85fr]">
                    <div className="space-y-4">
                      <div className="rounded-lg border border-border/70 bg-orange-50/50 p-3">
                        <p className="font-medium">{candidate.reasoning}</p>
                      </div>

                      <div className="grid gap-2 rounded-lg border border-border/70 p-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Brain className="h-3.5 w-3.5 text-primary" />
                          Skills Match
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {candidate.skills_match.length === 0 && <span className="text-xs">None detected</span>}
                          {candidate.skills_match.map((skill) => (
                            <Badge key={skill} variant="success">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-2 rounded-lg border border-border/70 p-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <GraduationCap className="h-3.5 w-3.5 text-primary" />
                          Missing Skills
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {candidate.missing_skills.length === 0 && <span className="text-xs">No major gaps</span>}
                          {candidate.missing_skills.map((skill) => (
                            <Badge key={skill} variant="outline">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">Score Summary</p>
                      <ul className="space-y-2 text-sm">
                        <li>{describeMetric("skills", candidate.score_breakdown.skills_score)}</li>
                        <li>{describeMetric("experience", candidate.score_breakdown.experience_score)}</li>
                        <li>{describeMetric("education", candidate.score_breakdown.education_score)}</li>
                        <li>
                          {describeMetric(
                            "certifications",
                            candidate.score_breakdown.certifications_score
                          )}
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
