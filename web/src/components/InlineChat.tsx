"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp } from "lucide-react";
import { useStore, toApiFormData } from "@/lib/store";
import { streamChat } from "@/lib/api";

const STARTERS = [
  "Why is my score low and what should I focus on first?",
  "Should I pay off debt or build my emergency fund first?",
  "How much emergency fund do I actually need?",
  "How can I improve my savings rate?",
];

export function InlineChat() {
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

    addChatMessage({ role: "user", content: text });
    setInput("");
    setStreaming(true);
    setStreamBuf("");

    let assistantText = "";

    try {
      await streamChat(
        {
          message:            text,
          history:            chatHistory,
          form_data:          toApiFormData(formData),
          metrics,
          metric_scores:      metricScores,
          overall_score:      overallScore,
          mirror,
          provider:           formData.provider,
          api_key:            formData.apiKey,
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
    <div className="mt-10 border-t border-[var(--border)] pt-6">

      {/* Scrollable conversation thread */}
      <div className="max-h-[480px] overflow-y-auto space-y-6 pr-1 pb-2">

        {/* Starter suggestions — only before first message */}
        {chatHistory.length === 0 && !streaming && (
          <div className="flex flex-wrap gap-2">
            {STARTERS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                disabled={!hasApiKey}
                className="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--brand)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Conversation thread — no bubbles, pure prose */}
        {chatHistory.map((msg, i) =>
          msg.role === "user" ? (
            <p key={i} className="text-sm text-[var(--text-muted)] text-right italic">
              {msg.content}
            </p>
          ) : (
            <div key={i} className="prose-vitals text-[var(--text)] text-sm leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            </div>
          )
        )}

        {/* Streaming response */}
        {streaming && (
          streamBuf ? (
            <div className="prose-vitals text-[var(--text)] text-sm leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamBuf}</ReactMarkdown>
              <span className="inline-block w-1 h-4 bg-[var(--brand)] animate-pulse ml-0.5 align-middle" />
            </div>
          ) : (
            <div className="flex gap-1 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:75ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:150ms]" />
            </div>
          )
        )}

        <div ref={bottomRef} />
      </div>

      {/* Composer — always visible, outside the scroll area */}
      <div className="relative mt-4">
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
          placeholder={hasApiKey ? "Ask a follow-up…" : "Add an API key to ask questions"}
          rows={1}
          className="input w-full resize-none pr-12 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => send(input)}
          disabled={!hasApiKey || streaming || !input.trim()}
          className="absolute right-2 bottom-2 p-1.5 rounded-lg text-[var(--brand)] hover:bg-[var(--bg-2)] disabled:opacity-30 transition-colors"
        >
          <ArrowUp size={18} />
        </button>
      </div>

      {!hasApiKey && (
        <p className="text-xs text-[var(--text-muted)] mt-2">
          Add an API key on the form page to ask questions.
        </p>
      )}
    </div>
  );
}
