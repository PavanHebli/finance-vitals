"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore, toApiFormData } from "@/lib/store";
import { fetchScore } from "@/lib/api";
import { PdfImport } from "@/components/PdfImport";
import { ChevronDown } from "lucide-react";

const SHOW_API_INPUT = process.env.NEXT_PUBLIC_SHOW_API_INPUT !== "false";

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[var(--border)]">
      <button
        type="button"
        className="w-full flex items-center justify-between text-left gap-2 py-5 px-4"
        onClick={onToggle}
      >
        <div>
          <div className="font-semibold text-[var(--text)]">{title}</div>
          {subtitle && <div className="text-sm text-[var(--text-muted)] mt-0.5">{subtitle}</div>}
        </div>
        <ChevronDown
          size={18}
          className="text-[var(--text-muted)] shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        />
      </button>
      {open && (
        <div className="px-4 pb-5 space-y-4 bg-[var(--bg-2)]">
          {children}
        </div>
      )}
    </div>
  );
}

function NumInput({
  label,
  value,
  onChange,
  prefix = "$",
  placeholder = "0",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">
            {prefix}
          </span>
        )}
        <input
          type="number"
          min={0}
          value={value || ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder={placeholder}
          className={`input ${prefix ? "pl-7" : ""}`}
        />
      </div>
    </div>
  );
}

function SelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const PROVIDERS = [
  { value: "groq",      label: "Groq (free, fast — recommended)" },
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "openai",    label: "OpenAI (GPT-4o)" },
  { value: "gemini",    label: "Google Gemini" },
];

const EMPLOYMENT_OPTIONS = [
  { value: "Full-time employed",  label: "Full-time employed" },
  { value: "Part-time employed",  label: "Part-time employed" },
  { value: "Self-employed",       label: "Self-employed / freelance" },
  { value: "Job hunting",         label: "Job hunting" },
  { value: "Student",             label: "Student" },
  { value: "Retired",             label: "Retired" },
  { value: "Other",               label: "Other" },
];

const EF_OPTIONS = [
  { value: "Yes — 3+ months",    label: "Yes — 3+ months" },
  { value: "Yes — 1-3 months",   label: "Yes — 1-3 months" },
  { value: "Less than 1 month",  label: "Less than 1 month" },
  { value: "No",                 label: "No emergency fund" },
];

const K401_OPTIONS = [
  { value: "Yes — getting employer match", label: "Yes — getting employer match" },
  { value: "Yes — no employer match",      label: "Yes — no employer match" },
  { value: "No",                           label: "No" },
  { value: "Not applicable",               label: "Not applicable" },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function FormPage() {
  const router = useRouter();
  const { formData, setFormField, setFormData, setResults, resetResults } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.incomeMain) {
      setError("Monthly income is required.");
      return;
    }
    setError(null);
    setLoading(true);
    resetResults();
    try {
      const result = await fetchScore(toApiFormData(formData));
      setResults(result.metrics, result.metric_scores, result.overall_score, result.mirror);
      router.push("/results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Check your financial health</h1>
        <p className="text-[var(--text-muted)]">
          Fill in what you know. Every section you complete improves your results.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10 items-start">

        {/* ── Left: form ─────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-0 border-t border-[var(--border)]">

          {/* Section 1 — AI provider (only when SHOW_API_INPUT=true) */}
          {SHOW_API_INPUT && (
            <div className="card mb-4 space-y-4">
              <div className="font-semibold text-[var(--text)]">AI provider</div>
              <SelectInput
                label="Provider"
                value={formData.provider}
                options={PROVIDERS}
                onChange={(v) => setFormField("provider", v)}
              />
              <div>
                <label className="label">API key</label>
                <input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormField("apiKey", e.target.value)}
                  placeholder="Paste your API key here"
                  className="input"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Stays in your browser — never sent to our servers.
                </p>
              </div>
            </div>
          )}

          {/* Income — always visible */}
          <div className="border-b border-[var(--border)] py-5 space-y-4 px-4">
            <div className="font-semibold text-[var(--text)]">Income</div>
            <div className="grid grid-cols-2 gap-3">
              <NumInput
                label="Monthly take-home income"
                value={formData.incomeMain}
                onChange={(v) => setFormField("incomeMain", v)}
              />
              <NumInput
                label="Additional monthly income"
                value={formData.incomeAdditional}
                onChange={(v) => setFormField("incomeAdditional", v)}
              />
            </div>
          </div>

          {/* Section 2 — expenses */}
          <Section
            title="Expense breakdown"
            subtitle="Optional — needed for detailed recommendations"
            open={formData.section2Open}
            onToggle={() => setFormField("section2Open", !formData.section2Open)}
          >
            {!formData.section2Open && (
              <NumInput
                label="Total monthly expenses (estimate)"
                value={formData.expensesTotalEstimate}
                onChange={(v) => setFormField("expensesTotalEstimate", v)}
              />
            )}
            {formData.section2Open && (
              <div className="grid grid-cols-2 gap-3">
                <NumInput label="Rent / mortgage"  value={formData.expensesRent}          onChange={(v) => setFormField("expensesRent", v)} />
                <NumInput label="Groceries"        value={formData.expensesGroceries}     onChange={(v) => setFormField("expensesGroceries", v)} />
                <NumInput label="Transport"        value={formData.expensesTransport}     onChange={(v) => setFormField("expensesTransport", v)} />
                <NumInput label="Subscriptions"    value={formData.expensesSubscriptions} onChange={(v) => setFormField("expensesSubscriptions", v)} />
                <NumInput label="Dining out"       value={formData.expensesDining}        onChange={(v) => setFormField("expensesDining", v)} />
                <NumInput label="Shopping"         value={formData.expensesShopping}      onChange={(v) => setFormField("expensesShopping", v)} />
                <NumInput label="Other"            value={formData.expensesOther}         onChange={(v) => setFormField("expensesOther", v)} />
              </div>
            )}
          </Section>

          {/* Section 3 — position */}
          <Section
            title="Financial position"
            subtitle="Optional — savings, investments, and debt"
            open={formData.section3Open}
            onToggle={() => setFormField("section3Open", !formData.section3Open)}
          >
            <div className="grid grid-cols-2 gap-3">
              <NumInput label="Total savings"             value={formData.savingsTotal}     onChange={(v) => setFormField("savingsTotal", v)} />
              <NumInput label="Total investments"         value={formData.investmentsTotal} onChange={(v) => setFormField("investmentsTotal", v)} />
              <NumInput label="Total debt (all accounts)" value={formData.debtTotal}        onChange={(v) => setFormField("debtTotal", v)} />
              <NumInput label="Monthly debt payments"     value={formData.debtMonthly}      onChange={(v) => setFormField("debtMonthly", v)} />
            </div>
          </Section>

          {/* Section 4 — profile */}
          <Section
            title="Personal profile"
            subtitle="Optional — improves the AI's advice"
            open={formData.section4Open}
            onToggle={() => setFormField("section4Open", !formData.section4Open)}
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Age</label>
                <input
                  type="number"
                  min={18}
                  max={100}
                  value={formData.age || ""}
                  onChange={(e) => setFormField("age", parseInt(e.target.value) || null)}
                  placeholder="e.g. 28"
                  className="input"
                />
              </div>
              <SelectInput
                label="Employment status"
                value={formData.employment}
                options={EMPLOYMENT_OPTIONS}
                onChange={(v) => setFormField("employment", v)}
              />
              <SelectInput
                label="Emergency fund"
                value={formData.hasEmergencyFund}
                options={EF_OPTIONS}
                onChange={(v) => setFormField("hasEmergencyFund", v)}
              />
              <SelectInput
                label="Contributing to 401k"
                value={formData.contributing401k}
                options={K401_OPTIONS}
                onChange={(v) => setFormField("contributing401k", v)}
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                id="insurance"
                type="checkbox"
                checked={formData.hasHealthInsurance}
                onChange={(e) => setFormField("hasHealthInsurance", e.target.checked)}
                className="w-4 h-4 accent-[var(--brand)]"
              />
              <label htmlFor="insurance" className="text-sm text-[var(--text)]">
                I have health insurance
              </label>
            </div>
          </Section>

          {error && <p className="text-[var(--danger)] text-sm mt-2">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-4 py-3 text-base disabled:opacity-60"
          >
            {loading ? "Calculating…" : "Calculate my score"}
          </button>
        </form>

        {/* ── Right: sidebar ─────────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-8 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)] mb-1">
              Autofill from bank statement
            </h2>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              Upload last month&apos;s PDF and we&apos;ll fill in your expenses automatically.
              Only merchant names and amounts are sent to the AI — no account numbers, balances, or personal details.
            </p>
            <PdfImport
              provider={formData.provider}
              apiKey={formData.apiKey}
              onImported={(data) => setFormData(data)}
            />
          </div>

          <div className="text-xs text-[var(--text-muted)] border-t border-[var(--border)] pt-4 space-y-1">
            <p>Your data never leaves your device unless you explicitly export it.</p>
            <p>No account required. No bank connection.</p>
          </div>
        </div>

      </div>
    </div>
  );
}