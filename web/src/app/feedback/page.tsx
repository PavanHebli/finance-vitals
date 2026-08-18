"use client";

import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { submitFeedback } from "@/lib/api";
import { analytics } from "@/lib/analytics";

const FOUND_VIA_OPTIONS = [
  "Google / search",
  "Reddit",
  "Twitter / X",
  "Product Hunt",
  "Friend or colleague",
  "Other",
];

export default function FeedbackPage() {
  const [foundVia, setFoundVia]             = useState("");
  const [scoreAccuracy, setScoreAccuracy]   = useState(0);
  const [mostUseful, setMostUseful]         = useState("");
  const [missingOrConfusing, setMissing]    = useState("");
  const [featureSuggestion, setSuggestion]  = useState("");
  const [anythingElse, setAnythingElse]     = useState("");
  const [email, setEmail]                   = useState("");
  const [submitting, setSubmitting]         = useState(false);
  const [submitted, setSubmitted]           = useState(false);
  const [error, setError]                   = useState(false);

  const canSubmit = mostUseful.trim().length > 0 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(false);
    try {
      const ok = await submitFeedback({
        found_via:             foundVia,
        score_accuracy:        scoreAccuracy || 3,
        most_useful:           mostUseful,
        missing_or_confusing:  missingOrConfusing,
        feature_suggestion:    featureSuggestion,
        anything_else:         anythingElse,
        email,
      });
      if (ok) {
        analytics.track("feedback_submitted");
        analytics.updateSession({ feedback_submitted: true });
        setSubmitted(true);
      } else setError(true);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center space-y-4">
        <CheckCircle size={44} className="mx-auto text-green-500" />
        <h1 className="text-2xl font-bold text-[var(--text)]">Thank you</h1>
        <p className="text-[var(--text-muted)] text-sm leading-relaxed">
          Your feedback helps shape what Vitals becomes. Every response is read.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Share your feedback</h1>
        <p className="text-[var(--text-muted)] text-sm">
          What's working, what isn't, and what you'd like to see next.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* How did you find Vitals */}
        <div>
          <label className="label">How did you find Vitals? <span className="text-[var(--text-muted)] font-normal">(optional)</span></label>
          <div className="flex flex-wrap gap-2 mt-1">
            {FOUND_VIA_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setFoundVia(foundVia === opt ? "" : opt)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  foundVia === opt
                    ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                    : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-2)]"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Score accuracy */}
        <div>
          <label className="label">How accurate does your score feel?</label>
          <div className="flex gap-2 mt-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setScoreAccuracy(scoreAccuracy === n ? 0 : n)}
                className={`w-10 h-10 rounded-lg text-sm font-semibold border transition-colors ${
                  scoreAccuracy >= n
                    ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                    : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-2)]"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-1 text-xs text-[var(--text-muted)] w-[11.5rem]">
            <span>Not accurate</span>
            <span>Very accurate</span>
          </div>
        </div>

        {/* Most useful */}
        <div>
          <label className="label">What was most useful? <span className="text-[var(--brand)]">*</span></label>
          <textarea
            value={mostUseful}
            onChange={(e) => setMostUseful(e.target.value)}
            rows={3}
            placeholder="e.g. The score breakdown, the AI narrative, the What-If simulator…"
            className="input resize-none"
          />
        </div>

        {/* Missing or confusing */}
        <div>
          <label className="label">What was missing or confusing? <span className="text-[var(--text-muted)] font-normal">(optional)</span></label>
          <textarea
            value={missingOrConfusing}
            onChange={(e) => setMissing(e.target.value)}
            rows={3}
            placeholder="Anything that felt unclear or missing?"
            className="input resize-none"
          />
        </div>

        {/* Feature suggestion */}
        <div>
          <label className="label">Any features you'd like to see? <span className="text-[var(--text-muted)] font-normal">(optional)</span></label>
          <textarea
            value={featureSuggestion}
            onChange={(e) => setSuggestion(e.target.value)}
            rows={3}
            placeholder="What would make Vitals more useful for you?"
            className="input resize-none"
          />
        </div>

        {/* Anything else */}
        <div>
          <label className="label">Anything else? <span className="text-[var(--text-muted)] font-normal">(optional)</span></label>
          <textarea
            value={anythingElse}
            onChange={(e) => setAnythingElse(e.target.value)}
            rows={2}
            placeholder="Open to anything…"
            className="input resize-none"
          />
        </div>

        {/* Email */}
        <div>
          <label className="label">Email <span className="text-[var(--text-muted)] font-normal">(optional — only if you'd like a reply)</span></label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input"
          />
        </div>

        {error && (
          <p className="text-sm text-red-500">Something went wrong. Try again in a moment.</p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-primary w-full py-3 disabled:opacity-40"
        >
          {submitting ? "Sending…" : "Send feedback"}
        </button>
      </form>
    </div>
  );
}
