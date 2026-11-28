"use client";

import { useState } from "react";
import { monthlyToPerPaycheck, paychecksPerYear, perPaycheckToWeekly, type PayFrequency } from "@vitals/shared";
import { analytics } from "@/lib/analytics";

// The landing page demo: type a paycheck, rent and bills, and see the weekly
// spending number change as you type. Nothing is saved. It uses the same
// shared math as the app (per paycheck amounts, weekly number), so the demo
// and the real plan always agree.

const FREQUENCIES: { value: PayFrequency; label: string }[] = [
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "semimonthly", label: "Twice a month" },
  { value: "monthly", label: "Monthly" },
];

// The example once-in-a-while cost: $600 car insurance every 6 months.
const INSURANCE = 600;

function money(value: number): string {
  return "$" + Math.round(value).toLocaleString("en-US");
}

function NumberInput({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="flex items-center gap-2 input">
        <span className="text-[var(--text-muted)]">$</span>
        <input
          inputMode="decimal"
          className="w-full bg-transparent outline-none"
          value={value === 0 ? "" : String(value)}
          placeholder="0"
          onChange={(e) => {
            const parsed = parseFloat(e.target.value.replace(/[^0-9.]/g, ""));
            onChange(Number.isNaN(parsed) ? 0 : parsed);
          }}
        />
      </div>
      <span className="text-xs text-[var(--text-muted)]">{hint}</span>
    </label>
  );
}

export function PaycheckDemo() {
  const [paycheck, setPaycheck] = useState(2000);
  const [frequency, setFrequency] = useState<PayFrequency>("biweekly");
  const [rent, setRent] = useState(1300);
  const [bills, setBills] = useState(400);
  const [saving, setSaving] = useState(100);
  const [withInsurance, setWithInsurance] = useState(false);
  const [touched, setTouched] = useState(false);

  // Rent and bills are known per month; the plan takes each paycheck's share.
  const rentShare = monthlyToPerPaycheck(rent, frequency);
  const billsShare = monthlyToPerPaycheck(bills, frequency);
  // $600 every 6 months, spread over the paychecks in those 6 months.
  const insuranceShare = withInsurance ? INSURANCE / (paychecksPerYear(frequency) / 2) : 0;
  const spending = paycheck - rentShare - billsShare - saving - insuranceShare;
  const weekly = perPaycheckToWeekly(spending, frequency);

  // Track the first change only: "did anyone play with the demo?"
  function change<T>(setter: (v: T) => void) {
    return (v: T) => {
      if (!touched) {
        setTouched(true);
        analytics.track("demo_used");
      }
      setter(v);
    };
  }

  const parts = [
    { label: "Rent", amount: rentShare, color: "#a08200" },
    { label: "Bills", amount: billsShare, color: "#dc6e00" },
    { label: "Car insurance", amount: insuranceShare, color: "#9b51e0" },
    { label: "Savings", amount: saving, color: "#00a043" },
    { label: "Spending", amount: Math.max(0, spending), color: "var(--brand)" },
  ].filter((p) => p.amount > 0);
  const barTotal = Math.max(paycheck, parts.reduce((sum, p) => sum + p.amount, 0)) || 1;

  return (
    <div className="grid md:grid-cols-2 gap-6 items-start">
      {/* Inputs */}
      <div className="card space-y-4">
        <NumberInput label="Your paycheck" hint="Take-home, after tax" value={paycheck} onChange={change(setPaycheck)} />
        <div>
          <span className="label">How often you're paid</span>
          <div className="flex flex-wrap gap-2">
            {FREQUENCIES.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => change(setFrequency)(f.value)}
                className={`px-3 py-1.5 rounded-lg border text-sm ${
                  frequency === f.value
                    ? "border-[var(--brand)] text-[var(--brand)] font-semibold bg-[color-mix(in_srgb,var(--brand)_10%,transparent)]"
                    : "border-[var(--border)] text-[var(--text)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <NumberInput label="Rent or mortgage" hint="Per month" value={rent} onChange={change(setRent)} />
        <NumberInput label="Other bills" hint="Per month: phone, internet, loans…" value={bills} onChange={change(setBills)} />
        <NumberInput label="Save from each paycheck" hint="Toward a goal or a cushion" value={saving} onChange={change(setSaving)} />
        <label className="flex items-start gap-3 rounded-lg border border-[var(--border)] p-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 accent-[var(--brand)]"
            checked={withInsurance}
            onChange={(e) => change(setWithInsurance)(e.target.checked)}
          />
          <span className="text-sm">
            <span className="font-semibold">Add a cost that doesn't come every month</span>
            <span className="block text-[var(--text-muted)]">
              Car insurance, {money(INSURANCE)} every 6 months. Most budgets break on these.
            </span>
          </span>
        </label>
      </div>

      {/* Result */}
      <div className="card md:sticky md:top-20">
        <p className="text-sm text-[var(--text-muted)]">You can spend about</p>
        <p className={`text-5xl font-extrabold my-1 ${weekly < 0 ? "text-[var(--danger)]" : "text-[var(--text)]"}`}>
          {weekly < 0 ? "−" : ""}
          {money(Math.abs(weekly))} <span className="text-2xl font-bold">a week</span>
        </p>
        <p className="text-sm text-[var(--text-muted)] mb-5">until your next payday, after everything below is covered.</p>

        {spending < 0 && (
          <p className="text-sm text-[var(--danger)] mb-4">
            This plan is {money(-spending)} more than your paycheck. The app shows you what to shrink.
          </p>
        )}

        <div className="flex h-4 rounded-full overflow-hidden mb-4 bg-[var(--border)]">
          {parts.map((p) => (
            <div key={p.label} style={{ width: `${(p.amount / barTotal) * 100}%`, background: p.color }} />
          ))}
        </div>
        <div className="space-y-2 text-sm">
          {parts.map((p) => (
            <div key={p.label} className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                {p.label}
              </span>
              <span className="font-semibold">{money(p.amount)} per paycheck</span>
            </div>
          ))}
        </div>

        {withInsurance && (
          <p className="text-sm mt-4 rounded-lg p-3 bg-[color-mix(in_srgb,#9b51e0_10%,transparent)]">
            Putting aside {money(insuranceShare)} each paycheck means the {money(INSURANCE)} bill is already covered when it
            arrives, instead of being a surprise.
          </p>
        )}
      </div>
    </div>
  );
}
