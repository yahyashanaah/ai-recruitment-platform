"use client";

import { useEffect, useMemo, useState } from "react";
import { BotMessageSquare, DatabaseZap, Plus, SendHorizontal, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { streamChatAnswer } from "@/lib/api/client";
import { incrementStoredNumber } from "@/lib/storage";
import type { ChatSource } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  messages: Message[];
}

const examplePrompts = [
  "What do you know about Yahya Shanaah?",
  "Who has React experience?",
  "Find me a Python developer with fintech background"
];

function uid() {
  return Math.random().toString(36).slice(2);
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState("Idle");

  useEffect(() => {
    const raw = window.localStorage.getItem("tc_chat_conversations");
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Conversation[];
      setConversations(parsed);
      setActiveConversationId(parsed[0]?.id ?? null);
    } catch {
      window.localStorage.removeItem("tc_chat_conversations");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("tc_chat_conversations", JSON.stringify(conversations));
  }, [conversations]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  );

  const latestSources = useMemo(() => {
    const assistantWithSources = [...(activeConversation?.messages ?? [])]
      .reverse()
      .find((message) => message.role === "assistant" && message.sources && message.sources.length > 0);
    return assistantWithSources?.sources ?? [];
  }, [activeConversation]);

  const patchConversation = (conversationId: string, updater: (conversation: Conversation) => Conversation) => {
    setConversations((current) => current.map((conversation) => (conversation.id === conversationId ? updater(conversation) : conversation)));
  };

  const sendMessage = async (messageText?: string) => {
    const content = (messageText ?? prompt).trim();
    if (!content || loading) {
      return;
    }

    const conversationId = activeConversationId ?? uid();
    const userMessage: Message = { id: uid(), role: "user", content };
    const assistantMessage: Message = { id: uid(), role: "assistant", content: "" };

    setActiveConversationId(conversationId);
    setConversations((current) => {
      const existing = current.find((item) => item.id === conversationId);
      if (!existing) {
        return [
          {
            id: conversationId,
            title: content,
            updatedAt: new Date().toISOString(),
            messages: [userMessage, assistantMessage]
          },
          ...current
        ];
      }

      return current.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              title: conversation.title || content,
              updatedAt: new Date().toISOString(),
              messages: [...conversation.messages, userMessage, assistantMessage]
            }
          : conversation
      );
    });

    setPrompt("");
    setLoading(true);
    setSystemStatus("Searching candidate knowledge base...");

    try {
      incrementStoredNumber("tc_chat_queries_used");
      await streamChatAnswer(
        { question: content, top_k: 5 },
        {
          onToken: (token) => {
            patchConversation(conversationId, (conversation) => ({
              ...conversation,
              updatedAt: new Date().toISOString(),
              messages: conversation.messages.map((message) =>
                message.id === assistantMessage.id ? { ...message, content: `${message.content}${token}` } : message
              )
            }));
          },
          onSources: (sources) => {
            patchConversation(conversationId, (conversation) => ({
              ...conversation,
              messages: conversation.messages.map((message) =>
                message.id === assistantMessage.id ? { ...message, sources } : message
              )
            }));
          },
          onDone: () => {
            setSystemStatus("Answer ready");
          },
          onError: (message) => {
            toast.error(message);
            patchConversation(conversationId, (conversation) => ({
              ...conversation,
              messages: conversation.messages.map((item) =>
                item.id === assistantMessage.id && !item.content ? { ...item, content: message } : item
              )
            }));
          }
        }
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to stream answer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <PageHeader
          eyebrow="AI Chat"
          title="Ask TalentCore anything about your candidates"
          description="Premium recruiter chat over your indexed candidate knowledge base with grounded responses and visible source attribution."
          action={
            <Button variant="secondary" onClick={() => setActiveConversationId(null)}>
              <Plus className="h-4 w-4" />
              New chat
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>Conversation history</CardTitle>
            <CardDescription>Persisted locally for this browser session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {conversations.length === 0 ? (
              <EmptyState
                icon={BotMessageSquare}
                title="No conversations yet"
                description="Send your first question to start building recruiter conversation history."
              />
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setActiveConversationId(conversation.id)}
                  className={`w-full rounded-[22px] border p-4 text-left transition ${
                    activeConversationId === conversation.id
                      ? "border-primary/45 bg-primary/10"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                  }`}
                >
                  <p className="line-clamp-1 font-medium text-white">{conversation.title}</p>
                  <p className="mt-1 text-xs text-white/42">{formatDate(conversation.updatedAt)}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="min-h-[760px]">
        <CardHeader className="border-b border-white/6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Candidate intelligence assistant</CardTitle>
              <CardDescription>Streamed SSE responses grounded in uploaded candidate documents.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Model: GPT-4o</Badge>
              <Badge variant="teal">Embeddings: MiniLM</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex h-full flex-col gap-4 p-6">
          <div className="flex-1 space-y-4 overflow-y-auto pr-2">
            {!activeConversation || activeConversation.messages.length === 0 ? (
              <EmptyState
                icon={DatabaseZap}
                title="Search your candidate knowledge base"
                description="Ask direct recruiter questions or start from one of the guided prompts below."
              />
            ) : (
              activeConversation.messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-[24px] px-4 py-3 text-sm leading-7 ${
                      message.role === "user"
                        ? "bg-[linear-gradient(135deg,rgba(108,99,255,0.92),rgba(80,72,255,0.8))] text-white"
                        : "border border-white/10 bg-white/[0.04] text-white/80"
                    }`}
                  >
                    {message.content || (loading && message.role === "assistant" ? "Thinking..." : "")}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm text-white/50">
              <Sparkles className="h-4 w-4 text-[#00D4AA]" />
              {systemStatus}
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              {examplePrompts.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => sendMessage(example)}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70 transition hover:border-primary/35 hover:text-white"
                >
                  {example}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Ask about candidate experience, skills, or fit..."
                className="min-h-24"
              />
              <Button onClick={() => sendMessage()} disabled={loading || !prompt.trim()} className="self-end">
                <SendHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Retrieved sources</CardTitle>
            <CardDescription>CV chunks used to answer the current assistant response.</CardDescription>
          </CardHeader>
          <CardContent>
            {latestSources.length === 0 ? (
              <EmptyState
                icon={DatabaseZap}
                title="No sources yet"
                description="Run a query and TalentCore will show which candidate documents were retrieved."
              />
            ) : (
              <div className="space-y-3">
                {latestSources.map((source, index) => (
                  <div key={`${source.file_name}-${index}`} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4 text-sm">
                    <p className="font-medium text-white">{source.candidate_name}</p>
                    <p className="mt-1 text-white/48">{source.file_name}</p>
                    <Badge variant="outline" className="mt-3">Page {source.page_number}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
