"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BriefcaseBusiness,
  ChevronRight,
  FileText,
  Linkedin,
  MessageSquareText,
  Sparkles,
  Twitter,
  WandSparkles,
} from "lucide-react";

import { ChatPreview } from "@/components/marketing/chat-preview";
import { PricingCard } from "@/components/marketing/pricing-card";
import { SectionHeading } from "@/components/marketing/section-heading";
import { useAuth } from "@/components/providers/auth-provider";

const painPoints = [
  {
    title: "Manual screening slows hiring",
    description:
      "Recruiters spend too much time opening CVs, extracting basics, and comparing profiles by hand.",
  },
  {
    title: "Candidate data lives in scattered tools",
    description:
      "Profile details, notes, resume content, and matching signals are often disconnected from each other.",
  },
  {
    title: "Matching is subjective and inconsistent",
    description:
      "Teams struggle to explain why one candidate fits better than another, especially at scale.",
  },
];

const solutions = [
  {
    title: "Automate intake",
    description:
      "Upload resumes once and turn them into structured candidate profiles with searchable context.",
  },
  {
    title: "Search by conversation",
    description:
      "Ask for skills, job fit, and recruiter insights in natural language instead of scanning files manually.",
  },
  {
    title: "Rank with transparency",
    description:
      "Compare candidates against real job descriptions with score breakdowns and reasoning.",
  },
];

const features = [
  {
    icon: FileText,
    title: "Resume parsing",
    description:
      "Extract candidate details, contact information, skills, education, and certifications from uploaded CVs.",
  },
  {
    icon: BriefcaseBusiness,
    title: "AI matching",
    description:
      "Rank candidates against job descriptions using semantic retrieval and weighted scoring.",
  },
  {
    icon: MessageSquareText,
    title: "Chat-based search",
    description:
      "Ask the platform direct recruiting questions and receive streamed, source-aware answers.",
  },
  {
    icon: WandSparkles,
    title: "Job description generator",
    description:
      "Turn a short hiring brief into a structured, recruiter-ready job description.",
  },
];

const pricingPlans = [
  {
    title: "Starter",
    price: "Free",
    description: "For solo recruiters testing AI-assisted hiring workflows.",
    features: [
      "Resume upload and parsing",
      "Basic candidate review",
      "Limited AI chat usage",
      "Single recruiter seat",
    ],
    ctaLabel: "Get Started",
    ctaHref: "/signup",
  },
  {
    title: "Pro",
    price: "$149/mo",
    description:
      "For recruiters and small teams who need matching, chat, and workflow speed.",
    features: [
      "Unlimited AI chat",
      "JD matching with score breakdown",
      "Smart JD Generator",
      "Multi-candidate workflow management",
    ],
    ctaLabel: "Start Pro",
    ctaHref: "/signup",
    featured: true,
  },
  {
    title: "Enterprise",
    price: "Custom",
    description:
      "For larger hiring teams needing scale, controls, and integrations.",
    features: [
      "Custom onboarding",
      "Advanced support",
      "Private deployment options",
      "Integration planning",
    ],
    ctaLabel: "Talk to Sales",
    ctaHref: "mailto:support@sefarai.com",
  },
];

const faqs = [
  {
    question: "Do I need to change my hiring process to use AI Recruiter?",
    answer:
      "No. The platform is designed to sit on top of your current sourcing and screening workflow, not replace it.",
  },
  {
    question: "Can recruiters search candidates using natural language?",
    answer:
      "Yes. Recruiters can ask the system questions about skills, experience, location, and fit using chat-based search.",
  },
  {
    question: "How does candidate matching work?",
    answer:
      "The backend parses the job description, retrieves relevant candidate chunks semantically, and scores candidates using skills, experience, education, and certifications.",
  },
  {
    question: "Is recruiter data isolated?",
    answer:
      "Yes. Authentication uses Supabase Auth and recruiter data is scoped with row-level security and recruiter-specific access control.",
  },
];

export default function LandingPage() {
  const { session } = useAuth();
  const primaryHref = session ? "/dashboard" : "/signup";
  const primaryLabel = session ? "Open Workspace" : "Get Started";

  return (
    <div className="marketing-shell min-h-screen">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-[0_14px_28px_rgba(249,115,22,0.24)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-slate-950">
                AI Recruiter
              </p>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Recruitment Intelligence
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <Link href="#features" className="transition hover:text-slate-950">
              Features
            </Link>
            <Link href="#pricing" className="transition hover:text-slate-950">
              Pricing
            </Link>
            <Link href="#faq" className="transition hover:text-slate-950">
              FAQ
            </Link>
            <Link href="/login" className="transition hover:text-slate-950">
              Login
            </Link>
          </nav>

          <Link
            href={primaryHref}
            className="marketing-primary-btn inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-medium transition-all"
          >
            {primaryLabel}
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-6 pb-20 pt-16 lg:px-8 lg:pb-24 lg:pt-24">
          <div className="grid gap-14 lg:grid-cols-[1.05fr,0.95fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="marketing-pill inline-flex rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]">
                AI-powered hiring workflow
              </span>

              <h1 className="mt-6 max-w-3xl text-balance text-5xl font-semibold tracking-tight text-slate-950 md:text-7xl">
                Hire Smarter with AI
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Automate resume intake, search candidates through conversation,
                and match job descriptions faster with a clean recruiter-focused
                workflow.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link
                  href={primaryHref}
                  className="marketing-primary-btn inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-medium transition-all"
                >
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="#demo"
                  className="marketing-secondary-btn inline-flex h-12 items-center justify-center rounded-2xl px-6 text-sm font-medium transition-all"
                >
                  See Demo
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
            >
              <ChatPreview />
            </motion.div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <SectionHeading
            eyebrow="The Problem"
            title="Recruiting breaks when too much work depends on manual review."
            description="High-volume hiring becomes slow, inconsistent, and hard to explain when recruiters jump between CVs, spreadsheets, and disconnected notes."
          />

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {painPoints.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className="marketing-card rounded-[28px] p-6"
              >
                <p className="text-lg font-semibold text-slate-950">
                  {item.title}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200/70 bg-orange-50/40">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
            <SectionHeading
              eyebrow="The Solution"
              title="An AI assistant that helps recruiters move from resumes to decisions faster."
              description="AI Recruiter keeps candidate context, structured profile data, recruiter chat, and job-fit reasoning connected in one flow."
            />

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {solutions.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: index * 0.06 }}
                  className="marketing-card rounded-[28px] p-6"
                >
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-[0_12px_24px_rgba(249,115,22,0.22)]">
                    <ChevronRight className="h-5 w-5" />
                  </div>
                  <p className="mt-5 text-lg font-semibold text-slate-950">
                    {item.title}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {item.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <SectionHeading
            eyebrow="Features"
            title="Built around the core actions recruiters perform every day."
            description="Everything is designed to reduce friction: upload resumes, understand candidates quickly, search by conversation, and match talent to roles."
          />

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.42, delay: index * 0.05 }}
                  className="marketing-card rounded-[28px] p-6"
                >
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-orange-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-5 text-lg font-semibold text-slate-950">
                    {feature.title}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section id="demo" className="border-y border-slate-200/70 bg-white/70">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
            <SectionHeading
              eyebrow="Product Demo"
              title="A product surface designed to keep recruiting work in one place."
              description="The platform combines intake, candidate review, recruiter chat, and matching without forcing users through cluttered dashboards."
            />

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45 }}
              className="marketing-card mt-12 overflow-hidden rounded-[32px] p-4 md:p-6"
            >
              <div className="grid gap-4 lg:grid-cols-[220px,1fr]">
                <div className="rounded-[24px] bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Workspace
                  </p>
                  <div className="mt-4 space-y-3">
                    {[
                      "Document Intake",
                      "Candidates",
                      "AI Chat",
                      "JD Matching",
                    ].map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-[1.1fr,0.9fr]">
                    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Candidate View
                      </p>
                      <p className="mt-3 text-lg font-semibold text-slate-950">
                        Frontend Engineer
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {["React", "Next.js", "TypeScript", "Figma"].map(
                          (skill) => (
                            <span
                              key={skill}
                              className="rounded-full bg-orange-50 px-3 py-1 text-sm text-orange-700"
                            >
                              {skill}
                            </span>
                          ),
                        )}
                      </div>
                      <div className="mt-5 space-y-3 text-sm text-slate-600">
                        <p>Current position: Senior Frontend Engineer</p>
                        <p>Location: Dubai, UAE</p>
                        <p>Experience: 6 years</p>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
                        Match Summary
                      </p>
                      <p className="mt-3 text-3xl font-semibold">89%</p>
                      <div className="mt-5 space-y-3 text-sm text-white/72">
                        <p>Strong React and Next.js overlap</p>
                        <p>Meets frontend experience target</p>
                        <p>Good fit for product-led teams</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      AI Assistant
                    </p>
                    <div className="mt-4 grid gap-3 md:grid-cols-[0.4fr,0.6fr]">
                      <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                        Find me a frontend developer with product experience
                      </div>
                      <div className="rounded-2xl bg-orange-50 px-4 py-3 text-sm text-slate-700">
                        I found strong matches with React, Next.js, and
                        product-led experience. Two candidates also have fintech
                        background.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <SectionHeading
            eyebrow="Pricing"
            title="Simple plans for growing recruiting teams."
            description="Start lean, upgrade when you need more automation, and move to enterprise support when scale or compliance demands it."
            align="center"
          />

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <PricingCard key={plan.title} {...plan} />
            ))}
          </div>
        </section>

        <section id="faq" className="border-y border-slate-200/70 bg-white/75">
          <div className="mx-auto max-w-5xl px-6 py-20 lg:px-8">
            <SectionHeading
              eyebrow="FAQ"
              title="Answering the questions buyers usually ask before switching workflows."
              description="Keep the product story clear, practical, and grounded in how recruiter teams actually work."
              align="center"
            />

            <div className="mt-12 space-y-4">
              {faqs.map((item) => (
                <details
                  key={item.question}
                  className="marketing-card rounded-[24px] p-6"
                >
                  <summary className="cursor-pointer list-none text-lg font-semibold text-slate-950">
                    {item.question}
                  </summary>
                  <p className="mt-4 pr-6 text-sm leading-7 text-slate-600">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="marketing-card overflow-hidden rounded-[32px] bg-gradient-to-br from-white to-orange-50 p-8 md:p-10">
            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <span className="marketing-pill inline-flex rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em]">
                  Final CTA
                </span>
                <h3 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                  Build a faster, clearer recruiting workflow with AI.
                </h3>
                <p className="mt-5 text-base leading-8 text-slate-600">
                  Bring resume intake, candidate search, AI chat, and job
                  matching into one focused product.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={primaryHref}
                  className="marketing-primary-btn inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-medium transition-all"
                >
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="marketing-secondary-btn inline-flex h-12 items-center justify-center rounded-2xl px-6 text-sm font-medium transition-all"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.2fr,1fr,1fr,1fr]">
            <div>
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-[0_14px_28px_rgba(249,115,22,0.22)]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-semibold tracking-tight text-slate-950">
                    AI Recruiter
                  </p>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Recruitment Intelligence
                  </p>
                </div>
              </div>
              <p className="mt-5 max-w-sm text-sm leading-7 text-slate-600">
                AI-powered recruiting workflows for resume intake, candidate
                intelligence, recruiter chat, and transparent job matching.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-950">Product</p>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <Link
                  href="#features"
                  className="block transition hover:text-slate-950"
                >
                  Features
                </Link>
                <Link
                  href="#pricing"
                  className="block transition hover:text-slate-950"
                >
                  Pricing
                </Link>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-950">Company</p>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <Link
                  href="#demo"
                  className="block transition hover:text-slate-950"
                >
                  About
                </Link>
                <a
                  href="mailto:support@sefarai.com"
                  className="block transition hover:text-slate-950"
                >
                  Contact
                </a>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-950">Resources</p>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <Link
                  href="/login"
                  className="block transition hover:text-slate-950"
                >
                  Docs
                </Link>
                <Link
                  href="#faq"
                  className="block transition hover:text-slate-950"
                >
                  Blog
                </Link>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <a
                  href="https://www.linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                  aria-label="Twitter"
                >
                  <Twitter className="h-4 w-4" />
                </a>
              </div>

              <div className="mt-6 text-sm text-slate-600">
                <p>support@sefarai.com</p>
                <p className="mt-2">Sharjah, UAE</p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
            <p>© 2026 SefarAi. All rights reserved.</p>
            <p>Accelerating Intelligence.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
