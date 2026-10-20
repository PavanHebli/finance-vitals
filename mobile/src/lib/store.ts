import { create } from "zustand";
import { randomUUID } from "expo-crypto";
import { budgetCardToRow, goalToRow } from "@vitals/shared";
import type {
  BudgetCard,
  DistributionLogEntry,
  FinancialProfile,
  Metrics,
  MetricScores,
  Mirror,
  UserGoal,
} from "@vitals/shared";
import { supabase } from "@/lib/supabase";

// The mobile app's shared memory. Everything the screens show lives here.
// Guests: in-memory only, gone when the app closes. Signed-in users also get
// every change saved to Supabase in the background (the `if (userId)` blocks).

// Run a database save in the background. The screen already shows the change,
// so a failed save is only logged, never shown to the user.
function saveInBackground(query: PromiseLike<{ error: unknown }>): void {
  Promise.resolve(query)
    .then((res) => {
      if (res?.error) console.warn("[sync]", res.error);
    })
    .catch((err) => console.warn("[sync]", err));
}

function defaultBudgetCards(): BudgetCard[] {
  return [
    { id: randomUUID(), label: "Income", type: "income", allocationMode: "fixed", allocationValue: 0, balance: 0, paused: false, color: "#5572f4", createdAt: "" },
    { id: randomUUID(), label: "Float", type: "cash", allocationMode: "remainder", allocationValue: 0, balance: 0, paused: false, color: "#22c55e", createdAt: "" },
  ];
}

function defaultFinancialProfile(): FinancialProfile {
  return { debtTotal: 0, debtMonthly: 0, savingsTotal: 0, profileComplete: false };
}

interface MobileStore {
  // Budget
  budgetCards: BudgetCard[];
  distributionLog: DistributionLogEntry[];
  financialProfile: FinancialProfile;
  // Goals
  goals: UserGoal[];
  // Score results (filled after the score API call)
  metrics: Metrics | null;
  metricScores: MetricScores | null;
  overallScore: number | null;
  mirror: Mirror | null;
  narrativeText: string;
  narrativeLoading: boolean;
  // Signed-in user id. null means guest.
  userId: string | null;

  addBudgetIncome: (amount: number) => void;
  addBudgetCard: (label: string, allocationMode: "percent" | "fixed", allocationValue: number, color: string, purpose: "expense" | "saving", description: string, goalAmount?: number) => void;
  updateBudgetCard: (id: string, updates: Partial<Pick<BudgetCard, "label" | "allocationMode" | "allocationValue" | "color" | "purpose" | "description" | "goalAmount" | "savedSoFar">>) => void;
  setBudgetCardBalance: (id: string, balance: number) => void;
  transferFromCash: (toCardId: string, amount: number) => { success: true } | { success: false; error: string };
  deleteBudgetCard: (id: string) => void;
  toggleBudgetPause: (id: string) => void;
  distributeBudget: () => { success: true } | { success: false; error: string };
  setFinancialProfile: (updates: Partial<FinancialProfile>) => void;

  addGoal: (goal: UserGoal) => void;
  removeGoal: (id: string) => void;
  updateSavingsProgress: (id: string, savedSoFar: number) => void;

  setResults: (metrics: Metrics, metricScores: MetricScores, overallScore: number, mirror: Mirror) => void;
  setNarrativeText: (text: string) => void;
  appendNarrative: (chunk: string) => void;
  setNarrativeLoading: (loading: boolean) => void;

  setBudgetCards: (cards: BudgetCard[]) => void;
  setGoals: (goals: UserGoal[]) => void;
  setDistributionLog: (log: DistributionLogEntry[]) => void;
  setUserId: (userId: string | null) => void;
  resetToGuestState: () => void;
}

export const useStore = create<MobileStore>()((set, get) => ({
  budgetCards: defaultBudgetCards(),
  distributionLog: [],
  financialProfile: defaultFinancialProfile(),
  goals: [],
  metrics: null,
  metricScores: null,
  overallScore: null,
  mirror: null,
  narrativeText: "",
  narrativeLoading: false,
  userId: null,

  addBudgetIncome: (amount) => {
    set((s) => ({
      budgetCards: s.budgetCards.map((c) =>
        c.type === "income" ? { ...c, balance: c.balance + amount } : c
      ),
    }));
    const { userId, budgetCards } = get();
    const income = budgetCards.find((c) => c.type === "income");
    if (userId && income) {
      saveInBackground(supabase.from("budget_cards").update({ balance: income.balance }).eq("id", income.id));
    }
  },

  addBudgetCard: (label, allocationMode, allocationValue, color, purpose, description, goalAmount) => {
    const newCard: BudgetCard = {
      id: randomUUID(),
      label,
      type: "custom",
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
    const customCountBefore = get().budgetCards.filter((c) => c.type === "custom").length;
    // New cards go before the Float card, which always stays last.
    set((s) => ({
      budgetCards: [
        ...s.budgetCards.filter((c) => c.type !== "cash"),
        newCard,
        ...s.budgetCards.filter((c) => c.type === "cash"),
      ],
    }));
    const { userId } = get();
    if (userId) {
      // sort_order 0 and 1 are the Income and Float rows, so custom cards start at 2.
      saveInBackground(supabase.from("budget_cards").insert(budgetCardToRow(newCard, userId, 2 + customCountBefore)));
    }
  },

  updateBudgetCard: (id, updates) => {
    set((s) => ({
      budgetCards: s.budgetCards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
    if (get().userId) {
      // Only send the columns that actually changed, under their database names.
      const row: Record<string, unknown> = {};
      if (updates.label !== undefined) row.label = updates.label;
      if (updates.allocationMode !== undefined) row.allocation_mode = updates.allocationMode;
      if (updates.allocationValue !== undefined) row.allocation_value = updates.allocationValue;
      if (updates.color !== undefined) row.color = updates.color;
      if (updates.purpose !== undefined) row.purpose = updates.purpose;
      if (updates.description !== undefined) row.description = updates.description;
      if (updates.goalAmount !== undefined) row.goal_amount = updates.goalAmount;
      if (updates.savedSoFar !== undefined) row.saved_so_far = updates.savedSoFar;
      if (Object.keys(row).length > 0) {
        saveInBackground(supabase.from("budget_cards").update(row).eq("id", id));
      }
    }
  },

  // Direct correction: set the exact balance instead of adding on top.
  setBudgetCardBalance: (id, balance) => {
    set((s) => ({
      budgetCards: s.budgetCards.map((c) => (c.id === id ? { ...c, balance } : c)),
    }));
    if (get().userId) {
      saveInBackground(supabase.from("budget_cards").update({ balance }).eq("id", id));
    }
  },

  // Move money already sitting in Float into one card.
  transferFromCash: (toCardId, amount) => {
    const { budgetCards } = get();
    const cash = budgetCards.find((c) => c.type === "cash");
    const target = budgetCards.find((c) => c.id === toCardId);
    if (!cash || !target) return { success: false, error: "Card not found." };
    if (amount <= 0) return { success: false, error: "Enter an amount greater than $0." };
    if (amount > cash.balance) return { success: false, error: `Only ${cash.balance.toFixed(0)} available in Float.` };

    set((s) => ({
      budgetCards: s.budgetCards.map((c) => {
        if (c.id === cash.id) return { ...c, balance: c.balance - amount };
        if (c.id === toCardId) return { ...c, balance: c.balance + amount };
        return c;
      }),
    }));
    if (get().userId) {
      saveInBackground(supabase.from("budget_cards").update({ balance: cash.balance - amount }).eq("id", cash.id));
      saveInBackground(supabase.from("budget_cards").update({ balance: target.balance + amount }).eq("id", toCardId));
    }
    return { success: true };
  },

  // Only custom cards can be deleted. Their balance goes back to Float.
  deleteBudgetCard: (id) => {
    const card = get().budgetCards.find((c) => c.id === id);
    if (!card || card.type !== "custom") return;
    set((s) => ({
      budgetCards: s.budgetCards
        .filter((c) => c.id !== id)
        .map((c) => (c.type === "cash" ? { ...c, balance: c.balance + card.balance } : c)),
    }));
    if (get().userId) {
      saveInBackground(supabase.from("budget_cards").delete().eq("id", id));
      const cash = get().budgetCards.find((c) => c.type === "cash");
      if (cash) {
        saveInBackground(supabase.from("budget_cards").update({ balance: cash.balance }).eq("id", cash.id));
      }
    }
  },

  toggleBudgetPause: (id) => {
    set((s) => ({
      budgetCards: s.budgetCards.map((c) =>
        c.id === id && c.type === "custom" ? { ...c, paused: !c.paused } : c
      ),
    }));
    if (get().userId) {
      const card = get().budgetCards.find((c) => c.id === id);
      if (card) {
        saveInBackground(supabase.from("budget_cards").update({ paused: card.paused }).eq("id", id));
      }
    }
  },

  // The Split button: spread the Income balance across the active cards.
  // Fixed-dollar cards first, then percent cards, and Float gets the rest.
  distributeBudget: () => {
    const { budgetCards, distributionLog } = get();
    const incomeCard = budgetCards.find((c) => c.type === "income");
    if (!incomeCard || incomeCard.balance <= 0) {
      return { success: false, error: "Add income before distributing." };
    }
    const income = incomeCard.balance;

    const activeCustom = budgetCards.filter((c) => c.type === "custom" && !c.paused);
    const fixedCards = activeCustom.filter((c) => c.allocationMode === "fixed");
    const percentCards = activeCustom.filter((c) => c.allocationMode === "percent");

    const totalFixed = fixedCards.reduce((sum, c) => sum + c.allocationValue, 0);
    if (totalFixed > income) {
      return { success: false, error: `Fixed allocations ($${totalFixed.toFixed(0)}) exceed income ($${income.toFixed(0)}).` };
    }

    const remaining = income - totalFixed;
    const totalPercent = percentCards.reduce((sum, c) => sum + c.allocationValue, 0);
    if (totalPercent > 100) {
      return { success: false, error: `Percentage allocations (${totalPercent.toFixed(0)}%) exceed 100%.` };
    }

    const cashAmount = remaining * (1 - totalPercent / 100);
    const allocations: DistributionLogEntry["allocations"] = [];

    const updatedCards = budgetCards.map((card) => {
      if (card.type === "income") return { ...card, balance: 0 };
      if (card.type === "cash") {
        allocations.push({ cardId: card.id, label: card.label, amount: cashAmount });
        return { ...card, balance: card.balance + cashAmount };
      }
      if (card.type === "custom" && !card.paused) {
        const amount =
          card.allocationMode === "fixed" ? card.allocationValue : (remaining * card.allocationValue) / 100;
        allocations.push({ cardId: card.id, label: card.label, amount });
        return { ...card, balance: card.balance + amount };
      }
      return card;
    });

    const entry: DistributionLogEntry = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      incomeAmount: income,
      allocations,
    };

    set({ budgetCards: updatedCards, distributionLog: [entry, ...distributionLog] });

    const { userId } = get();
    if (userId) {
      // Save only the cards whose balance changed, then the log entry.
      const oldBalances = new Map(budgetCards.map((c) => [c.id, c.balance]));
      for (const card of updatedCards) {
        if (card.balance !== oldBalances.get(card.id)) {
          saveInBackground(supabase.from("budget_cards").update({ balance: card.balance }).eq("id", card.id));
        }
      }
      saveInBackground(
        supabase.from("distribution_log").insert({
          id: entry.id,
          user_id: userId,
          income_amount: entry.incomeAmount,
          allocations: entry.allocations,
          timestamp: entry.timestamp,
        })
      );
    }
    return { success: true };
  },

  setFinancialProfile: (updates) => {
    set((s) => ({ financialProfile: { ...s.financialProfile, ...updates } }));
    const { userId, financialProfile } = get();
    if (userId) {
      saveInBackground(supabase.from("profiles").update({ financial_profile: financialProfile }).eq("id", userId));
    }
  },

  addGoal: (goal) => {
    set((s) => ({ goals: [...s.goals, goal] }));
    const { userId } = get();
    if (userId) {
      saveInBackground(supabase.from("goals").insert(goalToRow(goal, userId)));
    }
  },

  removeGoal: (id) => {
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
    if (get().userId) {
      saveInBackground(supabase.from("goals").delete().eq("id", id));
    }
  },

  updateSavingsProgress: (id, savedSoFar) => {
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === id && g.type === "savings" ? { ...g, saved_so_far: savedSoFar } : g
      ),
    }));
    if (get().userId) {
      saveInBackground(supabase.from("goals").update({ saved_so_far: savedSoFar }).eq("id", id));
    }
  },

  setResults: (metrics, metricScores, overallScore, mirror) =>
    set({ metrics, metricScores, overallScore, mirror }),
  setNarrativeText: (text) => set({ narrativeText: text }),
  appendNarrative: (chunk) => set((s) => ({ narrativeText: s.narrativeText + chunk })),
  setNarrativeLoading: (loading) => set({ narrativeLoading: loading }),

  setBudgetCards: (cards) => set({ budgetCards: cards }),
  setGoals: (goals) => set({ goals }),
  setDistributionLog: (log) => set({ distributionLog: log }),
  setUserId: (userId) => set({ userId }),

  resetToGuestState: () =>
    set({
      userId: null,
      budgetCards: defaultBudgetCards(),
      goals: [],
      distributionLog: [],
      financialProfile: defaultFinancialProfile(),
      metrics: null,
      metricScores: null,
      overallScore: null,
      mirror: null,
      narrativeText: "",
    }),
}));
