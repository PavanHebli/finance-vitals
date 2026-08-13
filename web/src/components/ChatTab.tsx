"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send } from "lucide-react";
import { useStore, toApiFormData } from "@/lib/store";
import { streamChat } from "@/lib/api";
import type { Message } from "@/lib/types";

const STARTERS = [
  "Why is my score low and what should I focus on first?",
  "Should I pay off debt or build my emergency fund first?",
  "How much emergency fund do I actually need?",
  "How can I improve my savings rate?",
];

export function ChatTab() {
  const {
    formData, metrics, metricScores, overallScore, mirror,
    chatHistory, chatSummary,
    addChatMessage, setChatSummary,
  } = useStore();

  const [input, setInput]       = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamBuf, setStreamBuf] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, streamBuf]);

  async function send(text: string) {
    if (!text.trim() || streaming) return;
    if (!metrics || !metricScores || !overallScore || !mirror) return;

    const userMsg: Message = { role: "user", content: text };
    addChatMessage(userMsg);
    setInput("");
    setStreaming(true);
    setStreamBuf("");

    let assistantText = "";

    try {
      await streamChat(
        {
          message:           text,
          history:           chatHistory,
          form_data:         toApiFormData(formData),
          metrics,
          metric_scores:     metricScores,
          overall_score:     overallScore,
          mirror,
          provider:          formData.provider,
          api_key:           formData.apiKey,
          summarised_history: chatSummary,
        },
        (chunk) => {
          assistantText += chunk;
          setStreamBuf((prev) => prev + chunk);
        },
        (summary) => setChatSummary(summary)
      );
    } catch (err) {
      assistantText = `Error: ${err instanceof Error ? err.message : "Something went wrong."}`;
    } finally {
      addChatMessage({ role: "assistant", content: assistantText });
      setStreamBuf("");
      setStreaming(false);
    }
  }

  const SHOW_API_INPUT = process.env.NEXT_PUBLIC_SHOW_API_INPUT !== "false";
  const hasApiKey = !SHOW_API_INPUT || !!formData.apiKey;

  return (
    <div className="flex flex-col h-[600px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
        {chatHistory.length === 0 && !streaming && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-muted)]">Ask anything about your finances.</p>
            {STARTERS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                disabled={!hasApiKey}
                className="block w-full text-left text-sm px-4 py-3 rounded-lg border border-[var(--border)] hover:border-[var(--brand)] hover:bg-[var(--bg-2)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {q}
              </button>
            ))}
            {!hasApiKey && (
              <p className="text-xs text-[var(--text-muted)]">Add an API key on the form page to use chat.</p>
            )}
          </div>
        )}

        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${
                msg.role === "user"
                  ? "bg-[var(--brand)] text-white rounded-tr-sm"
                  : "bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text)] rounded-tl-sm"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose-vitals">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {/* Streaming bubble */}
        {streaming && (
          <div className="flex justify-start">
            <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-tl-sm bg-[var(--bg-2)] border border-[var(--border)] text-sm text-[var(--text)]">
              {streamBuf ? (
                <div className="prose-vitals">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamBuf}</ReactMarkdown>
                  <span className="inline-block w-1 h-4 bg-[var(--brand)] animate-pulse ml-0.5" />
                </div>
              ) : (
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce delay-75" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce delay-150" />
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end border-t border-[var(--border)] pt-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          disabled={!hasApiKey || streaming}
          placeholder={hasApiKey ? "Ask about your finances…" : "Add an API key to chat"}
          rows={1}
          className="input flex-1 resize-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => send(input)}
          disabled={!hasApiKey || streaming || !input.trim()}
          className="btn-primary p-2.5 shrink-0 disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
