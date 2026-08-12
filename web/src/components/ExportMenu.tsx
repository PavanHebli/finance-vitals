"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useStore, toApiFormData } from "@/lib/store";
import { exportPdf, downloadBlob, downloadBase64, encodeSnapshot } from "@/lib/api";

export function ExportMenu() {
  const { formData, metrics, metricScores, overallScore, mirror, narrativeText, addSnapshot } = useStore();
  const [open, setOpen]   = useState(false);
  const [loading, setLoading] = useState<"pdf" | "vit" | null>(null);

  if (!overallScore || !metrics || !metricScores || !mirror) return null;

  async function handlePdf() {
    setLoading("pdf");
    try {
      const blob = await exportPdf({
        form_data:     toApiFormData(formData),
        metrics,
        metric_scores: metricScores,
        overall_score: overallScore,
        mirror,
        narrative:     narrativeText,
      });
      downloadBlob(blob, "vitals_report.pdf");
    } catch {
      // silently fail for now
    } finally {
      setLoading(null);
      setOpen(false);
    }
  }

  async function handleVit() {
    setLoading("vit");
    try {
      const snap = {
        form_data:     toApiFormData(formData),
        metrics,
        metric_scores: metricScores,
        overall_score: overallScore!,
        mirror,
        narrative:     narrativeText,
      };
      const b64 = await encodeSnapshot(snap);
      downloadBase64(b64, "my_vitals.vit");
      addSnapshot({
        saved_at: new Date().toISOString().slice(0, 7),
        version:  "1",
        inputs:   toApiFormData(formData),
        outputs:  { overall_score: overallScore!, mirror_label: mirror!.label, metrics: metrics!, metric_scores: metricScores!, narrative: narrativeText, goal: null },
      });
    } catch {
      // silently fail
    } finally {
      setLoading(null);
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)} className="btn-secondary text-sm flex items-center gap-2">
        <Download size={15} /> Export
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 z-20 bg-[var(--bg)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden">
            <button
              type="button"
              onClick={handlePdf}
              disabled={loading === "pdf"}
              className="w-full text-left px-4 py-3 text-sm hover:bg-[var(--bg-2)] transition-colors disabled:opacity-60"
            >
              {loading === "pdf" ? "Generating…" : "📄 PDF report"}
            </button>
            <button
              type="button"
              onClick={handleVit}
              disabled={loading === "vit"}
              className="w-full text-left px-4 py-3 text-sm hover:bg-[var(--bg-2)] transition-colors disabled:opacity-60 border-t border-[var(--border)]"
            >
              {loading === "vit" ? "Saving…" : "💾 Save data (.vit)"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
