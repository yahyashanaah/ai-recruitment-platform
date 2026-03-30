"use client";

import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import { BotMessageSquare, Plus, SendHorizontal } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [systemStatus, setSystemStatus] = useState("Ready");

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

  const patchConversation = (
    conversationId: string,
    updater: (conversation: Conversation) => Conversation
  ) => {
    setConversations((current) => {
      const existing = current.find((conversation) => conversation.id === conversationId);
      if (!existing) {
        return current;
      }

      const updated = updater(existing);
      return [updated, ...current.filter((conversation) => conversation.id !== conversationId)];
    });
  };

  const resetChat = () => {
    setActiveConversationId(null);
    setPrompt("");
    setSystemStatus("Ready");
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

      const updatedConversation: Conversation = {
        ...existing,
        title: existing.title || content,
        updatedAt: new Date().toISOString(),
        messages: [...existing.messages, userMessage, assistantMessage]
      };

      return [updatedConversation, ...current.filter((item) => item.id !== conversationId)];
    });

    setPrompt("");
    setLoading(true);
    setSystemStatus("Searching documents...");

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
                message.id === assistantMessage.id
                  ? { ...message, content: `${message.content}${token}` }
                  : message
              )
            }));
            setSystemStatus("Generating answer...");
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
            setSystemStatus("Ready");
          },
          onError: (message) => {
            setSystemStatus("Error");
            toast.error(message);
            patchConversation(conversationId, (conversation) => ({
              ...conversation,
              messages: conversation.messages.map((item) =>
                item.id === assistantMessage.id && !item.content
                  ? { ...item, content: message }
                  : item
              )
            }));
          }
        }
      );
    } catch (error) {
      setSystemStatus("Error");
      toast.error(error instanceof Error ? error.message : "Unable to stream answer");
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
    <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <div className="space-y-6">
        <PageHeader
          className="mt-0"
          title="AI chat"
          description="Ask direct questions about uploaded candidates and receive streamed answers from the indexed document base."
          action={
            <Button variant="secondary" onClick={resetChat}>
              <Plus className="h-4 w-4" />
              New chat
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
            <CardDescription>Saved in this browser session.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {conversations.length === 0 ? (
              <div className="px-6 pb-6">
                <EmptyState
                  icon={BotMessageSquare}
                  title="No conversations"
                  description="Start a question to create your first chat thread."
                />
              </div>
            ) : (
              <ScrollArea className="h-[640px]">
                <div className="space-y-2 p-4">
                  {conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setActiveConversationId(conversation.id)}
                      className={`w-full rounded-[20px] border p-4 text-left transition ${
                        activeConversationId === conversation.id
                          ? "border-primary/45 bg-primary/10"
                          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                      }`}
                    >
                      <p className="line-clamp-1 text-sm font-medium text-white">
                        {conversation.title}
                      </p>
                      <p className="mt-1 text-xs text-white/42">
                        {formatDate(conversation.updatedAt)}
                      </p>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="min-h-[760px]">
        <CardHeader className="border-b border-white/6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Candidate knowledge chat</CardTitle>
              <CardDescription>Streamed answers grounded in uploaded CV documents.</CardDescription>
            </div>
            <Badge
              variant={loading ? "teal" : systemStatus === "Error" ? "warning" : "outline"}
              className="normal-case tracking-normal"
            >
              {systemStatus}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex h-full flex-col p-0">
          <ScrollArea className="h-[500px]">
            <div className="space-y-4 p-6">
              {!activeConversation || activeConversation.messages.length === 0 ? (
                <EmptyState
                  icon={BotMessageSquare}
                  title="Start a conversation"
                  description="Ask a question about candidate skills, experience, or role fit."
                />
              ) : (
                activeConversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-[20px] px-4 py-3 text-sm leading-7 ${
                        message.role === "user"
                          ? "bg-primary text-white"
                          : "border border-white/10 bg-white/[0.04] text-white/78"
                      }`}
                    >
                      {message.content || (loading && message.role === "assistant" ? "Thinking..." : "")}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-white/6 p-6">
            <div className="mb-4 flex flex-wrap gap-2">
              {examplePrompts.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => sendMessage(example)}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/68 transition hover:border-primary/35 hover:text-white"
                >
                  {example}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={handlePromptKeyDown}
                placeholder="Ask about candidate experience, skills, or fit..."
                className="min-h-[120px]"
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-white/45">
                  Answers are generated from uploaded candidate documents.
                </p>
                <Button onClick={() => sendMessage()} disabled={loading || !prompt.trim()}>
                  <SendHorizontal className="h-4 w-4" />
                  Send
                </Button>
              </div>
            </div>

            {latestSources.length > 0 && (
              <div className="mt-5 border-t border-white/6 pt-5">
                <p className="text-sm font-medium text-white">Sources</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {latestSources.map((source, index) => (
                    <div
                      key={`${source.file_name}-${index}`}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/68"
                    >
                      {source.candidate_name} • {source.file_name} • page {source.page_number}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
