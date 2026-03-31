"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, FileText, History, Sparkles, WandSparkles } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { generateSmartJobDescription } from "@/lib/api/client";
import type { SmartJDResponse } from "@/lib/api/types";
import { incrementStoredNumber } from "@/lib/storage";
import { exportHtmlToPrintWindow, formatDate } from "@/lib/utils";

interface HistoryItem extends SmartJDResponse {
  id: string;
  role_brief: string;
  created_at: string;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

export default function GeneratePage() {
  const [roleBrief, setRoleBrief] = useState("");
  const [seniority, setSeniority] = useState("Mid-level");
  const [industry, setIndustry] = useState("Fintech");
  const [workModel, setWorkModel] = useState("Remote");
  const [includeSalary, setIncludeSalary] = useState(true);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<SmartJDResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem("tc_generated_jd_history");
    if (!raw) {
      return;
    }

    try {
      setHistory(JSON.parse(raw) as HistoryItem[]);
    } catch {
      window.localStorage.removeItem("tc_generated_jd_history");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("tc_generated_jd_history", JSON.stringify(history));
  }, [history]);

  const runGenerator = async () => {
    if (!roleBrief.trim() || loading) {
      return;
    }

    setLoading(true);
    try {
      const response = await generateSmartJobDescription({
        role_brief: roleBrief.trim(),
        seniority,
        industry,
        work_model: workModel,
        include_salary_suggestion: includeSalary
      });
      setGenerated(response);
      setHistory((current) => [
        {
          ...response,
          id: uid(),
          role_brief: roleBrief.trim(),
          created_at: new Date().toISOString()
        },
        ...current
      ].slice(0, 12));
      incrementStoredNumber("tc_generated_jds");
      toast.success("Smart JD generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to generate JD");
    } finally {
      setLoading(false);
    }
  };

  const printableText = useMemo(() => {
    if (!generated) {
      return "";
    }

    return [
      generated.title,
      `Seniority: ${generated.seniority}`,
      `Industry: ${generated.industry}`,
      `Work model: ${generated.work_model}`,
      `Employment type: ${generated.employment_type}`,
      `Minimum experience: ${generated.min_experience} years`,
      `Education: ${generated.education_required}`,
      "",
      "Role summary",
      generated.role_summary,
      "",
      "Responsibilities",
      ...generated.responsibilities.map((item) => `- ${item}`),
      "",
      "Required skills",
      ...generated.required_skills.map((item) => `- ${item}`),
      "",
      "Preferred skills",
      ...generated.preferred_skills.map((item) => `- ${item}`),
      "",
      "Keywords",
      generated.matching_keywords.join(", "),
      "",
      "Optimized job description",
      generated.optimized_job_description,
      "",
      generated.salary_suggestion
        ? `Salary suggestion: ${generated.salary_suggestion.currency} ${generated.salary_suggestion.min_amount ?? ""}-${generated.salary_suggestion.max_amount ?? ""} ${generated.salary_suggestion.period}`
        : "Salary suggestion: not included"
    ].join("\n");
  }, [generated]);

  const useForMatching = () => {
    if (!generated) {
      return;
    }

    window.localStorage.setItem("tc_match_draft", generated.optimized_job_description);
    window.location.href = "/match";
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Smart JD Generator"
        title="Create matching-ready job descriptions in the same light product system"
        description="Turn a short hiring brief into a structured JD with required skills, preferred skills, optimized matching text, and optional salary guidance."
      />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-orange-600" />
              JD history
            </CardTitle>
            <CardDescription>Recent generated outputs saved in this browser session.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[700px] space-y-3 overflow-y-auto pr-1">
              {history.length === 0 ? (
                <p className="text-sm leading-7 text-slate-600">Generated JDs will appear here after your first successful run.</p>
              ) : (
                history.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setGenerated(item)}
                    className="w-full rounded-[24px] border border-slate-200 bg-white p-4 text-left transition hover:border-orange-200 hover:bg-orange-50/60"
                  >
                    <p className="line-clamp-1 text-sm font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{item.role_brief}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">{formatDate(item.created_at)}</p>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Generator input</CardTitle>
              <CardDescription>Provide the recruiter brief and set the generation options.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Textarea
                value={roleBrief}
                onChange={(event) => setRoleBrief(event.target.value)}
                placeholder="Backend engineer for a fintech startup"
                className="min-h-[180px]"
              />

              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-2 text-sm text-slate-600">
                  <span>Seniority</span>
                  <select
                    value={seniority}
                    onChange={(event) => setSeniority(event.target.value)}
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950"
                  >
                    <option>Junior</option>
                    <option>Mid-level</option>
                    <option>Senior</option>
                    <option>Lead</option>
                  </select>
                </label>

                <label className="grid gap-2 text-sm text-slate-600">
                  <span>Industry</span>
                  <select
                    value={industry}
                    onChange={(event) => setIndustry(event.target.value)}
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950"
                  >
                    <option>Fintech</option>
                    <option>SaaS</option>
                    <option>Healthcare</option>
                    <option>E-commerce</option>
                  </select>
                </label>

                <label className="grid gap-2 text-sm text-slate-600">
                  <span>Work model</span>
                  <select
                    value={workModel}
                    onChange={(event) => setWorkModel(event.target.value)}
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950"
                  >
                    <option>Remote</option>
                    <option>Hybrid</option>
                    <option>Onsite</option>
                  </select>
                </label>
              </div>

              <label className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={includeSalary}
                  onChange={(event) => setIncludeSalary(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-orange-500"
                />
                Include salary suggestion
              </label>

              <Button onClick={runGenerator} disabled={loading || !roleBrief.trim()}>
                <WandSparkles className="h-4 w-4" />
                {loading ? "Generating..." : "Generate JD"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Generated output</CardTitle>
                  <CardDescription>Structured JD output ready for review, copy, export, or matching.</CardDescription>
                </div>
                {generated ? <Badge className="normal-case tracking-normal">Ready</Badge> : null}
              </div>
            </CardHeader>
            <CardContent>
              {!generated ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm leading-7 text-slate-600">
                  Run the generator to populate the structured JD output panel.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-2xl font-semibold text-slate-950">{generated.title}</p>
                      <p className="mt-2 text-sm text-slate-500">
                        {generated.seniority} • {generated.industry} • {generated.work_model} • {generated.employment_type}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="secondary" onClick={() => navigator.clipboard.writeText(generated.optimized_job_description).then(() => toast.success("Copied to clipboard"))}>
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                      <Button variant="outline" onClick={useForMatching}>
                        <Sparkles className="h-4 w-4" />
                        Use for matching
                      </Button>
                      <Button variant="outline" onClick={() => exportHtmlToPrintWindow(generated.title, printableText)}>
                        <FileText className="h-4 w-4" />
                        Export PDF
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Role summary</p>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{generated.role_summary}</p>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Required skills</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {generated.required_skills.map((skill) => (
                          <Badge key={skill} className="normal-case tracking-normal">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Preferred skills</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {generated.preferred_skills.map((skill) => (
                          <Badge key={skill} variant="outline" className="normal-case tracking-normal">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1fr,0.8fr]">
                    <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Responsibilities</p>
                      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
                        {generated.responsibilities.map((item) => (
                          <p key={item}>• {item}</p>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Optimized keywords</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {generated.matching_keywords.map((keyword) => (
                          <Badge key={keyword} variant="secondary" className="normal-case tracking-normal">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-orange-100 bg-orange-50/60 p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Optimized job description</p>
                    <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
                      {generated.optimized_job_description}
                    </p>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Minimum experience</p>
                      <p className="mt-3 text-lg font-semibold text-slate-950">{generated.min_experience} years</p>
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Education</p>
                      <p className="mt-3 text-lg font-semibold text-slate-950">{generated.education_required}</p>
                    </div>
                  </div>

                  {generated.salary_suggestion ? (
                    <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Salary suggestion</p>
                      <p className="mt-3 text-lg font-semibold text-slate-950">
                        {generated.salary_suggestion.currency} {generated.salary_suggestion.min_amount ?? ""} - {generated.salary_suggestion.max_amount ?? ""} {generated.salary_suggestion.period}
                      </p>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{generated.salary_suggestion.rationale}</p>
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
