"use client";

import { create } from "zustand";
import { createClient } from "./supabase/client";
import type { FormData, Metrics, MetricScores, Mirror, Message, Snapshot, UserGoal, BudgetCard, DistributionLogEntry, FinancialProfile } from "./types";
import {
  budgetCardToRow,
  rowToBudgetCard,
  goalToRow,
  rowToGoal,
  rowToDistributionEntry,
  formatBudgetContext,
  budgetToFormData,
  toApiFormData,
} from "@vitals/shared";

// Re-exported so existing `import { budgetToFormData } from "@/lib/store"`-
// style imports elsewhere in the app keep working unchanged — the actual
// implementations now live in packages/shared, shared with mobile.
export { budgetCardToRow, rowToBudgetCard, goalToRow, rowToGoal, rowToDistributionEntry, formatBudgetContext, budgetToFormData, toApiFormData };

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

