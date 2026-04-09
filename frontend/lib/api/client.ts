import type {
  CandidateProfile,
  ChatAskPayload,
  ChatSource,
  ChatStreamHandlers,
  DashboardSummaryResponse,
  DeleteCandidateResponse,
  DeleteFileResponse,
  HealthResponse,
  MatchJDRequest,
  MatchResponse,
  RecruiterSessionResponse,
  SmartJDRequest,
  SmartJDResponse,
  UploadResponse
} from "@/lib/api/types";
import {
  clearSupabaseBrowserSession,
  getSupabaseAccessToken,
  refreshSupabaseAccessToken
} from "@/lib/supabase/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
export const AUTH_REQUIRED_EVENT = "talentcore:auth-required";

export class AuthenticationRequiredError extends Error {
  constructor(message = "Sign in required.") {
    super(message);
    this.name = "AuthenticationRequiredError";
  }
}

export function isAuthenticationRequiredError(error: unknown): error is AuthenticationRequiredError {
  return error instanceof AuthenticationRequiredError;
}

let authRedirectPending = false;

function buildUrl(path: string) {
  const base = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return `${base}${withSlash}`;
}

function buildLoginRedirectPath() {
  if (typeof window === "undefined") {
    return "/login";
  }

  const currentPath = `${window.location.pathname}${window.location.search}`;
  const nextPath =
    currentPath.startsWith("/login") || currentPath.startsWith("/signup") ? "/dashboard" : currentPath;

  return `/login?next=${encodeURIComponent(nextPath)}`;
}

async function handleAuthenticationRequired(message = "Sign in required.") {
  await clearSupabaseBrowserSession();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_REQUIRED_EVENT));

    if (!authRedirectPending) {
      authRedirectPending = true;
      window.location.replace(buildLoginRedirectPath());
    }
  }

  return new AuthenticationRequiredError(message);
}

async function resolveAuthToken(explicitToken?: string) {
  const token = explicitToken ?? (await getSupabaseAccessToken());
  if (!token) {
    throw await handleAuthenticationRequired("Sign in required.");
  }
  return token;
}

async function buildAuthHeaders(
  explicitToken?: string,
  baseHeaders?: HeadersInit
): Promise<HeadersInit> {
  const token = await resolveAuthToken(explicitToken);
  return {
    ...baseHeaders,
    Authorization: `Bearer ${token}`
  };
}

async function authenticatedFetch(
  path: string,
  init: RequestInit = {},
  accessToken?: string
): Promise<Response> {
  const requestHeaders = init.headers;
  let token = await resolveAuthToken(accessToken);

  let response = await fetch(buildUrl(path), {
    ...init,
    headers: await buildAuthHeaders(token, requestHeaders)
  });

  if (response.status !== 401 || accessToken) {
    return response;
  }

  const refreshedToken = await refreshSupabaseAccessToken();
  if (!refreshedToken) {
    return response;
  }

  token = refreshedToken;
  response = await fetch(buildUrl(path), {
    ...init,
    headers: await buildAuthHeaders(token, requestHeaders)
  });

  return response;
}

async function parseJSON<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: string | { msg?: string }[] };
      if (typeof payload.detail === "string") {
        message = payload.detail;
      } else if (Array.isArray(payload.detail) && payload.detail[0]?.msg) {
        message = payload.detail[0].msg;
      }
    } catch {
      // ignore JSON parsing failure
    }

    if (response.status === 401) {
      throw await handleAuthenticationRequired(message);
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function checkHealth() {
  const response = await fetch(buildUrl("/health"), { cache: "no-store" });
  return parseJSON<HealthResponse>(response);
}

export async function getCurrentRecruiterSession(accessToken?: string) {
  const response = await authenticatedFetch(
    "/api/v1/auth/me",
    {
      cache: "no-store"
    },
    accessToken
  );
  return parseJSON<RecruiterSessionResponse>(response);
}

export async function uploadDocuments(files: File[], accessToken?: string) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await authenticatedFetch(
    "/api/v1/documents/upload",
    {
      method: "POST",
      body: formData
    },
    accessToken
  );

  return parseJSON<UploadResponse>(response);
}

export async function matchJobDescription(payload: MatchJDRequest, accessToken?: string) {
  const response = await authenticatedFetch(
    "/api/v1/match-jd",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    },
    accessToken
  );

  return parseJSON<MatchResponse>(response);
}

export async function generateSmartJobDescription(payload: SmartJDRequest, accessToken?: string) {
  const response = await authenticatedFetch(
    "/api/v1/jd/generate",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    },
    accessToken
  );

  return parseJSON<SmartJDResponse>(response);
}

export async function listCandidates(accessToken?: string) {
  const response = await authenticatedFetch(
    "/api/v1/candidates",
    {
      cache: "no-store"
    },
    accessToken
  );
  return parseJSON<CandidateProfile[]>(response);
}

export async function getDashboardSummary(accessToken?: string) {
  const response = await authenticatedFetch(
    "/api/v1/dashboard/summary",
    {
      cache: "no-store"
    },
    accessToken
  );
  return parseJSON<DashboardSummaryResponse>(response);
}

export async function deleteCandidate(candidateId: string, accessToken?: string) {
  const response = await authenticatedFetch(
    `/api/v1/candidates/${candidateId}`,
    {
      method: "DELETE"
    },
    accessToken
  );

  return parseJSON<DeleteCandidateResponse>(response);
}

export async function deleteDocumentFile(fileName: string, accessToken?: string) {
  const encoded = encodeURIComponent(fileName);
  const response = await authenticatedFetch(
    `/api/v1/documents/file/${encoded}`,
    {
      method: "DELETE"
    },
    accessToken
  );

  return parseJSON<DeleteFileResponse>(response);
}

function consumeSSEBlock(block: string, handlers: ChatStreamHandlers) {
  const lines = block.split("\n");
  let eventName = "";
  const dataLines: string[] = [];

  lines.forEach((line) => {
    if (line.startsWith("event:")) {
      eventName = line.replace("event:", "").trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.replace("data:", "").trim());
    }
  });

  if (!eventName || dataLines.length === 0) {
    return;
  }

  const payloadText = dataLines.join("\n");
  let payload: unknown = {};
  try {
    payload = JSON.parse(payloadText) as unknown;
  } catch {
    return;
  }

  if (eventName === "token") {
    handlers.onToken(String((payload as { text?: string }).text ?? ""));
    return;
  }

  if (eventName === "sources") {
    handlers.onSources(((payload as { sources?: ChatSource[] }).sources ?? []) as ChatSource[]);
    return;
  }

  if (eventName === "error") {
    handlers.onError?.(String((payload as { message?: string }).message ?? "Stream error"));
    return;
  }

  if (eventName === "done") {
    handlers.onDone?.();
  }
}

export async function streamChatAnswer(
  payload: ChatAskPayload,
  handlers: ChatStreamHandlers,
  accessToken?: string
) {
  const response = await authenticatedFetch(
    "/api/v1/chat/ask",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream"
      },
      body: JSON.stringify(payload)
    },
    accessToken
  );

  if (response.status === 401) {
    throw await handleAuthenticationRequired("Sign in required.");
  }

  if (!response.ok || !response.body) {
    throw new Error(`Chat stream failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let done = false;

  while (!done) {
    const chunk = await reader.read();
    done = chunk.done;
    buffer += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !done });

    let separatorIndex = buffer.indexOf("\n\n");
    while (separatorIndex !== -1) {
      const block = buffer.slice(0, separatorIndex).trim();
      buffer = buffer.slice(separatorIndex + 2);

      if (block.length > 0) {
        consumeSSEBlock(block, handlers);
      }

      separatorIndex = buffer.indexOf("\n\n");
    }
  }

  if (buffer.trim().length > 0) {
    consumeSSEBlock(buffer.trim(), handlers);
  }
}
