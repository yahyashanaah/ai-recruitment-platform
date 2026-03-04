"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  FileBadge2,
  Files,
  Gauge,
  ScanSearch,
  ShieldCheck
} from "lucide-react";

import { AnimatedCounter } from "@/components/common/animated-counter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

const stats = [
  { label: "Automated CV Pipelines", value: 24, suffix: "/7" },
  { label: "RAG Precision Context", value: 96, suffix: "%" },
  { label: "Avg. Screening Time Saved", value: 72, suffix: "%" }
];

const modules = [
  {
    title: "Document Intelligence",
    icon: Files,
    description: "Upload CV batches, parse structured profiles, and index semantic chunks for instant retrieval."
  },
  {
    title: "Recruiter Copilot Chat",
    icon: Bot,
    description: "Ask contextual questions and receive streaming grounded responses with transparent source citations."
  },
  {
    title: "JD Match Engine",
    icon: ScanSearch,
    description: "Analyze job descriptions and rank top-fit candidates with weighted scoring and explicit reasoning."
  },
  {
    title: "Candidate 360 View",
    icon: FileBadge2,
    description: "Manage profiles, inspect extraction details, and remove stale records from SQLite and FAISS."
  }
];

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-orange-50 via-white to-orange-100/60">
        <CardContent className="relative p-7 md:p-9">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-5"
          >
            <Badge variant="warning" className="w-fit">
              AI Recruitment Intelligence Platform
            </Badge>
            <h1 className="max-w-4xl text-3xl font-semibold tracking-tight md:text-5xl">
              Built for recruiters who need speed, confidence, and full context in every hiring decision.
            </h1>
            <p className="max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
              This SaaS workspace connects directly to your FastAPI backend to orchestrate CV ingestion,
              streaming RAG conversations, and JD-to-candidate matching in one premium control plane.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild>
                <Link href="/upload" className="gap-2">
                  Start with Upload
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/chat">Open Recruiter Chat</Link>
              </Button>
            </div>
          </motion.div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <Card className="h-full border-orange-200/70 bg-white/90 shadow-premium">
              <CardContent className="space-y-3 p-5">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-3xl font-semibold tracking-tight text-primary">
                  <AnimatedCounter value={item.value} suffix={item.suffix} />
                </p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-orange-100">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, item.value)}%` }}
                    transition={{ duration: 1, delay: index * 0.1 + 0.2 }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/70 bg-white/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Gauge className="h-5 w-5 text-primary" />
              What This Platform Serves Recruiters For
            </CardTitle>
            <CardDescription>
              One enterprise workflow from unstructured resumes to decision-ready shortlist recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {modules.map((module, idx) => {
              const Icon = module.icon;
              return (
                <motion.div
                  key={module.title}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.06 }}
                  className="rounded-xl border border-border/60 bg-orange-50/40 p-4"
                >
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-primary shadow-sm">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold">{module.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
                </motion.div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-white/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Backend Connectivity
            </CardTitle>
            <CardDescription>
              Frontend pages are architected around your existing FastAPI APIs and real-time workflows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              "/api/v1/documents/upload",
              "/api/v1/chat/ask (SSE)",
              "/api/v1/match-jd",
              "/api/v1/candidates",
              "/api/v1/candidates/{candidate_id}",
              "/health"
            ].map((endpoint) => (
              <div key={endpoint} className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
                <code>{endpoint}</code>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
