"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Chrome, LoaderCircle, LogIn } from "lucide-react";
import { toast } from "sonner";

import { AuthShell } from "@/components/auth/auth-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type PendingAction = "google" | "password" | null;

function getAuthErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const normalized = message.toLowerCase();
  if (normalized.includes("429") || normalized.includes("rate limit")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  return message;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const requestLockRef = useRef(false);
  const nextPath = searchParams.get("next") ?? "/dashboard";

  useEffect(() => {
    if (!loading && session) {
      router.replace(nextPath);
    }
  }, [loading, nextPath, router, session]);

  const runAuthAction = async (action: Exclude<PendingAction, null>, task: () => Promise<void>) => {
    if (requestLockRef.current) {
      return;
    }

    requestLockRef.current = true;
    setPendingAction(action);
    try {
      await task();
    } catch (error) {
      toast.error(getAuthErrorMessage(error, "Unable to sign in"));
    } finally {
      requestLockRef.current = false;
      setPendingAction(null);
    }
  };

  const handleEmailSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("Enter your email and password");
      return;
    }

    await runAuthAction("password", async () => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (error) {
        throw error;
      }
      toast.success("Signed in successfully");
      router.replace(nextPath);
    });
  };

  const handleGoogleSignIn = async () => {
    await runAuthAction("google", async () => {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${nextPath}`
        }
      });
      if (error) {
        throw error;
      }
    });
  };

  return (
    <AuthShell title="Sign in" description="Access your recruiter workspace.">
      <div className="space-y-6">
        <Button className="w-full" onClick={handleGoogleSignIn} disabled={pendingAction !== null}>
          {pendingAction === "google" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Chrome className="h-4 w-4" />}
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          <span>Email</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <form className="space-y-4" onSubmit={handleEmailSignIn} noValidate>
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@company.com"
          />
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
          />

          <Button className="w-full" type="submit" variant="secondary" disabled={pendingAction !== null}>
            {pendingAction === "password" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Sign in with email
          </Button>
        </form>

        <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
          <Link href="/" className="transition hover:text-slate-950">
            Back to home
          </Link>
          <Link href={`/signup?next=${encodeURIComponent(nextPath)}`} className="font-medium text-orange-600 transition hover:text-orange-700">
            Create account
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
