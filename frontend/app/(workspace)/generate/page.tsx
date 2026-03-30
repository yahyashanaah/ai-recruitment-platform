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
import { incrementStoredNumber } from "@/lib/storage";
import type { SmartJDResponse } from "@/lib/api/types";
import { exportHtmlToPrintWindow } from "@/lib/utils";

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
      "",
      generated.optimized_job_description,
      "",
      `Required skills: ${generated.required_skills.join(", ")}`,
      `Preferred skills: ${generated.preferred_skills.join(", ")}`,
      `Matching keywords: ${generated.matching_keywords.join(", ")}`
    ].join("\n");
  }, [generated]);

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Generator"
          title="Create matching-optimized job descriptions"
          description="Start from a short brief, then let TalentCore generate structured recruiter copy, hiring signals, and search keywords."
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              JD history
            </CardTitle>
            <CardDescription>Previously generated JDs stored in this browser.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {history.length === 0 ? (
              <p className="text-sm text-white/48">No generated JDs yet.</p>
            ) : (
              history.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setGenerated(item);
                    setRoleBrief(item.role_brief);
                    setSeniority(item.seniority || "Mid-level");
                    setIndustry(item.industry || "Fintech");
                    setWorkModel(item.work_model || "Remote");
                  }}
                  className="w-full rounded-[22px] border border-white/10 bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.05]"
                >
                  <p className="font-medium text-white">{item.title || item.role_brief}</p>
                  <p className="mt-1 text-xs text-white/42">{item.created_at}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Generate a Smart JD</CardTitle>
            <CardDescription>Use the options panel to give the generator more context before creating recruiter-ready output.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Textarea value={roleBrief} onChange={(event) => setRoleBrief(event.target.value)} placeholder="Backend engineer for a fintech startup" className="min-h-32" />
            <div className="grid gap-4 md:grid-cols-3">
              <select value={seniority} onChange={(event) => setSeniority(event.target.value)} className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white">
                <option className="bg-[#0f1218]">Junior</option>
                <option className="bg-[#0f1218]">Mid-level</option>
                <option className="bg-[#0f1218]">Senior</option>
                <option className="bg-[#0f1218]">Lead</option>
              </select>
              <select value={industry} onChange={(event) => setIndustry(event.target.value)} className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white">
                <option className="bg-[#0f1218]">Fintech</option>
                <option className="bg-[#0f1218]">SaaS</option>
                <option className="bg-[#0f1218]">Healthtech</option>
                <option className="bg-[#0f1218]">E-commerce</option>
              </select>
              <select value={workModel} onChange={(event) => setWorkModel(event.target.value)} className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white">
                <option className="bg-[#0f1218]">Remote</option>
                <option className="bg-[#0f1218]">Hybrid</option>
                <option className="bg-[#0f1218]">Onsite</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input type="checkbox" checked={includeSalary} onChange={(event) => setIncludeSalary(event.target.checked)} className="h-4 w-4 rounded accent-[#6C63FF]" />
              Show salary suggestion
            </label>
            <Button onClick={runGenerator} disabled={!roleBrief.trim() || loading}>
              {loading ? "Generating JD..." : "Generate JD"}
              <WandSparkles className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {generated && (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>{generated.title}</CardTitle>
                  <CardDescription>{generated.role_summary}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={async () => {
                    await navigator.clipboard.writeText(generated.optimized_job_description);
                    toast.success("JD copied to clipboard");
                  }}>
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                  <Button variant="secondary" onClick={() => {
                    window.localStorage.setItem("tc_match_draft", generated.optimized_job_description);
                    window.location.href = "/match";
                  }}>
                    <Sparkles className="h-4 w-4" />
                    Use for Matching
                  </Button>
                  <Button variant="outline" onClick={() => exportHtmlToPrintWindow("TalentCore Smart JD", printableText)}>
                    <FileText className="h-4 w-4" />
                    Export PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/35">Required skills</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {generated.required_skills.map((skill) => (
                      <Badge key={skill} variant="teal">{skill}</Badge>
                    ))}
                  </div>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/35">Preferred skills</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {generated.preferred_skills.map((skill) => (
                      <Badge key={skill} variant="outline">{skill}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/35">Optimized keywords</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {generated.matching_keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary">{keyword}</Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-white/72 whitespace-pre-line">
                {generated.optimized_job_description}
              </div>

              {generated.salary_suggestion && (
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/35">Salary suggestion</p>
                  <p className="mt-3 text-white">
                    {generated.salary_suggestion.currency} {generated.salary_suggestion.min_amount ?? "N/A"} - {generated.salary_suggestion.max_amount ?? "N/A"} per {generated.salary_suggestion.period}
                  </p>
                  <p className="mt-2 text-sm text-white/52">{generated.salary_suggestion.rationale}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
