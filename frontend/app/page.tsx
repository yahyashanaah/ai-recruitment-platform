"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BotMessageSquare,
  BriefcaseBusiness,
  FileText,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Workflow
} from "lucide-react";

import { AnimatedCounter } from "@/components/common/animated-counter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const metrics = [
  { label: "Recruiters onboarded", value: 500, suffix: "+" },
  { label: "Average screening time saved", value: 72, suffix: "%" },
  { label: "Candidate knowledge precision", value: 96, suffix: "%" }
];

const features = [
  {
    icon: FileText,
    title: "CV Parsing",
    description: "Transform raw resumes into structured candidate intelligence with metadata-rich semantic chunks."
  },
  {
    icon: BotMessageSquare,
    title: "AI Chat",
    description: "Ask natural questions about candidate experience and receive grounded streamed answers from your uploaded knowledge base."
  },
  {
    icon: BriefcaseBusiness,
    title: "JD Matching",
    description: "Rank the right candidates against live job descriptions with score breakdowns and transparent reasoning."
  },
  {
    icon: Sparkles,
    title: "Smart JD Generator",
    description: "Turn a short hiring brief into a structured, optimized job description recruiters can use instantly."
  },
  {
    icon: UsersRound,
    title: "Candidate Intelligence",
    description: "Filter, inspect, and manage extracted profiles without leaving the recruiter workspace."
  },
  {
    icon: Workflow,
    title: "Pipeline Management",
    description: "Coordinate intake, matching, and recruiter actions from one premium operating layer."
  }
];

const nav = [
  { href: "#features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "#platform", label: "Docs" },
  { href: "/dashboard", label: "Login" }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-white/6 bg-[#0a0b0d]/78 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[radial-gradient(circle_at_top,rgba(108,99,255,0.7),rgba(108,99,255,0.2))] text-white shadow-[0_0_36px_rgba(108,99,255,0.3)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold tracking-tight text-white">TalentCore AI</p>
              <p className="text-xs uppercase tracking-[0.24em] text-white/42">Recruitment Intelligence</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-white/65 md:flex">
            {nav.map((item) => (
              <Link key={item.label} href={item.href} className="transition hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>

          <Button asChild>
            <Link href="/dashboard">Get Started</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="hero-mesh overflow-hidden border-b border-white/6">
          <div className="mx-auto grid min-h-[calc(100vh-84px)] max-w-7xl gap-16 px-6 py-20 lg:grid-cols-[1.1fr,0.9fr] lg:px-8 lg:py-28">
            <div className="flex flex-col justify-center">
              <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
                <Badge variant="teal" className="mb-6">Trusted by 500+ recruiters at top agencies</Badge>
                <h1 className="font-display text-balance text-5xl font-semibold tracking-tight text-white md:text-7xl">
                  Your AI-Powered Recruiter. Smarter Hiring Starts Here.
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-white/62">
                  TalentCore AI gives recruiters a premium operating system for CV parsing, candidate intelligence,
                  Smart JD creation, and AI-assisted matching on top of your existing recruitment workflows.
                </p>
                <div className="mt-10 flex flex-wrap items-center gap-3">
                  <Button asChild size="lg">
                    <Link href="/dashboard" className="gap-2">
                      Start Free Trial
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="secondary" size="lg">
                    <Link href="/chat">Watch Demo</Link>
                  </Button>
                </div>
              </motion.div>
            </div>

            <div className="relative flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="glass-panel relative w-full overflow-hidden rounded-[32px] p-6 shadow-glow"
              >
                <div className="absolute left-10 top-10 h-32 w-32 rounded-full bg-primary/18 blur-3xl" />
                <div className="absolute bottom-10 right-10 h-32 w-32 rounded-full bg-[#00D4AA]/12 blur-3xl" />
                <div className="grid gap-4">
                  <div className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                    <div>
                      <p className="text-sm text-white/45">Live Intake</p>
                      <p className="mt-1 font-display text-2xl text-white">128 CVs indexed</p>
                    </div>
                    <Badge variant="teal">FAISS + SQLite</Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {metrics.map((metric, index) => (
                      <motion.div
                        key={metric.label}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 + 0.15 }}
                        className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5"
                      >
                        <p className="text-sm text-white/45">{metric.label}</p>
                        <p className="mt-4 font-display text-4xl text-white">
                          <AnimatedCounter value={metric.value} suffix={metric.suffix} />
                        </p>
                      </motion.div>
                    ))}
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-white/45">Platform signal</p>
                        <ShieldCheck className="h-4 w-4 text-[#00D4AA]" />
                      </div>
                      <p className="mt-4 max-w-lg text-sm leading-7 text-white/62">
                        Enterprise recruiters use TalentCore AI to compress hiring cycles without losing reasoning,
                        sourcing context, or auditability.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div className="mb-10 max-w-3xl">
            <p className="text-xs uppercase tracking-[0.32em] text-white/35">Platform Capabilities</p>
            <h2 className="font-display mt-4 text-4xl font-semibold text-white">Luxury-grade recruiter workflows built for serious teams.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.45, delay: index * 0.06 }}
                >
                  <Card className="h-full">
                    <CardHeader>
                      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle>{feature.title}</CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section id="platform" className="border-y border-white/6 bg-white/[0.02]">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[0.9fr,1.1fr] lg:px-8">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-white/35">Platform Surface</p>
              <h3 className="font-display mt-4 text-4xl font-semibold text-white">From document intake to shortlists, one recruiter control plane.</h3>
              <p className="mt-5 text-base leading-8 text-white/58">
                TalentCore AI combines your FastAPI backend, RAG workflows, matching engine, and Smart JD generator
                behind a dense-but-breathable enterprise interface designed for daily recruiter execution.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {["Document intake with live status", "Candidate intelligence with slide-over details", "AI chat over indexed CV chunks", "JD generator with matching keywords"].map((item) => (
                <div key={item} className="glass-panel rounded-[24px] p-5 text-sm leading-7 text-white/62">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
