"use client";

import { FormEvent, useRef, useState } from "react";
import { Bot, SendHorizonal, Sparkles, UserRound } from "lucide-react";

import { streamChatAnswer } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [topK, setTopK] = useState(5);
  const [question, setQuestion] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Ask me about candidates, skills, years of experience, or education. I will answer from uploaded documents only."
    }
  ]);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const canSend = question.trim().length > 0 && !isStreaming;

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSend) {
      return;
    }

    const userQuestion = question.trim();
    const assistantId = `assistant-${Date.now()}`;

    setError(null);
    setQuestion("");
    setIsStreaming(true);
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: userQuestion },
      { id: assistantId, role: "assistant", content: "" }
    ]);
    scrollToBottom();

    try {
      await streamChatAnswer(
        { question: userQuestion, top_k: topK },
        {
          onToken: (token) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId ? { ...msg, content: `${msg.content}${token}` } : msg
              )
            );
            scrollToBottom();
          },
          onSources: () => undefined,
          onError: (message) => setError(message),
          onDone: () => setIsStreaming(false)
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to stream answer");
      setIsStreaming(false);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Card className="border-primary/20 bg-gradient-to-r from-orange-50 via-white to-orange-100/50">
        <CardHeader>
          <CardTitle className="text-2xl">Recruiter Copilot Chat</CardTitle>
          <CardDescription>
            Streaming RAG answers from <code>/api/v1/chat/ask</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Badge variant="warning">SSE Streaming Enabled</Badge>
          <Badge variant="outline">Top K: {topK}</Badge>
        </CardContent>
      </Card>

      <Card className="flex min-h-[62vh] flex-col">
        <CardHeader className="border-b border-border/70 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Conversation</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-4 p-4">
          <div
            ref={viewportRef}
            className="h-[50vh] space-y-3 overflow-y-auto rounded-xl border border-border/70 bg-muted/20 px-3 py-4"
          >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow-sm md:max-w-[70%] ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border/70 bg-white"
                    }`}
                  >
                    <div className="mb-2 flex items-center gap-2 text-xs opacity-80">
                      {message.role === "user" ? (
                        <UserRound className="h-3.5 w-3.5" />
                      ) : (
                        <Bot className="h-3.5 w-3.5 text-primary" />
                      )}
                      {message.role === "user" ? "Recruiter" : "AI Assistant"}
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {message.content || (isStreaming && message.role === "assistant" ? "..." : "")}
                    </p>
                  </div>
                </div>
              ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center gap-2">
              <label htmlFor="topk" className="text-xs font-medium text-muted-foreground">
                Top-K Context
              </label>
              <input
                id="topk"
                type="range"
                min={1}
                max={20}
                value={topK}
                onChange={(event) => setTopK(Number(event.target.value))}
                className="w-40 accent-orange-500"
              />
              <span className="text-xs font-semibold">{topK}</span>
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="What do you know about Yahya Shanaah?"
                disabled={isStreaming}
              />
              <Button type="submit" disabled={!canSend}>
                {isStreaming ? "Streaming..." : "Ask"}
                <SendHorizonal className="h-4 w-4" />
              </Button>
            </div>
          </form>

          {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
          {!error && !isStreaming && <p className="text-xs text-muted-foreground">Ask a question to continue.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
