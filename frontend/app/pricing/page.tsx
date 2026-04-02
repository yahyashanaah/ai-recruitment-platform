"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const plans = [
  {
    name: "Starter",
    monthlyPrice: 49,
    target: "Solo recruiters",
    description:
      "For individual recruiters building an AI-assisted hiring workflow.",
    features: [
      "Up to 50 CV uploads/month",
      "AI chat (100 queries/month)",
      "Basic JD matching (top 5 candidates)",
      "1 seat",
    ],
    cta: "Start Starter",
  },
  {
    name: "Growth",
    monthlyPrice: 149,
    target: "Small agencies (up to 5 seats)",
    description:
      "For recruiting teams that need faster shortlists and clearer matching decisions.",
    featured: true,
    features: [
      "Up to 300 CV uploads/month",
      "Unlimited AI chat queries",
      "Full JD matching + scoring breakdown",
      "Smart JD Generator (20 JDs/month)",
      "5 seats",
      "Priority support",
    ],
    cta: "Choose Growth",
  },
  {
    name: "Enterprise",
    monthlyPrice: 499,
    target: "Large HR teams, unlimited seats",
    description:
      "For high-volume hiring teams that need integrations, controls, and procurement support.",
    features: [
      "Unlimited CV uploads",
      "Unlimited everything",
      "API access",
      "Custom integrations (ATS, Slack, LinkedIn)",
      "Smart JD Generator (unlimited)",
      "Dedicated account manager",
      "SSO + advanced security",
      "SLA guarantee",
    ],
    cta: "Talk to Sales",
  },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  const renderedPlans = useMemo(
    () =>
      plans.map((plan) => ({
        ...plan,
        price: annual
          ? Math.round(plan.monthlyPrice * 12 * 0.8)
          : plan.monthlyPrice,
        suffix: annual ? "/yr" : "/mo",
      })),
    [annual],
  );

  return (
    <div className="marketing-shell min-h-screen px-6 py-10 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-[0_14px_28px_rgba(249,115,22,0.22)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold tracking-tight text-slate-950">
                AI Recruiter
              </p>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                Recruitment Intelligence
              </p>
            </div>
          </Link>

          <Link
            href="/signup"
            className="inline-flex items-center gap-2 text-sm font-medium text-orange-600 transition hover:text-orange-700"
          >
            Start free trial
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-14 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge>Pricing</Badge>
            <h1 className="font-display mt-5 text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
              Simple pricing for recruiters who want faster, cleaner hiring
              workflows.
            </h1>
            <p className="mt-5 text-base leading-8 text-slate-600">
              Choose a plan that fits your current hiring volume, then scale
              into deeper matching, automation, and enterprise controls as your
              recruiting workflow grows.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white p-2 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${annual ? "text-slate-500" : "bg-orange-500 text-white shadow-[0_12px_24px_rgba(249,115,22,0.22)]"}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${annual ? "bg-orange-500 text-white shadow-[0_12px_24px_rgba(249,115,22,0.22)]" : "text-slate-500"}`}
            >
              Annual
            </button>
            <Badge variant="teal">20% off</Badge>
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {renderedPlans.map((plan) => (
            <Card
              key={plan.name}
              className={
                plan.featured
                  ? "border-orange-200 shadow-[0_18px_40px_rgba(249,115,22,0.12)]"
                  : undefined
              }
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription className="mt-2">
                      {plan.target}
                    </CardDescription>
                  </div>
                  {plan.featured ? <Badge>Most popular</Badge> : null}
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {plan.description}
                </p>
                <div className="mt-6 flex items-end gap-2">
                  <span className="font-display text-5xl font-semibold text-slate-950">
                    ${plan.price}
                  </span>
                  <span className="pb-1 text-sm text-slate-400">
                    {plan.suffix}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex h-full flex-col gap-6">
                <div className="space-y-3 text-sm text-slate-700">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <div className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-orange-50 text-orange-600">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-auto pt-2">
                  {plan.name === "Enterprise" ? (
                    <Button asChild variant="secondary" className="w-full">
                      <Link href="mailto:support@sefarai.com">{plan.cta}</Link>
                    </Button>
                  ) : (
                    <Button asChild className="w-full">
                      <Link href="/signup">{plan.cta}</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-10 bg-gradient-to-br from-white to-orange-50/70">
          <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-display text-2xl font-semibold text-slate-950">
                Need custom procurement, data residency, or ATS integration
                support?
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Enterprise buyers usually need deployment planning, SSO, and
                legal review. We support that path with a guided onboarding
                flow.
              </p>
            </div>
            <Button asChild variant="secondary">
              <Link href="mailto:support@sefarai.com" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Talk to sales
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
