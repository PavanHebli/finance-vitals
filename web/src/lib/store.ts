"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FormData, Metrics, MetricScores, Mirror, Message, Snapshot, Goal } from "./types";

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
  goal: Goal | null;
  goalDismissed: boolean;
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
  setGoal: (goal: Goal | null) => void;
  setGoalDismissed: (dismissed: boolean) => void;
  setActiveTab: (tab: string) => void;
  resetResults: () => void;
}

export const useStore = create<VitalsStore>()(
  persist(
    (set) => ({
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
      goal: null,
      goalDismissed: false,
      activeTab: "story",

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

      setGoal: (goal) => set({ goal }),
      setGoalDismissed: (dismissed) => set({ goalDismissed: dismissed }),
      setActiveTab: (tab) => set({ activeTab: tab }),

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
          goal: null,
          goalDismissed: false,
          activeTab: "story",
        }),
    }),
    {
      name: "vitals-store",
      // Don't persist loading state
      partialize: (s) => ({ ...s, narrativeLoading: false }),
    }
  )
);

/** Converts the Zustand formData to the snake_case dict the API expects */
export function toApiFormData(fd: FormData): Record<string, unknown> {
  return {
    income_main:            fd.incomeMain,
    income_additional:      fd.incomeAdditional,
    expenses_rent:          fd.expensesRent,
    expenses_groceries:     fd.expensesGroceries,
    expenses_transport:     fd.expensesTransport,
    expenses_subscriptions: fd.expensesSubscriptions,
    expenses_dining:        fd.expensesDining,
    expenses_shopping:      fd.expensesShopping,
    expenses_other:         fd.expensesOther,
    expenses_total_estimate: fd.expensesTotalEstimate || (fd.expensesRent + fd.expensesGroceries + fd.expensesTransport + fd.expensesSubscriptions + fd.expensesDining + fd.expensesShopping + fd.expensesOther),
    savings_total:          fd.savingsTotal,
    investments_total:      fd.investmentsTotal,
    debt_total:             fd.debtTotal,
    debt_monthly:           fd.debtMonthly,
    age:                    fd.age,
    employment:             fd.employment,
    has_health_insurance:   fd.hasHealthInsurance,
    has_emergency_fund:     fd.hasEmergencyFund,
    contributing_401k:      fd.contributing401k,
    section2_visible:       fd.section2Open,
    section3_visible:       fd.section3Open,
    section4_visible:       fd.section4Open,
  };
}
