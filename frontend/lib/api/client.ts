import type {
  CandidateProfile,
  ChatAskPayload,
  ChatSource,
  ChatStreamHandlers,
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
import { getSupabaseAccessToken } from "@/lib/supabase/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

function buildUrl(path: string) {
  const base = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return `${base}${withSlash}`;
}

async function resolveAuthToken(explicitToken?: string) {
  const token = explicitToken ?? (await getSupabaseAccessToken());
  if (!token) {
    throw new Error("Sign in required.");
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
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function checkHealth() {
  const response = await fetch(buildUrl("/health"), { cache: "no-store" });
  return parseJSON<HealthResponse>(response);
}

export async function getCurrentRecruiterSession(accessToken?: string) {
  const response = await fetch(buildUrl("/api/v1/auth/me"), {
    headers: await buildAuthHeaders(accessToken),
    cache: "no-store"
  });
  return parseJSON<RecruiterSessionResponse>(response);
}

export async function uploadDocuments(files: File[], accessToken?: string) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await fetch(buildUrl("/api/v1/documents/upload"), {
    method: "POST",
    headers: await buildAuthHeaders(accessToken),
    body: formData
  });

  return parseJSON<UploadResponse>(response);
}

export async function matchJobDescription(payload: MatchJDRequest, accessToken?: string) {
  const response = await fetch(buildUrl("/api/v1/match-jd"), {
    method: "POST",
    headers: await buildAuthHeaders(accessToken, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload)
  });

  return parseJSON<MatchResponse>(response);
}

export async function generateSmartJobDescription(payload: SmartJDRequest, accessToken?: string) {
  const response = await fetch(buildUrl("/api/v1/jd/generate"), {
    method: "POST",
    headers: await buildAuthHeaders(accessToken, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload)
  });

  return parseJSON<SmartJDResponse>(response);
}

export async function listCandidates(accessToken?: string) {
  const response = await fetch(buildUrl("/api/v1/candidates"), {
    headers: await buildAuthHeaders(accessToken),
    cache: "no-store"
  });
  return parseJSON<CandidateProfile[]>(response);
}

export async function deleteCandidate(candidateId: string, accessToken?: string) {
  const response = await fetch(buildUrl(`/api/v1/candidates/${candidateId}`), {
    method: "DELETE",
    headers: await buildAuthHeaders(accessToken)
  });

  return parseJSON<DeleteCandidateResponse>(response);
}

export async function deleteDocumentFile(fileName: string, accessToken?: string) {
  const encoded = encodeURIComponent(fileName);
  const response = await fetch(buildUrl(`/api/v1/documents/file/${encoded}`), {
    method: "DELETE",
    headers: await buildAuthHeaders(accessToken)
  });

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
  const response = await fetch(buildUrl("/api/v1/chat/ask"), {
    method: "POST",
    headers: await buildAuthHeaders(accessToken, {
      "Content-Type": "application/json",
      Accept: "text/event-stream"
    }),
    body: JSON.stringify(payload)
  });

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
