"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { useStore } from "@/lib/store";

const EXPENSE_KEYS = [
  { key: "expensesRent",          label: "Rent",          color: "#4f6ef7" },
  { key: "expensesGroceries",     label: "Groceries",     color: "#22c55e" },
  { key: "expensesTransport",     label: "Transport",     color: "#f59e0b" },
  { key: "expensesSubscriptions", label: "Subscriptions", color: "#8b5cf6" },
  { key: "expensesDining",        label: "Dining",        color: "#ec4899" },
  { key: "expensesShopping",      label: "Shopping",      color: "#06b6d4" },
  { key: "expensesOther",         label: "Other",         color: "#6b7280" },
] as const;

export function ExpenseChart() {
  const { formData } = useStore();

  const data = EXPENSE_KEYS
    .map(({ key, label, color }) => ({
      label,
      value: formData[key] as number,
      color,
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  if (!data.length) return null;

  const income = formData.incomeMain + formData.incomeAdditional;

  return (
    <div className="card">
      <div className="font-semibold text-[var(--text)] mb-4">Monthly Expenses</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16 }}>
          <XAxis
            type="number"
            tickFormatter={(v) => `$${v.toLocaleString()}`}
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey="label"
            type="category"
            width={90}
            tick={{ fontSize: 12, fill: "var(--text)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number) => [
              `$${value.toLocaleString()} (${income > 0 ? ((value / income) * 100).toFixed(1) : 0}% of income)`,
              "Amount",
            ]}
            contentStyle={{
              background: "var(--bg-2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
