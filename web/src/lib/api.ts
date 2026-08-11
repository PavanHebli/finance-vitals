import type { Metrics, MetricScores, Mirror, Message, Goal } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Score ─────────────────────────────────────────────────────────────────────

export async function fetchScore(formData: Record<string, unknown>): Promise<{
  metrics: Metrics;
  metric_scores: MetricScores;
  overall_score: number;
  mirror: Mirror;
}> {
  const res = await fetch(`${API_URL}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ form_data: formData }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Narrative streaming ───────────────────────────────────────────────────────

export async function streamNarrative(
  payload: {
    form_data: Record<string, unknown>;
    metrics: Metrics;
    metric_scores: MetricScores;
    overall_score: number;
    mirror: Mirror;
    provider: string;
    api_key: string;
  },
  onChunk: (chunk: string) => void
): Promise<void> {
  const res = await fetch(`${API_URL}/narrative`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  await readStream(res, onChunk);
}

// ── Simulate ──────────────────────────────────────────────────────────────────

export async function fetchSimulate(
  formData: Record<string, unknown>,
  simOverrides: Record<string, number | null>
): Promise<{
  sim_score: number;
  sim_metrics: Metrics;
  sim_metric_scores: MetricScores;
}> {
  const res = await fetch(`${API_URL}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ form_data: formData, sim_overrides: simOverrides }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Chat streaming ────────────────────────────────────────────────────────────

export async function streamChat(
  payload: {
    message: string;
    history: Message[];
    form_data: Record<string, unknown>;
    metrics: Metrics;
    metric_scores: MetricScores;
    overall_score: number;
    mirror: Mirror;
    provider: string;
    api_key: string;
    summarised_history?: string;
  },
  onChunk: (chunk: string) => void,
  onSummaryUpdate?: (summary: string) => void
): Promise<void> {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());

  const SUMMARY_MARKER = "\x00VITALS_SUMMARY\x00";
  let buffer = "";

  await readStream(res, (chunk) => {
    buffer += chunk;
    if (buffer.includes(SUMMARY_MARKER)) {
      const markerIdx = buffer.indexOf(SUMMARY_MARKER);
      const textPart  = buffer.slice(0, markerIdx);
      const jsonPart  = buffer.slice(markerIdx + SUMMARY_MARKER.length);
      if (textPart) onChunk(textPart);
      try {
        const { summary } = JSON.parse(jsonPart);
        if (summary && onSummaryUpdate) onSummaryUpdate(summary);
      } catch {}
      buffer = "";
    } else if (!buffer.includes("\x00")) {
      onChunk(buffer);
      buffer = "";
    }
  });
}

export async function fetchChatStarters(): Promise<string[]> {
  const res = await fetch(`${API_URL}/chat/starters`);
  const { questions } = await res.json();
  return questions;
}

// ── Goal extraction ───────────────────────────────────────────────────────────

export async function fetchGoalExtract(payload: {
  narrative_text: string;
  metrics: Metrics;
  provider: string;
  api_key: string;
}): Promise<Goal | null> {
  const res = await fetch(`${API_URL}/goal/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return null;
  return res.json();
}

// ── PDF import ────────────────────────────────────────────────────────────────

export async function importPdf(
  file: File,
  provider: string,
  apiKey: string
): Promise<{ transactions: Transaction[]; error?: string; debug_log?: string[] }> {
  const form = new FormData();
  form.append("file", file);
  form.append("provider", provider);
  form.append("api_key", apiKey);

  const res = await fetch(`${API_URL}/import/pdf`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Import failed" }));
    return { transactions: [], error: err.detail };
  }
  return res.json();
}

export interface Transaction {
  date: string | null;
  description: string;
  amount: number;
  type: string;
  category: string;
}

// ── PDF export ────────────────────────────────────────────────────────────────

export async function exportPdf(payload: Record<string, unknown>): Promise<Blob> {
  const res = await fetch(`${API_URL}/export/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("PDF export failed");
  return res.blob();
}

// ── Snapshot encode ───────────────────────────────────────────────────────────

export async function encodeSnapshot(payload: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${API_URL}/snapshot/encode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Snapshot encode failed");
  const { vit_b64 } = await res.json();
  return vit_b64;
}

export async function decodeSnapshot(file: File): Promise<unknown[]> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/snapshot/decode`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Could not read .vit file");
  const { snapshots } = await res.json();
  return snapshots;
}

// ── Feedback ──────────────────────────────────────────────────────────────────

export async function submitFeedback(payload: Record<string, unknown>): Promise<boolean> {
  const res = await fetch(`${API_URL}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return false;
  const { success } = await res.json();
  return success;
}

// ── Utility ───────────────────────────────────────────────────────────────────

async function readStream(res: Response, onChunk: (chunk: string) => void): Promise<void> {
  const reader  = res.body!.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href    = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadBase64(b64: string, filename: string): void {
  const bytes = atob(b64);
  const arr   = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  downloadBlob(new Blob([arr], { type: "application/octet-stream" }), filename);
}
