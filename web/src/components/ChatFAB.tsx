"use client";

import { useState, useRef, useEffect } from "react";
import { X, ArrowUp, Loader2 } from "lucide-react";
import { useStore, toApiFormData, formatBudgetContext } from "@/lib/store";
import { streamChat } from "@/lib/api";
import { analytics } from "@/lib/analytics";

// ── Vitals chat icon — four-pointed sparkle ───────────────────────────────────

function VitalsChatIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 26 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Four-pointed star */}
      <path
        d="M13 2 L14.6 10.4 L23 13 L14.6 15.6 L13 24 L11.4 15.6 L3 13 L11.4 10.4 Z"
        fill="currentColor"
      />
      {/* Small accent dots */}
      <circle cx="20.5" cy="5.5" r="1.5" fill="currentColor" opacity="0.55" />
      <circle cx="5.5" cy="20.5" r="1" fill="currentColor" opacity="0.35" />
    </svg>
  );
}

// ── Starter prompts shown when chat is empty ──────────────────────────────────

const STARTERS = [
  "How can I improve my savings rate?",
  "Should I pay off debt or save first?",
  "How do I build an emergency fund?",
];

// ── Main component ────────────────────────────────────────────────────────────

export function ChatFAB() {
  const [open,    setOpen]    = useState(false);
  const [input,   setInput]   = useState("");
  const [answer,  setAnswer]  = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  const {
    formData,
    metrics,
    metricScores,
    overallScore,
    mirror,
    chatSummary,
    budgetCards,
    distributionLog,
  } = useStore();

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape" && open) setOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, answer]);

  // Focus input when drawer opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || loading) return;

    setInput("");
    setAnswer("");
    setError(false);
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setLoading(true);

    analytics.track("fab_chat_sent");

    // If no score available, give a fallback
    if (!metrics || !metricScores || overallScore === null || !mirror) {
      setLoading(false);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "I need your financial numbers first. Go to Budget Planner or Check my score to get started, then come back and ask me anything." },
      ]);
      return;
    }

    let streamed = "";
    try {
      await streamChat(
        {
          message: msg,
          history: messages,
          form_data: toApiFormData(formData),
          metrics,
          metric_scores: metricScores,
          overall_score: overallScore,
          mirror,
          provider: formData.provider || "",
          api_key: formData.apiKey || "",
          summarised_history: chatSummary,
          budget_context: formatBudgetContext(budgetCards, distributionLog),
        },
        (chunk) => {
          streamed += chunk;
          setAnswer(streamed);
        },
      );
      setMessages(prev => [...prev, { role: "assistant", content: streamed }]);
      setAnswer("");
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <>
      {/* FAB button */}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); analytics.track("fab_chat_opened"); }}
        aria-label="Chat with Vitals"
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
        style={{ background: "var(--brand)", color: "white" }}
      >
        {open
          ? <X size={20} />
          : <VitalsChatIcon size={22} />
        }
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/20"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed bottom-0 right-0 z-40 flex flex-col transition-all duration-300 ease-out
          ${open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"}
        `}
        style={{
          width: "min(420px, 100vw)",
          height: "min(580px, 80vh)",
          bottom: "84px",
          right: "20px",
          background: "var(--bg)",
          border: "1.5px solid var(--border)",
          borderRadius: "20px",
          boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-3.5 border-b shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "var(--brand)", color: "white" }}
          >
            <VitalsChatIcon size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Vitals Chat</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {overallScore !== null ? `Score ${Math.round(overallScore)} · ${mirror?.label}` : "Ask anything about your finances"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-2)]"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="space-y-3">
              <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                Ask anything about your financial picture
              </p>
              {STARTERS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="w-full text-left text-sm px-3 py-2.5 rounded-xl border transition-colors hover:border-[var(--brand)] hover:bg-[color-mix(in_srgb,var(--brand)_5%,transparent)]"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                style={
                  m.role === "user"
                    ? { background: "var(--brand)", color: "white", borderBottomRightRadius: "6px" }
                    : { background: "var(--bg-2)", color: "var(--text)", borderBottomLeftRadius: "6px" }
                }
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}

          {/* Streaming answer */}
          {(loading || answer) && (
            <div className="flex justify-start">
              <div
                className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                style={{ background: "var(--bg-2)", color: "var(--text)", borderBottomLeftRadius: "6px" }}
              >
                {loading && !answer
                  ? <Loader2 size={14} className="animate-spin text-[var(--brand)]" />
                  : <p className="whitespace-pre-wrap">{answer}<span className="inline-block w-0.5 h-3.5 bg-[var(--brand)] ml-0.5 animate-pulse" /></p>
                }
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-center text-red-500">Something went wrong. Try again.</p>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          className="px-4 py-3 border-t shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="flex items-end gap-2 rounded-xl border px-3 py-2"
            style={{ borderColor: "var(--border)", background: "var(--bg-2)" }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about your finances…"
              disabled={loading}
              className="flex-1 bg-transparent resize-none outline-none text-sm leading-snug min-h-[20px] max-h-[100px]"
              style={{ color: "var(--text)" }}
            />
            <button
              type="button"
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-opacity disabled:opacity-30"
              style={{ background: "var(--brand)", color: "white" }}
            >
              <ArrowUp size={15} />
            </button>
          </div>
          <p className="text-[10px] text-center mt-2" style={{ color: "var(--text-muted)" }}>
            For information only · Not financial advice
          </p>
        </div>
      </div>
    </>
  );
}
