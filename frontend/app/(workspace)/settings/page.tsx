"use client";

import { useEffect, useState } from "react";
import { BellRing, KeyRound, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { UsageMeter } from "@/components/common/usage-meter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listCandidates } from "@/lib/api/client";
import { useStoredNumber } from "@/lib/storage";

export default function SettingsPage() {
  const [uploads, setUploads] = useState(0);
  const chatQueries = useStoredNumber("tc_chat_queries_used");
  const generatedJds = useStoredNumber("tc_generated_jds");

  useEffect(() => {
    const load = async () => {
      try {
        const candidates = await listCandidates();
        setUploads(candidates.length);
      } catch {
        // ignore in settings surface
      }
    };

    load();
  }, []);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Settings"
        title="Manage account, plan, and workspace controls"
        description="Review your current plan, monitor usage, rotate API credentials, and configure how recruiters receive platform notifications."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Profile settings</CardTitle>
            <CardDescription>Update the visible profile identity used across the workspace shell.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Input defaultValue="Mariam" placeholder="First name" />
            <Input defaultValue="Haddad" placeholder="Last name" />
            <Input defaultValue="mariam@talentcore.ai" placeholder="Email" className="md:col-span-2" />
            <Button onClick={() => toast.success("Profile settings saved")}>Save profile</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current plan</CardTitle>
                <CardDescription>Growth plan usage and upgrade controls.</CardDescription>
              </div>
              <Badge variant="teal">Growth</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <UsageMeter label="CV uploads" used={uploads} total={300} />
            <UsageMeter label="Smart JD Generator" used={generatedJds} total={20} />
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
              Unlimited AI chat is active. Current usage: <span className="text-white">{chatQueries}</span> queries.
            </div>
            <div className="flex gap-2">
              <Button onClick={() => toast.success("Upgrade flow opened")}>Upgrade</Button>
              <Button variant="outline" onClick={() => toast.success("Downgrade options opened")}>Downgrade</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              API key management
            </CardTitle>
            <CardDescription>Manage the workspace key used for external integrations and automation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input value="tc_live_**************************" readOnly />
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => toast.success("API key rotated")}>Rotate key</Button>
              <Button variant="outline" onClick={() => toast.success("API key copied")}>Copy key</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-[#00D4AA]" />
              Notification preferences
            </CardTitle>
            <CardDescription>Choose which recruiter notifications surface inside the workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-white/70">
            {["Upload completion alerts", "Matching completion toasts", "Weekly usage digest", "Security alerts"].map((label, index) => (
              <label key={label} className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3">
                <span>{label}</span>
                <input type="checkbox" defaultChecked={index < 3} className="h-4 w-4 rounded accent-[#6C63FF]" />
              </label>
            ))}
            <Button onClick={() => toast.success("Notification preferences saved")}>Save preferences</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-300">
            <ShieldAlert className="h-4 w-4" />
            Danger zone
          </CardTitle>
          <CardDescription>Permanent account actions should be hard to trigger and impossible to miss.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-white/58">Delete the workspace account, revoke access, and remove all connected recruiter settings.</p>
          <Button variant="destructive" onClick={() => toast.error("Account deletion is disabled in demo mode")}>Delete account</Button>
        </CardContent>
      </Card>
    </div>
  );
}
