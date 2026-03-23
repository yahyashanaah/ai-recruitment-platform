"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    Brain,
    BriefcaseBusiness,
    ClipboardPenLine,
    GraduationCap,
    LoaderCircle,
    SearchCheck,
    SlidersHorizontal,
    Sparkles
} from "lucide-react";

import { generateSmartJobDescription, matchJobDescription } from "@/lib/api/client";
import type { MatchCandidate, MatchResponse, SmartJDResponse } from "@/lib/api/types";
import { formatPercent } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

export default function MatchPage() {
  const [roleBrief, setRoleBrief] = useState("");
  const [includeSalarySuggestion, setIncludeSalarySuggestion] = useState(true);
  const [generatedJD, setGeneratedJD] = useState<SmartJDResponse | null>(null);
  const [generatorLoading, setGeneratorLoading] = useState(false);
  const [generatorError, setGeneratorError] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [candidateLimit, setCandidateLimit] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSmartGenerator = async () => {
    if (!roleBrief.trim() || generatorLoading) {
      return;
    }

    setGeneratorLoading(true);
    setGeneratorError(null);
    try {
      const response = await generateSmartJobDescription({
        role_brief: roleBrief.trim(),
        include_salary_suggestion: includeSalarySuggestion
      });
      setGeneratedJD(response);
      setJobDescription(response.optimized_job_description);
    } catch (err) {
      setGeneratorError(err instanceof Error ? err.message : "Unable to generate smart JD");
    } finally {
      setGeneratorLoading(false);
    }
  };

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
      <Card className="border-primary/20 bg-gradient-to-r from-orange-50 via-white to-orange-100/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <ClipboardPenLine className="h-5 w-5 text-primary" />
            Smart JD Generator
          </CardTitle>
          <CardDescription>
            Start from a short hiring brief, generate a structured JD, separate must-have vs preferred skills,
            and auto-load an optimized version for matching.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Textarea
            value={roleBrief}
            onChange={(event) => setRoleBrief(event.target.value)}
            placeholder="Example: Backend engineer for fintech startup with FastAPI, PostgreSQL, Docker, and AWS experience."
            className="min-h-28"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-white p-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={includeSalarySuggestion}
                onChange={(event) => setIncludeSalarySuggestion(event.target.checked)}
                className="h-4 w-4 rounded border-border accent-orange-500"
              />
              Include salary suggestion
            </label>
            <Button onClick={runSmartGenerator} disabled={generatorLoading || !roleBrief.trim()}>
              {generatorLoading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Generate Smart JD
                  <Sparkles className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          {generatorError && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{generatorError}</p>
          )}

          {generatedJD && (
            <div className="grid gap-4">
              <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
                <Card className="border-primary/15 bg-white shadow-premium">
                  <CardHeader className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{generatedJD.title || "Generated Role"}</Badge>
                      {generatedJD.seniority && <Badge variant="outline">{generatedJD.seniority}</Badge>}
                      {generatedJD.employment_type && (
                        <Badge variant="outline">{generatedJD.employment_type}</Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">Structured JD Output</CardTitle>
                    <CardDescription>{generatedJD.role_summary || "No summary generated."}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 text-sm">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-border/70 bg-orange-50/60 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Required Skills
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {generatedJD.required_skills.length === 0 && (
                            <span className="text-xs">None generated</span>
                          )}
                          {generatedJD.required_skills.map((skill) => (
                            <Badge key={skill} variant="success">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Preferred Skills
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {generatedJD.preferred_skills.length === 0 && (
                            <span className="text-xs">None generated</span>
                          )}
                          {generatedJD.preferred_skills.map((skill) => (
                            <Badge key={skill} variant="outline">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-lg border border-border/70 p-3">
                        <p className="mb-1 text-xs font-semibold text-muted-foreground">Minimum Experience</p>
                        <p>{generatedJD.min_experience} years</p>
                      </div>
                      <div className="rounded-lg border border-border/70 p-3">
                        <p className="mb-1 text-xs font-semibold text-muted-foreground">Education</p>
                        <p>{generatedJD.education_required || "Not specified"}</p>
                      </div>
                      <div className="rounded-lg border border-border/70 p-3">
                        <p className="mb-1 text-xs font-semibold text-muted-foreground">Matching Keywords</p>
                        <p>{generatedJD.matching_keywords.length} keywords generated</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/70 p-3">
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <SearchCheck className="h-3.5 w-3.5 text-primary" />
                        Recruiter Search Terms
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {generatedJD.matching_keywords.map((keyword) => (
                          <Badge key={keyword} variant="secondary">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/70 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Responsibilities
                      </p>
                      <ul className="grid gap-2 pl-4 text-sm text-foreground/90">
                        {generatedJD.responsibilities.map((item) => (
                          <li key={item} className="list-disc">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/15 bg-white shadow-premium">
                  <CardHeader>
                    <CardTitle className="text-lg">Optimized For Matching</CardTitle>
                    <CardDescription>
                      This generated JD is already loaded into the matcher below.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Optimized JD
                      </p>
                      <p className="whitespace-pre-line leading-relaxed">
                        {generatedJD.optimized_job_description}
                      </p>
                    </div>

                    {generatedJD.salary_suggestion && (
                      <div className="rounded-lg border border-border/70 bg-orange-50/60 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Salary Suggestion
                        </p>
                        <p className="font-medium">
                          {generatedJD.salary_suggestion.currency}{" "}
                          {generatedJD.salary_suggestion.min_amount?.toLocaleString() ?? "N/A"} -{" "}
                          {generatedJD.salary_suggestion.max_amount?.toLocaleString() ?? "N/A"} per{" "}
                          {generatedJD.salary_suggestion.period}
                        </p>
                        <p className="mt-2 text-muted-foreground">
                          {generatedJD.salary_suggestion.rationale}
                        </p>
                      </div>
                    )}

                    <Button
                      variant="secondary"
                      onClick={() => setJobDescription(generatedJD.optimized_job_description)}
                    >
                      Use This JD For Matching
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                      <Badge>Match score: {formatPercent(candidate.overall_score)}</Badge>
                    </div>
                    <CardTitle>{candidate.candidate_name}</CardTitle>
                    <CardDescription>
                      {candidate.current_position || "Role not extracted"} •{" "}
                      {candidate.location || "Unknown location"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 text-sm lg:grid-cols-[1.15fr,0.85fr]">
                    <div className="space-y-4">
                      <div className="grid gap-3 rounded-lg border border-border/70 bg-orange-50/50 p-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Match score
                          </p>
                          <p className="mt-1 text-2xl font-semibold text-primary">
                            {formatPercent(candidate.overall_score)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Skill overlap
                          </p>
                          <p className="mt-1 font-medium">
                            {candidate.skill_overlap.matched_required_skills} of{" "}
                            {candidate.skill_overlap.total_required_skills} required skills matched
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Overlap: {formatPercent(candidate.skill_overlap.overlap_percentage)}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-2 rounded-lg border border-border/70 p-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Brain className="h-3.5 w-3.5 text-primary" />
                          Skill overlap breakdown
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

                    <div className="space-y-4">
                      <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                        <p className="mb-2 text-xs font-semibold text-muted-foreground">Clear reasoning</p>
                        <p className="leading-relaxed">{candidate.reasoning}</p>
                      </div>

                      <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                        <p className="mb-2 text-xs font-semibold text-muted-foreground">Scoring inputs</p>
                        <div className="space-y-2 text-sm">
                          <p>Skills contribution is based on required skill coverage.</p>
                          <p>Experience contribution compares candidate years against the JD minimum.</p>
                          <p>Education and certifications are used as supporting fit signals.</p>
                        </div>
                      </div>
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
