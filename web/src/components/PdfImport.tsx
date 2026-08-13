"use client";

import { useRef, useState } from "react";
import { importPdf, type Transaction } from "@/lib/api";
import type { FormData } from "@/lib/types";
import { Upload, X, Loader2 } from "lucide-react";

const CATEGORY_FIELD_MAP: Record<string, keyof FormData> = {
  rent:          "expensesRent",
  groceries:     "expensesGroceries",
  transport:     "expensesTransport",
  subscriptions: "expensesSubscriptions",
  dining:        "expensesDining",
  shopping:      "expensesShopping",
  other:         "expensesOther",
};

const CATEGORY_LABELS: Record<string, string> = {
  rent:          "Rent / Mortgage",
  groceries:     "Groceries",
  transport:     "Transport",
  subscriptions: "Subscriptions",
  dining:        "Dining out",
  shopping:      "Shopping",
  other:         "Other",
  income:        "Income",
};

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS);

type EditableTx = Transaction & { id: number };

function computeTotals(txs: EditableTx[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const tx of txs) {
    const cat = tx.category || "other";
    totals[cat] = (totals[cat] || 0) + Number(tx.amount);
  }
  return totals;
}

function buildFormData(txs: EditableTx[]): Partial<FormData> {
  const totals = computeTotals(txs);
  const result: Partial<FormData> = { section2Open: true };
  for (const [cat, field] of Object.entries(CATEGORY_FIELD_MAP)) {
    (result as Record<string, unknown>)[field as string] = Math.round(totals[cat] || 0);
  }
  if ((totals["income"] || 0) > 0) result.incomeMain = Math.round(totals["income"]);
  return result;
}

export function PdfImport({
  provider,
  apiKey,
  onImported,
}: {
  provider: string;
  apiKey: string;
  onImported: (data: Partial<FormData>) => void;
}) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const nextId     = useRef(0);
  const [txs, setTxs]           = useState<EditableTx[]>([]);
  const [loading, setLoading]   = useState(false);
  const [progress, setProgress] = useState("");   // "Processing file 2 of 3…"
  const [errors, setErrors]     = useState<string[]>([]);

  async function processFiles(files: File[]) {
    const batch = files.slice(0, 5);
    setLoading(true);
    setErrors([]);

    const newTxs: EditableTx[] = [];
    const newErrors: string[]  = [];

    for (let i = 0; i < batch.length; i++) {
      const file = batch[i];
      setProgress(batch.length > 1 ? `Processing file ${i + 1} of ${batch.length}…` : "Extracting transactions…");
      const result = await importPdf(file, provider, apiKey);
      if (result.error) {
        newErrors.push(`${file.name}: ${result.error}`);
      } else {
        for (const tx of result.transactions || []) {
          newTxs.push({ ...tx, id: nextId.current++ });
        }
      }
    }

    setTxs((prev) => [...prev, ...newTxs]);
    setErrors(newErrors);
    setLoading(false);
    setProgress("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    processFiles(Array.from(e.dataTransfer.files).filter((f) => f.name.endsWith(".pdf")));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) processFiles(Array.from(e.target.files));
  }

  function updateCategory(id: number, category: string) {
    setTxs((prev) => prev.map((tx) => (tx.id === id ? { ...tx, category } : tx)));
  }

  function removeTx(id: number) {
    setTxs((prev) => prev.filter((tx) => tx.id !== id));
  }

  function clearAll() {
    setTxs([]);
    setErrors([]);
  }

  const totals = computeTotals(txs);

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !loading && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-5 text-center transition-colors ${
          loading
            ? "border-[var(--border)] cursor-default"
            : "border-[var(--border)] cursor-pointer hover:border-[var(--brand)]"
        }`}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={22} className="animate-spin text-[var(--brand)]" />
            <p className="text-sm text-[var(--text-muted)]">{progress}</p>
            <p className="text-xs text-[var(--text-muted)]">This may take 30–60 seconds per file</p>
          </div>
        ) : (
          <>
            <Upload className="mx-auto mb-2 text-[var(--text-muted)]" size={20} />
            <p className="text-sm text-[var(--text-muted)]">
              {txs.length > 0 ? "Drop more PDFs to add — up to 5 total" : "Drop bank statement PDFs here or click to upload"}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Up to 5 files</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={handleChange}
        />
      </div>

      {errors.map((err, i) => (
        <p key={i} className="text-xs text-[var(--danger)]">{err}</p>
      ))}

      {txs.length > 0 && (
        <>
          {/* Header row */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text)]">{txs.length} transactions</span>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
            >
              Clear all
            </button>
          </div>

          {/* Transaction list */}
          <div className="border border-[var(--border)] rounded-lg overflow-hidden">
            <div className="max-h-56 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[var(--bg-2)] border-b border-[var(--border)]">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-[var(--text-muted)]">Description</th>
                    <th className="text-right px-3 py-2 font-medium text-[var(--text-muted)] w-20">Amount</th>
                    <th className="text-left px-3 py-2 font-medium text-[var(--text-muted)] w-36">Category</th>
                    <th className="w-7" />
                  </tr>
                </thead>
                <tbody>
                  {txs.map((tx, i) => (
                    <tr
                      key={tx.id}
                      className={`border-t border-[var(--border)] ${i % 2 === 0 ? "" : "bg-[var(--bg-2)]"}`}
                    >
                      <td className="px-3 py-1.5 text-[var(--text)] max-w-[160px] truncate" title={tx.description}>
                        {tx.description}
                      </td>
                      <td className="px-3 py-1.5 text-right text-[var(--text)] tabular-nums">
                        ${Number(tx.amount).toFixed(2)}
                      </td>
                      <td className="px-3 py-1.5">
                        <select
                          value={tx.category || "other"}
                          onChange={(e) => updateCategory(tx.id, e.target.value)}
                          className="w-full bg-transparent text-[var(--text)] text-xs focus:outline-none cursor-pointer"
                        >
                          {ALL_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                          ))}
                        </select>
                      </td>
                      <td className="pr-2">
                        <button
                          type="button"
                          onClick={() => removeTx(tx.id)}
                          className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors p-0.5"
                        >
                          <X size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Category totals */}
          <div className="border border-[var(--border)] rounded-lg divide-y divide-[var(--border)]">
            {Object.entries(CATEGORY_FIELD_MAP).map(([cat]) => {
              const total = totals[cat] || 0;
              if (total === 0) return null;
              return (
                <div key={cat} className="flex justify-between items-center px-3 py-2 text-xs">
                  <span className="text-[var(--text-muted)]">{CATEGORY_LABELS[cat]}</span>
                  <span className="font-medium text-[var(--text)] tabular-nums">
                    ${Math.round(total).toLocaleString()}
                  </span>
                </div>
              );
            })}
            {(totals["income"] || 0) > 0 && (
              <div className="flex justify-between items-center px-3 py-2 text-xs bg-[var(--bg-2)]">
                <span className="text-[var(--text-muted)]">Income detected</span>
                <span className="font-medium text-[var(--text)] tabular-nums">
                  ${Math.round(totals["income"]).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onImported(buildFormData(txs))}
            className="btn-primary w-full text-sm"
          >
            Fill form with these numbers
          </button>
        </>
      )}
    </div>
  );
}
