"use client";

import { create } from "zustand";
import { createClient } from "./supabase/client";
import type { FormData, Metrics, MetricScores, Mirror, Message, Snapshot, UserGoal, MetricKey, BudgetCard, DistributionLogEntry, FinancialProfile } from "./types";

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

// Fresh per-session ids for the two built-in cards. Guests never persist
// these; a signed-in user's real DB ids replace them entirely on hydration
// (see AccountHydrator). Must be valid uuids since Postgres's `id` column
// is `uuid` — the old literal "income"/"cash-in-hand" strings only worked
// because nothing was ever inserted with them.
function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function defaultBudgetCards(): BudgetCard[] {
  return [
    { id: newId(), label: "Income",       type: "income", allocationMode: "fixed",     allocationValue: 0, balance: 0, paused: false, color: "#5572f4", createdAt: "" },
    { id: newId(), label: "Cash in Hand", type: "cash",   allocationMode: "remainder", allocationValue: 0, balance: 0, paused: false, color: "#22c55e", createdAt: "" },
  ];
}

function defaultFinancialProfile(): FinancialProfile {
  return { debtTotal: 0, debtMonthly: 0, savingsTotal: 0, profileComplete: false };
}

// Fire a Supabase write in the background without blocking or throwing —
// local state is already updated and shown to the user by the time this
// runs, so a failed sync is logged, not surfaced. Matches the existing
// unchecked-write style already used by Header.tsx's clearAllData.
function fireAndForget(query: PromiseLike<{ error: unknown }>): void {
  Promise.resolve(query)
    .then((res) => {
      if (res?.error) console.warn("[sync]", res.error);
    })
    .catch((err) => console.warn("[sync]", err));
}

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
  addBudgetCard: (label: string, allocationMode: "percent" | "fixed", allocationValue: number, color: string, purpose: "expense" | "saving", description: string, goalAmount?: number) => void;
  updateBudgetCard: (id: string, updates: Partial<Pick<BudgetCard, "label" | "allocationMode" | "allocationValue" | "color" | "purpose" | "description" | "goalAmount" | "savedSoFar">>) => void;
  updateBudgetSaved: (id: string, savedSoFar: number) => void;
  setBudgetCardBalance: (id: string, balance: number) => void;
  transferFromCash: (toCardId: string, amount: number) => { success: true } | { success: false; error: string };
  deleteBudgetCard: (id: string) => void;
  toggleBudgetPause: (id: string) => void;
  distributeBudget: () => { success: true } | { success: false; error: string };
  setFinancialProfile: (updates: Partial<FinancialProfile>) => void;

  // Supabase sync — signed-in users only. `userId` is the single gate every
  // write-through below checks; guests never get a non-null value here, so
  // no Supabase call ever fires for them.
  userId: string | null;
  setBudgetCards: (cards: BudgetCard[]) => void;
  setGoals: (goals: UserGoal[]) => void;
  setDistributionLog: (log: DistributionLogEntry[]) => void;
  hydrateUserId: (userId: string | null) => void;
  resetToGuestState: () => void;
}

// In-memory only for Guests — no persistence, resets on every reload, per
// the app's zero-persistence-without-an-account model. Free/Pro accounts
// persist via Supabase: AccountHydrator pulls their rows in on login and
// calls the bulk setters below, and every mutating action here fires a
// background write once `userId` is set.
export const useStore = create<VitalsStore>()(
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
      budgetCards: defaultBudgetCards(),
      distributionLog: [],
      financialProfile: defaultFinancialProfile(),
      userId: null,

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

      addGoal: (goal) => {
        set((s) => ({ goals: [...s.goals, goal] }));
        const { userId } = get();
        if (userId) {
          const supabase = createClient();
          fireAndForget(supabase.from("goals").insert(goalToRow(goal, userId)));
        }
      },

      removeGoal: (id) => {
        set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
        const { userId } = get();
        if (userId) {
          const supabase = createClient();
          fireAndForget(supabase.from("goals").delete().eq("id", id));
        }
      },

      updateSavingsProgress: (id, savedSoFar) => {
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id && g.type === "savings" ? { ...g, saved_so_far: savedSoFar } : g
          ),
        }));
        const { userId } = get();
        if (userId) {
          const supabase = createClient();
          fireAndForget(supabase.from("goals").update({ saved_so_far: savedSoFar }).eq("id", id));
        }
      },

      setActiveTab: (tab) => set({ activeTab: tab }),

      addBudgetIncome: (amount) => {
        set(s => ({
          budgetCards: s.budgetCards.map(c =>
            c.type === "income" ? { ...c, balance: c.balance + amount } : c
          ),
        }));
        const { userId, budgetCards } = get();
        const income = budgetCards.find(c => c.type === "income");
        if (userId && income) {
          const supabase = createClient();
          fireAndForget(supabase.from("budget_cards").update({ balance: income.balance }).eq("id", income.id));
        }
      },

      addBudgetCard: (label, allocationMode, allocationValue, color, purpose, description, goalAmount) => {
        const newCard: BudgetCard = {
          id: newId(),
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
          ...(goalAmount && goalAmount > 0 ? { goalAmount, savedSoFar: 0 } : {}),
        };
        const customCountBefore = get().budgetCards.filter(c => c.type === "custom").length;

        set(s => ({
          budgetCards: [
            ...s.budgetCards.filter(c => c.type !== "cash"),
            newCard,
            ...s.budgetCards.filter(c => c.type === "cash"),
          ],
        }));

        const { userId } = get();
        if (userId) {
          const supabase = createClient();
          fireAndForget(supabase.from("budget_cards").insert(budgetCardToRow(newCard, userId, 2 + customCountBefore)));
        }
      },

      updateBudgetSaved: (id, savedSoFar) => {
        set(s => ({
          budgetCards: s.budgetCards.map(c => c.id === id ? { ...c, savedSoFar } : c),
        }));
        const { userId } = get();
        if (userId) {
          const supabase = createClient();
          fireAndForget(supabase.from("budget_cards").update({ saved_so_far: savedSoFar }).eq("id", id));
        }
      },

      // Direct correction, not an add-on-top — lets a mistaken entry (e.g.
      // "50k" meant to be "5k") be fixed exactly, instead of forcing the
      // user to compute and add a negative delta.
      setBudgetCardBalance: (id, balance) => {
        set(s => ({
          budgetCards: s.budgetCards.map(c => c.id === id ? { ...c, balance } : c),
        }));
        const { userId } = get();
        if (userId) {
          const supabase = createClient();
          fireAndForget(supabase.from("budget_cards").update({ balance }).eq("id", id));
        }
      },

      // Moves already-split, unallocated money sitting in Cash in Hand into
      // a specific card — distributeBudget only ever pulls from fresh
      // Income, so this is the only way to fund a card created *after* a
      // split with money that's already been distributed.
      transferFromCash: (toCardId, amount) => {
        const { budgetCards, userId } = get();
        const cash = budgetCards.find(c => c.type === "cash");
        const target = budgetCards.find(c => c.id === toCardId);
        if (!cash || !target) return { success: false as const, error: "Card not found." };
        if (amount <= 0) return { success: false as const, error: "Enter an amount greater than $0." };
        if (amount > cash.balance) return { success: false as const, error: `Only ${cash.balance.toFixed(0)} available in Cash in Hand.` };

        set(s => ({
          budgetCards: s.budgetCards.map(c => {
            if (c.id === cash.id)   return { ...c, balance: c.balance - amount };
            if (c.id === toCardId)  return { ...c, balance: c.balance + amount };
            return c;
          }),
        }));

        if (userId) {
          const supabase = createClient();
          fireAndForget(supabase.from("budget_cards").update({ balance: cash.balance - amount }).eq("id", cash.id));
          fireAndForget(supabase.from("budget_cards").update({ balance: target.balance + amount }).eq("id", toCardId));
        }

        return { success: true as const };
      },

      updateBudgetCard: (id, updates) => {
        set(s => ({
          budgetCards: s.budgetCards.map(c => c.id === id ? { ...c, ...updates } : c),
        }));
        const { userId } = get();
        if (userId) {
          const row: Record<string, unknown> = {};
          if (updates.label !== undefined)           row.label = updates.label;
          if (updates.allocationMode !== undefined)   row.allocation_mode = updates.allocationMode;
          if (updates.allocationValue !== undefined)  row.allocation_value = updates.allocationValue;
          if (updates.color !== undefined)            row.color = updates.color;
          if (updates.purpose !== undefined)          row.purpose = updates.purpose;
          if (updates.description !== undefined)      row.description = updates.description;
          if (updates.goalAmount !== undefined)       row.goal_amount = updates.goalAmount;
          if (updates.savedSoFar !== undefined)       row.saved_so_far = updates.savedSoFar;
          if (Object.keys(row).length > 0) {
            const supabase = createClient();
            fireAndForget(supabase.from("budget_cards").update(row).eq("id", id));
          }
        }
      },

      deleteBudgetCard: (id) => {
        const card = get().budgetCards.find(c => c.id === id);
        if (!card || card.type !== "custom") return;

        set(s => ({
          budgetCards: s.budgetCards
            .filter(c => c.id !== id)
            .map(c => c.type === "cash" ? { ...c, balance: c.balance + card.balance } : c),
        }));

        const { userId, budgetCards } = get();
        if (userId) {
          const supabase = createClient();
          fireAndForget(supabase.from("budget_cards").delete().eq("id", id));
          const cash = budgetCards.find(c => c.type === "cash");
          if (cash) {
            fireAndForget(supabase.from("budget_cards").update({ balance: cash.balance }).eq("id", cash.id));
          }
        }
      },

      toggleBudgetPause: (id) => {
        set(s => ({
          budgetCards: s.budgetCards.map(c =>
            c.id === id && c.type === "custom" ? { ...c, paused: !c.paused } : c
          ),
        }));
        const { userId, budgetCards } = get();
        if (userId) {
          const card = budgetCards.find(c => c.id === id);
          if (card) {
            const supabase = createClient();
            fireAndForget(supabase.from("budget_cards").update({ paused: card.paused }).eq("id", id));
          }
        }
      },

      distributeBudget: () => {
        const { budgetCards, distributionLog, userId } = get();
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

        if (userId) {
          const supabase = createClient();
          const originalBalanceById = new Map(budgetCards.map(c => [c.id, c.balance]));
          for (const card of updatedCards) {
            if (card.balance !== originalBalanceById.get(card.id)) {
              fireAndForget(supabase.from("budget_cards").update({ balance: card.balance }).eq("id", card.id));
            }
          }
          fireAndForget(supabase.from("distribution_log").insert({
            id: entry.id,
            user_id: userId,
            income_amount: entry.incomeAmount,
            allocations: entry.allocations,
            timestamp: entry.timestamp,
          }));
        }

        return { success: true as const };
      },

      setFinancialProfile: (updates) => {
        set(s => ({ financialProfile: { ...s.financialProfile, ...updates } }));
        const { userId, financialProfile } = get();
        if (userId) {
          const supabase = createClient();
          fireAndForget(supabase.from("profiles").update({ financial_profile: financialProfile }).eq("id", userId));
        }
      },

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

      setBudgetCards: (cards) => set({ budgetCards: cards }),
      setGoals: (goals) => set({ goals }),
      setDistributionLog: (log) => set({ distributionLog: log }),
      hydrateUserId: (userId) => set({ userId }),
      resetToGuestState: () =>
        set({
          userId: null,
          budgetCards: defaultBudgetCards(),
          goals: [],
          distributionLog: [],
          financialProfile: defaultFinancialProfile(),
        }),
    })
);

// ── Supabase row mapping ────────────────────────────────────────────────────
// Converts between the store's camelCase shapes and the DB's snake_case
// columns (see supabase/migrations/0001_core_schema.sql). Exported so
// AccountHydrator can reuse the same mapping when reading rows back in.

interface BudgetCardRow {
  id: string;
  label: string;
  type: "income" | "cash" | "custom";
  allocation_mode: "percent" | "fixed" | "remainder";
  allocation_value: number;
  balance: number;
  paused: boolean;
  color: string;
  purpose: "expense" | "saving" | null;
  description: string | null;
  goal_amount: number | null;
  saved_so_far: number | null;
  created_at: string;
}

export function budgetCardToRow(card: BudgetCard, userId: string, sortOrder: number): Record<string, unknown> {
  return {
    id: card.id,
    user_id: userId,
    label: card.label,
    type: card.type,
    allocation_mode: card.allocationMode,
    allocation_value: card.allocationValue,
    balance: card.balance,
    paused: card.paused,
    color: card.color,
    purpose: card.purpose ?? null,
    description: card.description ?? null,
    goal_amount: card.goalAmount ?? null,
    saved_so_far: card.savedSoFar ?? null,
    sort_order: sortOrder,
  };
}

export function rowToBudgetCard(row: BudgetCardRow): BudgetCard {
  return {
    id: row.id,
    label: row.label,
    type: row.type,
    allocationMode: row.allocation_mode,
    allocationValue: row.allocation_value,
    balance: row.balance,
    paused: row.paused,
    color: row.color,
    createdAt: row.created_at,
    purpose: row.purpose ?? undefined,
    description: row.description ?? undefined,
    goalAmount: row.goal_amount ?? undefined,
    savedSoFar: row.saved_so_far ?? undefined,
  };
}

interface GoalRow {
  id: string;
  type: "metric" | "savings";
  metric: string | null;
  label: string | null;
  target: number | null;
  direction: "up" | "down" | null;
  baseline: number | null;
  name: string | null;
  target_amount: number | null;
  saved_so_far: number | null;
  monthly_contribution: number | null;
  target_date: string | null;
  set_month: string | null;
}

export function goalToRow(goal: UserGoal, userId: string): Record<string, unknown> {
  const base = { id: goal.id, user_id: userId, type: goal.type, set_month: goal.set_month };
  if (goal.type === "metric") {
    return {
      ...base,
      metric: goal.metric,
      label: goal.label,
      target: goal.target,
      direction: goal.direction,
      baseline: goal.baseline,
    };
  }
  return {
    ...base,
    name: goal.name,
    target_amount: goal.target_amount,
    saved_so_far: goal.saved_so_far,
    monthly_contribution: goal.monthly_contribution,
    target_date: goal.target_date ?? null,
  };
}

export function rowToGoal(row: GoalRow): UserGoal {
  if (row.type === "metric") {
    return {
      type: "metric",
      id: row.id,
      metric: (row.metric ?? "savings_rate") as MetricKey,
      label: row.label ?? "",
      target: row.target ?? 0,
      direction: row.direction ?? "up",
      baseline: row.baseline ?? 0,
      set_month: row.set_month ?? "",
    };
  }
  return {
    type: "savings",
    id: row.id,
    name: row.name ?? "",
    target_amount: row.target_amount ?? 0,
    saved_so_far: row.saved_so_far ?? 0,
    monthly_contribution: row.monthly_contribution ?? 0,
    target_date: row.target_date ?? undefined,
    set_month: row.set_month ?? "",
  };
}

interface DistributionLogRow {
  id: string;
  income_amount: number;
  allocations: DistributionLogEntry["allocations"];
  timestamp: string;
}

export function rowToDistributionEntry(row: DistributionLogRow): DistributionLogEntry {
  return {
    id: row.id,
    timestamp: row.timestamp,
    incomeAmount: row.income_amount,
    allocations: row.allocations,
  };
}

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
  const unclassifiedCardTotal = expenseCards
    .filter(c => !classifiedExpenseIds.has(c.id))
    .reduce((sum, c) => sum + cardAmount(c), 0);

  // A card always wins when one exists; the Financial Profile's manual
  // housingMonthly/expensesMonthly are only a fallback for whatever isn't
  // represented by a card yet, so a real card never gets silently
  // overridden by a stale manually-entered number.
  const rentAmount       = housing ? cardAmount(housing) : (profile.housingMonthly ?? 0);
  const groceriesAmount  = groceries ? cardAmount(groceries) : 0;
  const transportAmount  = transport ? cardAmount(transport) : 0;
  const diningAmount     = dining    ? cardAmount(dining)    : 0;
  const subsAmount       = subs      ? cardAmount(subs)      : 0;
  // The manual "monthly expenses" fallback only applies when there are no
  // expense cards at all — once even one exists, we trust the cards.
  const otherAmount = unclassifiedCardTotal + (expenseCards.length === 0 ? (profile.expensesMonthly ?? 0) : 0);

  const expensesTotal = rentAmount + groceriesAmount + transportAmount + diningAmount + subsAmount + otherAmount;

  // Monthly savings contributions from saving cards (informs savings rate)
  const monthlySavingsContribution = savingCards.reduce((sum, c) => sum + cardAmount(c), 0);

  return {
    income_main:             income,
    income_additional:       0,
    expenses_rent:           rentAmount,
    expenses_groceries:      groceriesAmount,
    expenses_transport:      transportAmount,
    expenses_subscriptions:  subsAmount,
    expenses_dining:         diningAmount,
    expenses_shopping:       0,
    expenses_other:          otherAmount,
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
