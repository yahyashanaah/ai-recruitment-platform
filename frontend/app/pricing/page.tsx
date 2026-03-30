"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const plans = [
  {
    name: "Starter",
    monthlyPrice: 49,
    target: "Solo recruiters",
    features: [
      "Up to 50 CV uploads/month",
      "AI chat (100 queries/month)",
      "Basic JD matching (top 5 candidates)",
      "1 seat"
    ],
    cta: "Start Starter"
  },
  {
    name: "Growth",
    monthlyPrice: 149,
    target: "Small agencies (up to 5 seats)",
    featured: true,
    features: [
      "Up to 300 CV uploads/month",
      "Unlimited AI chat queries",
      "Full JD matching + scoring breakdown",
      "Smart JD Generator (20 JDs/month)",
      "5 seats",
      "Priority support"
    ],
    cta: "Choose Growth"
  },
  {
    name: "Enterprise",
    monthlyPrice: 499,
    target: "Large HR teams, unlimited seats",
    features: [
      "Unlimited CV uploads",
      "Unlimited everything",
      "API access",
      "Custom integrations (ATS, Slack, LinkedIn)",
      "Smart JD Generator (unlimited)",
      "Dedicated account manager",
      "SSO + advanced security",
      "SLA guarantee"
    ],
    cta: "Talk to Sales"
  }
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  const renderedPlans = useMemo(
    () =>
      plans.map((plan) => ({
        ...plan,
        price: annual ? Math.round(plan.monthlyPrice * 12 * 0.8) : plan.monthlyPrice,
        suffix: annual ? "/yr" : "/mo"
      })),
    [annual]
  );

  return (
    <div className="min-h-screen px-6 py-10 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-white/35">Pricing</p>
            <h1 className="font-display mt-4 text-5xl font-semibold text-white">Simple SaaS pricing for serious recruitment teams.</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-white/58">
              Start lean, scale to agency workflows, or move into enterprise-grade integrations and controls.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] p-2">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={`rounded-full px-4 py-2 text-sm transition ${annual ? "text-white/55" : "bg-white text-[#0a0b0d]"}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={`rounded-full px-4 py-2 text-sm transition ${annual ? "bg-white text-[#0a0b0d]" : "text-white/55"}`}
            >
              Annual
            </button>
            <Badge variant="teal">20% off</Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {renderedPlans.map((plan) => (
            <Card key={plan.name} className={plan.featured ? "glow-border" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription className="mt-2">{plan.target}</CardDescription>
                  </div>
                  {plan.featured && <Badge variant="teal">Most Popular</Badge>}
                </div>
                <div className="mt-6 flex items-end gap-2">
                  <span className="font-display text-5xl font-semibold text-white">${plan.price}</span>
                  <span className="pb-1 text-sm text-white/46">{plan.suffix}</span>
                </div>
              </CardHeader>
              <CardContent className="flex h-full flex-col gap-6">
                <div className="space-y-3 text-sm text-white/72">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <div className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-white/[0.05] text-[#00D4AA]">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-auto pt-2">
                  {plan.name === "Enterprise" ? (
                    <Button asChild variant="secondary" className="w-full">
                      <Link href="/dashboard">{plan.cta}</Link>
                    </Button>
                  ) : (
                    <Button asChild className="w-full">
                      <Link href="/dashboard">{plan.cta}</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="glass-panel mt-10 flex flex-wrap items-center justify-between gap-4 rounded-[28px] p-6">
          <div>
            <p className="font-display text-2xl text-white">Need custom procurement, data residency, or ATS integration support?</p>
            <p className="mt-2 text-sm text-white/55">Enterprise buyers usually need deployment planning, SSO, and legal review. We support that path.</p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/dashboard" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Book Enterprise Demo
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
