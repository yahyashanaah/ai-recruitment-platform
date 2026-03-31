"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Chrome, LoaderCircle, UserPlus } from "lucide-react";
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

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      toast.error(getAuthErrorMessage(error, "Unable to create account"));
    } finally {
      requestLockRef.current = false;
      setPendingAction(null);
    }
  };

  const handleEmailSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      toast.error("Complete all fields");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    await runAuthAction("password", async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${nextPath}`,
          data: {
            full_name: fullName.trim()
          }
        }
      });
      if (error) {
        throw error;
      }

      if (data.session) {
        toast.success("Account created successfully");
        router.replace(nextPath);
        return;
      }

      toast.success("Check your email to confirm your account");
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
    });
  };

  const handleGoogleSignup = async () => {
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
    <AuthShell title="Create account" description="Start your recruiter workspace.">
      <div className="space-y-6">
        <Button className="w-full" onClick={handleGoogleSignup} disabled={pendingAction !== null}>
          {pendingAction === "google" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Chrome className="h-4 w-4" />}
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          <span>Email</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <form className="space-y-4" onSubmit={handleEmailSignup} noValidate>
          <Input
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Full name"
          />
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@company.com"
          />
          <Input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
          />
          <Input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm password"
          />

          <Button className="w-full" type="submit" variant="secondary" disabled={pendingAction !== null}>
            {pendingAction === "password" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Create account
          </Button>
        </form>

        <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
          <Link href="/" className="transition hover:text-slate-950">
            Back to home
          </Link>
          <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="font-medium text-orange-600 transition hover:text-orange-700">
            Sign in
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
