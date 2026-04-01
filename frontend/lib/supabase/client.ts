"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

function clearPersistedSessionStorage() {
  if (typeof window === "undefined") {
    return;
  }

  Object.keys(window.localStorage)
    .filter((key) => key.startsWith("sb-") && (key.includes("auth-token") || key.includes("code-verifier")))
    .forEach((key) => window.localStorage.removeItem(key));
}

export function getSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  browserClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  return browserClient;
}

export async function getSupabaseAccessToken() {
  const client = getSupabaseBrowserClient();
  const {
    data: { session }
  } = await client.auth.getSession();
  return session?.access_token ?? null;
}

export async function clearSupabaseBrowserSession() {
  try {
    const client = getSupabaseBrowserClient();
    await client.auth.signOut({ scope: "local" });
  } catch {
    // ignore local sign-out failures and clear persisted storage anyway
  }

  clearPersistedSessionStorage();
}
