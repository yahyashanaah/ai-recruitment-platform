"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";

import {
  AUTH_REQUIRED_EVENT,
  getCurrentRecruiterSession,
  isAuthenticationRequiredError
} from "@/lib/api/client";
import type { RecruiterProfile } from "@/lib/api/types";
import { clearSupabaseBrowserSession, getSupabaseBrowserClient } from "@/lib/supabase/client";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  recruiter: RecruiterProfile | null;
  loading: boolean;
  refreshRecruiter: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [recruiter, setRecruiter] = useState<RecruiterProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshRecruiter = useCallback(async () => {
    const client = getSupabaseBrowserClient();
    const {
      data: { session: currentSession }
    } = await client.auth.getSession();

    setSession(currentSession);
    setUser(currentSession?.user ?? null);

    if (!currentSession?.access_token) {
      setRecruiter(null);
      return;
    }

    try {
      const response = await getCurrentRecruiterSession(currentSession.access_token);
      setRecruiter(response.recruiter);
    } catch (error) {
      setRecruiter(null);
      if (isAuthenticationRequiredError(error)) {
        return;
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    let cancelled = false;

    const bootstrap = async () => {
      try {
        await refreshRecruiter();
      } catch (error) {
        if (!cancelled && !isAuthenticationRequiredError(error)) {
          toast.error(error instanceof Error ? error.message : "Unable to load recruiter session");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    const handleAuthRequired = () => {
      if (!cancelled) {
        setSession(null);
        setUser(null);
        setRecruiter(null);
        setLoading(false);
      }
    };

    window.addEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.access_token) {
        setRecruiter(null);
        setLoading(false);
        return;
      }

      void getCurrentRecruiterSession(nextSession.access_token)
        .then((response) => {
          if (!cancelled) {
            setRecruiter(response.recruiter);
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setRecruiter(null);
            if (!isAuthenticationRequiredError(error)) {
              toast.error(error instanceof Error ? error.message : "Unable to load recruiter session");
            }
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    });

    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
      subscription.unsubscribe();
    };
  }, [refreshRecruiter]);

  const signOut = useCallback(async () => {
    await clearSupabaseBrowserSession();
    setSession(null);
    setUser(null);
    setRecruiter(null);
    setLoading(false);
  }, []);

  const value = useMemo(
    () => ({
      session,
      user,
      recruiter,
      loading,
      refreshRecruiter,
      signOut
    }),
    [session, user, recruiter, loading, refreshRecruiter, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
