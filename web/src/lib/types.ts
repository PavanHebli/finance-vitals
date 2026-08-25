export interface FormData {
  // API config
  provider: string;
  apiKey: string;
  // Income
  incomeMain: number;
  incomeAdditional: number;
  // Expenses (section 2)
  section2Open: boolean;
  expensesRent: number;
  expensesGroceries: number;
  expensesTransport: number;
  expensesSubscriptions: number;
  expensesDining: number;
  expensesShopping: number;
  expensesOther: number;
  expensesTotalEstimate: number;
  // Position (section 3)
  section3Open: boolean;
  savingsTotal: number;
  investmentsTotal: number;
  debtTotal: number;
  debtMonthly: number;
  // Profile (section 4)
  section4Open: boolean;
  age: number | null;
  employment: string | null;
  hasHealthInsurance: boolean;
  hasEmergencyFund: string | null;
  contributing401k: string | null;
}

export interface MetricScore {
  score: number;
  status: "danger" | "warning" | "ok" | "good";
}

export interface MetricScores {
  savings_rate: MetricScore;
  debt_to_income: MetricScore;
  emergency_fund_months: MetricScore;
  housing_ratio: MetricScore;
  net_monthly_flow: { value: number };
}

export interface Metrics {
  savings_rate: number;
  debt_to_income: number;
  emergency_fund_months: number;
  housing_ratio: number;
  net_monthly_flow: number;
  debt_payment_missing: boolean;
}

export interface Mirror {
  label: string;
  description: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface Snapshot {
  saved_at: string;
  version: string;
  inputs: Record<string, unknown>;
  outputs: {
    overall_score: number;
    mirror_label: string;
    metrics: Metrics;
    metric_scores: MetricScores;
    narrative: string;
    goal: Goal | null;
  };
}

export interface Goal {
  action: string;
  metric: "savings_rate" | "debt_to_income" | "emergency_fund_months" | "housing_ratio";
  direction: "up" | "down";
  baseline_value: number;
  target_months?: number;
  set_month?: string;
}

export type MetricKey = "savings_rate" | "debt_to_income" | "emergency_fund_months" | "housing_ratio";

export interface MetricGoal {
  type: "metric";
  id: string;
  metric: MetricKey;
  label: string;
  target: number;
  direction: "up" | "down";
  baseline: number;
  set_month: string;
}

export interface SavingsGoal {
  type: "savings";
  id: string;
  name: string;
  target_amount: number;
  saved_so_far: number;
  monthly_contribution: number;
  target_date?: string;
  set_month: string;
}

export type UserGoal = MetricGoal | SavingsGoal;

export type StatusColor = "danger" | "warning" | "ok" | "good";

export interface FinancialProfile {
  debtTotal: number;
  debtMonthly: number;
  savingsTotal: number;
  profileComplete: boolean;
}

export interface BudgetCard {
  id: string;
  label: string;
  type: "income" | "cash" | "custom";
  allocationMode: "percent" | "fixed" | "remainder";
  allocationValue: number;
  balance: number;
  paused: boolean;
  color: string;
  createdAt: string;
  purpose?: "expense" | "saving";
  description?: string;
}

export interface DistributionLogEntry {
  id: string;
  timestamp: string;
  incomeAmount: number;
  allocations: { cardId: string; label: string; amount: number }[];
}

export const STATUS_COLORS: Record<StatusColor, string> = {
  danger:  "var(--danger)",
  warning: "var(--warning)",
  ok:      "var(--ok)",
  good:    "var(--good)",
};

export const STATUS_LABELS: Record<StatusColor, string> = {
  danger:  "Danger",
  warning: "Warning",
  ok:      "OK",
  good:    "Good",
};
