"use client";

import { useEffect, useState } from "react";
import { BellRing, KeyRound, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
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
  const { recruiter } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        const candidates = await listCandidates();
        setUploads(candidates.length);
      } catch {
        // ignore settings surface load failures
      }
    };

    void load();
  }, []);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Settings"
        title="Manage account, usage, and workspace controls in the same light system"
        description="Profile information, usage visibility, notifications, and sensitive actions are grouped into one cleaner settings surface."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Profile settings</CardTitle>
            <CardDescription>Update the visible recruiter identity used across the workspace shell.</CardDescription>
          </CardHeader>
          <CardContent key={recruiter?.id ?? "anonymous"} className="grid gap-4 md:grid-cols-2">
            <Input
              defaultValue={recruiter?.full_name?.split(" ").slice(0, -1).join(" ") || recruiter?.full_name || ""}
              placeholder="First name"
            />
            <Input
              defaultValue={recruiter?.full_name?.split(" ").slice(-1).join(" ") || ""}
              placeholder="Last name"
            />
            <Input defaultValue={recruiter?.email || ""} placeholder="Email" className="md:col-span-2" />
            <Button onClick={() => toast.success("Profile settings saved")}>Save profile</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Current plan</CardTitle>
                <CardDescription>Usage visibility and plan actions for the active workspace.</CardDescription>
              </div>
              <Badge variant="teal">Growth</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <UsageMeter label="CV uploads" used={uploads} total={300} />
            <UsageMeter label="AI chat usage" used={chatQueries} total={1000} />
            <UsageMeter label="Smart JD generator" used={generatedJds} total={20} />
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
              Unlimited recruiter seats are not part of this workspace yet. Upgrade if you need higher volume or enterprise controls.
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => toast.success("Upgrade flow opened")}>Upgrade</Button>
              <Button variant="secondary" onClick={() => toast.success("Downgrade options opened")}>
                Downgrade
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-orange-600" />
              API key management
            </CardTitle>
            <CardDescription>Manage the workspace key used for integrations and automation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input value="tc_live_**************************" readOnly />
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => toast.success("API key rotated")}>Rotate key</Button>
              <Button variant="outline" onClick={() => toast.success("API key copied")}>Copy key</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-orange-600" />
              Notification preferences
            </CardTitle>
            <CardDescription>Control how recruiter updates and alerts are surfaced.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              "Email me when upload batches complete",
              "Show alerts when JD matching finishes",
              "Receive warnings when usage gets close to limits"
            ].map((label) => (
              <label key={label} className="flex items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <span>{label}</span>
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 accent-orange-500" />
              </label>
            ))}
            <Button variant="secondary" onClick={() => toast.success("Notification preferences saved")}>
              Save preferences
            </Button>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-600">
              <ShieldAlert className="h-4 w-4" />
              Danger zone
            </CardTitle>
            <CardDescription>Destructive actions should stay deliberate and explicit.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 rounded-b-[28px] bg-rose-50/60 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-950">Delete account</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Permanently remove this recruiter account and revoke access to the workspace.
              </p>
            </div>
            <Button variant="destructive" onClick={() => toast.error("Account deletion requires a protected confirmation flow") }>
              Delete account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
