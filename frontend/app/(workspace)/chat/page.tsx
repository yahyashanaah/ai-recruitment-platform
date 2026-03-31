"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { BotMessageSquare, Plus, SendHorizontal, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { streamChatAnswer } from "@/lib/api/client";
import { incrementStoredNumber } from "@/lib/storage";
import { formatDate } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
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
  const [systemStatus, setSystemStatus] = useState("Ready");
  const messagesRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!messagesRef.current) {
      return;
    }
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [activeConversationId, conversations, loading]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  );

  const patchConversation = (
    conversationId: string,
    updater: (conversation: Conversation) => Conversation
  ) => {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId ? updater(conversation) : conversation
      )
    );
  };

  const ensureConversation = () => {
    if (activeConversationId) {
      return activeConversationId;
    }

    const nextConversation: Conversation = {
      id: uid(),
      title: "New conversation",
      updatedAt: new Date().toISOString(),
      messages: []
    };

    setConversations((current) => [nextConversation, ...current]);
    setActiveConversationId(nextConversation.id);
    return nextConversation.id;
  };

  const createConversation = () => {
    const nextConversation: Conversation = {
      id: uid(),
      title: "New conversation",
      updatedAt: new Date().toISOString(),
      messages: []
    };

    setConversations((current) => [nextConversation, ...current]);
    setActiveConversationId(nextConversation.id);
    setPrompt("");
    setSystemStatus("Ready");
  };

  const sendMessage = async (overridePrompt?: string) => {
    const value = (overridePrompt ?? prompt).trim();
    if (!value || loading) {
      return;
    }

    const conversationId = ensureConversation();
    const userMessage: Message = { id: uid(), role: "user", content: value };
    const assistantMessage: Message = { id: uid(), role: "assistant", content: "" };

    patchConversation(conversationId, (conversation) => ({
      ...conversation,
      title: conversation.messages.length === 0 ? value.slice(0, 48) : conversation.title,
      updatedAt: new Date().toISOString(),
      messages: [...conversation.messages, userMessage, assistantMessage]
    }));

    setPrompt("");
    setLoading(true);
    setSystemStatus("Searching candidate knowledge base...");

    try {
      await streamChatAnswer(
        { question: value, top_k: 5 },
        {
          onToken: (text) => {
            patchConversation(conversationId, (conversation) => ({
              ...conversation,
              updatedAt: new Date().toISOString(),
              messages: conversation.messages.map((message) =>
                message.id === assistantMessage.id ? { ...message, content: `${message.content}${text}` } : message
              )
            }));
          },
          onSources: () => {
            // intentionally hidden in the current UI
          },
          onDone: () => {
            setSystemStatus("Ready");
            incrementStoredNumber("tc_chat_queries_used");
          },
          onError: (message) => {
            throw new Error(message);
          }
        }
      );
    } catch (error) {
      patchConversation(conversationId, (conversation) => ({
        ...conversation,
        updatedAt: new Date().toISOString(),
        messages: conversation.messages.map((message) =>
          message.id === assistantMessage.id
            ? {
                ...message,
                content:
                  error instanceof Error ? error.message : "Unable to get a response from the assistant."
              }
            : message
        )
      }));
      toast.error(error instanceof Error ? error.message : "Unable to stream chat response");
      setSystemStatus("Issue detected");
    } finally {
      setLoading(false);
    }
  };

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    void sendMessage();
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="AI Chat"
        title="Ask recruiter questions in one focused conversation surface"
        description="Stream grounded answers from uploaded candidate documents without leaving the workspace."
        action={
          <Button variant="secondary" onClick={createConversation}>
            <Plus className="h-4 w-4" />
            New chat
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
            <CardDescription>Recent recruiter chat sessions stored in this browser.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" variant="secondary" onClick={createConversation}>
              <Plus className="h-4 w-4" />
              Start fresh
            </Button>

            <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
              {conversations.length === 0 ? (
                <EmptyState
                  icon={BotMessageSquare}
                  title="No conversations yet"
                  description="Start with a recruiter question and the assistant will stream an answer here."
                />
              ) : (
                conversations.map((conversation) => {
                  const isActive = conversation.id === activeConversationId;
                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setActiveConversationId(conversation.id)}
                      className={`w-full rounded-[24px] border p-4 text-left transition ${
                        isActive
                          ? "border-orange-200 bg-orange-50"
                          : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="line-clamp-1 text-sm font-semibold text-slate-950">{conversation.title}</p>
                        {isActive ? <Badge>Active</Badge> : null}
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                        {conversation.messages.at(-1)?.content || "No messages yet"}
                      </p>
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                        {formatDate(conversation.updatedAt)}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-slate-200/80 bg-white/70">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>{activeConversation?.title ?? "AI assistant"}</CardTitle>
                <CardDescription>Streaming answers from your recruiter-scoped candidate knowledge base.</CardDescription>
              </div>
              <Badge variant={loading ? "warning" : "success"}>{systemStatus}</Badge>
            </div>
          </CardHeader>

          <CardContent className="grid gap-5 p-0">
            <div ref={messagesRef} className="max-h-[520px] min-h-[420px] space-y-4 overflow-y-auto px-6 py-6">
              {!activeConversation ? (
                <EmptyState
                  icon={Sparkles}
                  title="Start the conversation"
                  description="Ask about skills, experience, fit, or any candidate detail already stored in your workspace."
                />
              ) : (
                activeConversation.messages.map((message) => {
                  const isUser = message.role === "user";
                  return (
                    <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-3xl rounded-[24px] px-5 py-4 text-sm leading-7 shadow-[0_12px_28px_rgba(15,23,42,0.04)] ${
                          isUser
                            ? "bg-[linear-gradient(135deg,#f97316,#fb923c)] text-white"
                            : "border border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        {message.content || (loading && !isUser ? "Thinking..." : "")}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-200/80 px-6 py-6">
              <div className="mb-4 flex flex-wrap gap-2">
                {examplePrompts.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setPrompt(example)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-slate-950"
                  >
                    {example}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <Textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={handlePromptKeyDown}
                  placeholder="Ask about candidate skills, experience, job fit, or recruiter insights..."
                  className="min-h-[140px]"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">Press Enter to send. Use Shift + Enter for a new line.</p>
                  <Button onClick={() => void sendMessage()} disabled={loading || !prompt.trim()}>
                    <SendHorizontal className="h-4 w-4" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
