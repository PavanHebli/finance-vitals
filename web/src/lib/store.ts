"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FormData, Metrics, MetricScores, Mirror, Message, Snapshot, UserGoal, BudgetCard, DistributionLogEntry, FinancialProfile } from "./types";

const DEFAULT_FORM: FormData = {
  provider: "",
  apiKey: "",
  incomeMain: 0,
  incomeAdditional: 0,
  section2Open: false,
  expensesRent: 0,
  expensesGroceries: 0,
  expensesTransport: 0,
  expensesSubscriptions: 0,
  expensesDining: 0,
  expensesShopping: 0,
  expensesOther: 0,
  expensesTotalEstimate: 0,
  section3Open: false,
  savingsTotal: 0,
  investmentsTotal: 0,
  debtTotal: 0,
  debtMonthly: 0,
  section4Open: false,
  age: null,
  employment: null,
  hasHealthInsurance: false,
  hasEmergencyFund: null,
  contributing401k: null,
};

interface VitalsStore {
  formData: FormData;
  metrics: Metrics | null;
  metricScores: MetricScores | null;
  overallScore: number | null;
  mirror: Mirror | null;
  narrativeText: string;
  narrativeLoading: boolean;
  chatHistory: Message[];
  chatSummary: string;
  snapshots: Snapshot[];
  goals: UserGoal[];
  activeTab: string;

  setFormField: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  setFormData: (data: Partial<FormData>) => void;
  setResults: (metrics: Metrics, metricScores: MetricScores, overallScore: number, mirror: Mirror) => void;
  setNarrativeText: (text: string) => void;
  appendNarrative: (chunk: string) => void;
  setNarrativeLoading: (loading: boolean) => void;
  addChatMessage: (msg: Message) => void;
  setChatSummary: (summary: string) => void;
  clearChat: () => void;
  addSnapshot: (snap: Snapshot) => void;
  setSnapshots: (snaps: Snapshot[]) => void;
  addGoal: (goal: UserGoal) => void;
  removeGoal: (id: string) => void;
  updateSavingsProgress: (id: string, savedSoFar: number) => void;
  setActiveTab: (tab: string) => void;
  resetResults: () => void;

  // Budget planner
  budgetCards: BudgetCard[];
  distributionLog: DistributionLogEntry[];
  financialProfile: FinancialProfile;
  addBudgetIncome: (amount: number) => void;
  addBudgetCard: (label: string, allocationMode: "percent" | "fixed", allocationValue: number, color: string, purpose: "expense" | "saving", description: string) => void;
  updateBudgetCard: (id: string, updates: Partial<Pick<BudgetCard, "label" | "allocationMode" | "allocationValue" | "color" | "purpose" | "description">>) => void;
  deleteBudgetCard: (id: string) => void;
  toggleBudgetPause: (id: string) => void;
  distributeBudget: () => { success: true } | { success: false; error: string };
  setFinancialProfile: (updates: Partial<FinancialProfile>) => void;
}

export const useStore = create<VitalsStore>()(
  persist(
    (set, get) => ({
      formData: DEFAULT_FORM,
      metrics: null,
      metricScores: null,
      overallScore: null,
      mirror: null,
      narrativeText: "",
      narrativeLoading: false,
      chatHistory: [],
      chatSummary: "",
      snapshots: [],
      goals: [],
      activeTab: "story",
      budgetCards: [
        { id: "income",       label: "Income",       type: "income", allocationMode: "fixed",     allocationValue: 0, balance: 0, paused: false, color: "#5572f4", createdAt: "" },
        { id: "cash-in-hand", label: "Cash in Hand", type: "cash",   allocationMode: "remainder", allocationValue: 0, balance: 0, paused: false, color: "#22c55e", createdAt: "" },
      ],
      distributionLog: [],
      financialProfile: { debtTotal: 0, debtMonthly: 0, savingsTotal: 0, profileComplete: false },

      setFormField: (key, value) =>
        set((s) => ({ formData: { ...s.formData, [key]: value } })),

      setFormData: (data) =>
        set((s) => ({ formData: { ...s.formData, ...data } })),

      setResults: (metrics, metricScores, overallScore, mirror) =>
        set({ metrics, metricScores, overallScore, mirror }),

      setNarrativeText: (text) => set({ narrativeText: text }),
      appendNarrative: (chunk) =>
        set((s) => ({ narrativeText: s.narrativeText + chunk })),
      setNarrativeLoading: (loading) => set({ narrativeLoading: loading }),

      addChatMessage: (msg) =>
        set((s) => ({ chatHistory: [...s.chatHistory, msg] })),
      setChatSummary: (summary) => set({ chatSummary: summary }),
      clearChat: () => set({ chatHistory: [], chatSummary: "" }),

      addSnapshot: (snap) =>
        set((s) => {
          const existing = s.snapshots.filter((x) => x.saved_at !== snap.saved_at);
          return { snapshots: [...existing, snap] };
        }),
      setSnapshots: (snaps) => set({ snapshots: snaps }),

      addGoal: (goal) =>
        set((s) => ({ goals: [...s.goals, goal] })),

      removeGoal: (id) =>
        set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

      updateSavingsProgress: (id, savedSoFar) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id && g.type === "savings" ? { ...g, saved_so_far: savedSoFar } : g
          ),
        })),

      setActiveTab: (tab) => set({ activeTab: tab }),

      addBudgetIncome: (amount) =>
        set(s => ({
          budgetCards: s.budgetCards.map(c =>
            c.type === "income" ? { ...c, balance: c.balance + amount } : c
          ),
        })),

      addBudgetCard: (label, allocationMode, allocationValue, color, purpose, description) =>
        set(s => ({
          budgetCards: [
            ...s.budgetCards.filter(c => c.type !== "cash"),
            {
              id: crypto.randomUUID(),
              label,
              type: "custom" as const,
              allocationMode,
              allocationValue,
              balance: 0,
              paused: false,
              color,
              purpose,
              description,
              createdAt: new Date().toISOString(),
            },
            ...s.budgetCards.filter(c => c.type === "cash"),
          ],
        })),

      updateBudgetCard: (id, updates) =>
        set(s => ({
          budgetCards: s.budgetCards.map(c => c.id === id ? { ...c, ...updates } : c),
        })),

      deleteBudgetCard: (id) =>
        set(s => {
          const card = s.budgetCards.find(c => c.id === id);
          if (!card || card.type !== "custom") return s;
          return {
            budgetCards: s.budgetCards
              .filter(c => c.id !== id)
              .map(c => c.type === "cash" ? { ...c, balance: c.balance + card.balance } : c),
          };
        }),

      toggleBudgetPause: (id) =>
        set(s => ({
          budgetCards: s.budgetCards.map(c =>
            c.id === id && c.type === "custom" ? { ...c, paused: !c.paused } : c
          ),
        })),

      distributeBudget: () => {
        const { budgetCards, distributionLog } = get();
        const incomeCard = budgetCards.find(c => c.type === "income")!;
        const income = incomeCard.balance;

        if (income <= 0) return { success: false as const, error: "Add income before distributing." };

        const activeCustom = budgetCards.filter(c => c.type === "custom" && !c.paused);
        const fixedCards   = activeCustom.filter(c => c.allocationMode === "fixed");
        const percentCards = activeCustom.filter(c => c.allocationMode === "percent");

        const totalFixed = fixedCards.reduce((sum, c) => sum + c.allocationValue, 0);
        if (totalFixed > income)
          return { success: false as const, error: `Fixed allocations ($${totalFixed.toFixed(0)}) exceed income ($${income.toFixed(0)}).` };

        const remaining    = income - totalFixed;
        const totalPercent = percentCards.reduce((sum, c) => sum + c.allocationValue, 0);
        if (totalPercent > 100)
          return { success: false as const, error: `Percentage allocations (${totalPercent.toFixed(0)}%) exceed 100%.` };

        const cashAmount = remaining * (1 - totalPercent / 100);
        const allocations: DistributionLogEntry["allocations"] = [];

        const updatedCards = budgetCards.map(card => {
          if (card.type === "income") return { ...card, balance: 0 };
          if (card.type === "cash") {
            allocations.push({ cardId: card.id, label: card.label, amount: cashAmount });
            return { ...card, balance: card.balance + cashAmount };
          }
          if (card.type === "custom" && !card.paused) {
            const amount = card.allocationMode === "fixed"
              ? card.allocationValue
              : remaining * card.allocationValue / 100;
            allocations.push({ cardId: card.id, label: card.label, amount });
            return { ...card, balance: card.balance + amount };
          }
          return card;
        });

        const entry: DistributionLogEntry = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          incomeAmount: income,
          allocations,
        };

        set({ budgetCards: updatedCards, distributionLog: [entry, ...distributionLog] });
        return { success: true as const };
      },

      setFinancialProfile: (updates) =>
        set(s => ({ financialProfile: { ...s.financialProfile, ...updates } })),

      resetResults: () =>
        set({
          metrics: null,
          metricScores: null,
          overallScore: null,
          mirror: null,
          narrativeText: "",
          narrativeLoading: false,
          chatHistory: [],
          chatSummary: "",
          activeTab: "story",
        }),
    }),
    {
      name: "vitals-store",
      partialize: (s) => ({ ...s, narrativeLoading: false }),
    }
  )
);

/** Serialises the budget planner state into a string for chat context injection */
export function formatBudgetContext(budgetCards: BudgetCard[], distributionLog: DistributionLogEntry[]): string {
  const customCards = budgetCards.filter(c => c.type === "custom");
  if (customCards.length === 0 && distributionLog.length === 0) return "";

  const lines: string[] = ["BUDGET PLANNER (user-configured envelopes):"];

  const incomeCard = budgetCards.find(c => c.type === "income");
  if (incomeCard && incomeCard.balance > 0)
    lines.push(`- Income available to distribute: $${incomeCard.balance.toFixed(0)}`);

  for (const card of customCards) {
    const alloc = card.allocationMode === "percent"
      ? `${card.allocationValue}% of income`
      : `$${card.allocationValue.toFixed(0)} fixed`;
    const paused = card.paused ? " (paused)" : "";
    lines.push(`- ${card.label}: ${alloc} — $${card.balance.toFixed(0)} accumulated${paused}`);
  }

  const cashCard = budgetCards.find(c => c.type === "cash");
  if (cashCard)
    lines.push(`- Cash in Hand (unallocated remainder): $${cashCard.balance.toFixed(0)} accumulated`);

  if (distributionLog.length > 0) {
    const total = distributionLog.reduce((sum, e) => sum + e.incomeAmount, 0);
    lines.push(`\nDistributions made: ${distributionLog.length} | Total distributed: $${total.toFixed(0)}`);
    const latest = distributionLog[0];
    lines.push(`Most recent: $${latest.incomeAmount.toFixed(0)} on ${new Date(latest.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`);
  }

  return lines.join("\n");
}

/**
 * Maps budget planner state + financial profile to the snake_case dict the score API expects.
 * Uses the last distribution's amounts when available (most accurate monthly figures).
 * Pattern-matches card labels to expense categories; unmatched cards go into expenses_other.
 */
export function budgetToFormData(
  budgetCards: BudgetCard[],
  distributionLog: DistributionLogEntry[],
  profile: FinancialProfile
): Record<string, unknown> {
  const incomeCard  = budgetCards.find(c => c.type === "income")!;
  const customCards = budgetCards.filter(c => c.type === "custom" && !c.paused);

  // Use last split amount as monthly income proxy; fall back to pending balance
  const income = distributionLog.length > 0
    ? distributionLog[0].incomeAmount
    : incomeCard.balance;

  // Use actual split amounts when available — more accurate than formula
  const lastAlloc = distributionLog.length > 0
    ? new Map(distributionLog[0].allocations.map(a => [a.cardId, a.amount]))
    : null;

  function cardAmount(card: BudgetCard): number {
    if (lastAlloc) return lastAlloc.get(card.id) ?? 0;
    if (card.allocationMode === "fixed")   return card.allocationValue;
    if (card.allocationMode === "percent") return (card.allocationValue / 100) * income;
    return 0;
  }

  // Split by user-confirmed purpose — saving cards never pollute expense ratios
  const expenseCards = customCards.filter(c => (c.purpose ?? "expense") === "expense");
  const savingCards  = customCards.filter(c => c.purpose === "saving");

  // Within expense cards, pattern-match for specific buckets
  const housing   = expenseCards.find(c => /rent|hous|mortg/i.test(c.label));
  const transport = expenseCards.find(c => /transport|commut|fuel|petrol|gas/i.test(c.label));
  const groceries = expenseCards.find(c => /grocer|food|supermark/i.test(c.label));
  const dining    = expenseCards.find(c => /din|restaur|eat.?out|takeout/i.test(c.label));
  const subs      = expenseCards.find(c => /subscri|netflix|spotify|stream/i.test(c.label));

  const classifiedExpenseIds = new Set(
    [housing, transport, groceries, dining, subs]
      .filter((c): c is BudgetCard => Boolean(c))
      .map(c => c.id)
  );
  const otherExpenses = expenseCards
    .filter(c => !classifiedExpenseIds.has(c.id))
    .reduce((sum, c) => sum + cardAmount(c), 0);

  const expensesTotal = expenseCards.reduce((sum, c) => sum + cardAmount(c), 0);

  // Monthly savings contributions from saving cards (informs savings rate)
  const monthlySavingsContribution = savingCards.reduce((sum, c) => sum + cardAmount(c), 0);

  return {
    income_main:             income,
    income_additional:       0,
    expenses_rent:           housing   ? cardAmount(housing)   : 0,
    expenses_groceries:      groceries ? cardAmount(groceries) : 0,
    expenses_transport:      transport ? cardAmount(transport) : 0,
    expenses_subscriptions:  subs      ? cardAmount(subs)      : 0,
    expenses_dining:         dining    ? cardAmount(dining)    : 0,
    expenses_shopping:       0,
    expenses_other:          otherExpenses,
    expenses_total_estimate: expensesTotal,
    savings_total:           profile.savingsTotal + monthlySavingsContribution,
    investments_total:       0,
    debt_total:              profile.debtTotal,
    debt_monthly:            profile.debtMonthly,
    age:                     null,
    employment:              null,
    has_health_insurance:    false,
    has_emergency_fund:      profile.savingsTotal > 0 ? "yes" : "no",
    contributing_401k:       null,
    section2_visible:        true,
    section3_visible:        true,
    section4_visible:        false,
  };
}

/** Converts the Zustand formData to the snake_case dict the API expects */
export function toApiFormData(fd: FormData): Record<string, unknown> {
  return {
    income_main:             fd.incomeMain,
    income_additional:       fd.incomeAdditional,
    expenses_rent:           fd.expensesRent,
    expenses_groceries:      fd.expensesGroceries,
    expenses_transport:      fd.expensesTransport,
    expenses_subscriptions:  fd.expensesSubscriptions,
    expenses_dining:         fd.expensesDining,
    expenses_shopping:       fd.expensesShopping,
    expenses_other:          fd.expensesOther,
    expenses_total_estimate: fd.expensesTotalEstimate || (fd.expensesRent + fd.expensesGroceries + fd.expensesTransport + fd.expensesSubscriptions + fd.expensesDining + fd.expensesShopping + fd.expensesOther),
    savings_total:           fd.savingsTotal,
    investments_total:       fd.investmentsTotal,
    debt_total:              fd.debtTotal,
    debt_monthly:            fd.debtMonthly,
    age:                     fd.age,
    employment:              fd.employment,
    has_health_insurance:    fd.hasHealthInsurance,
    has_emergency_fund:      fd.hasEmergencyFund,
    contributing_401k:       fd.contributing401k,
    section2_visible:        fd.section2Open,
    section3_visible:        fd.section3Open,
    section4_visible:        fd.section4Open,
  };
}
