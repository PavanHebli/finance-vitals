// Moved to packages/shared so web and the future mobile app share one
// source of truth for these calls — see packages/shared/src/api.ts.
// downloadBlob/downloadBase64 stay here: they're DOM-only (URL, document),
// with no mobile equivalent, so they never moved to the shared package.
import { setApiBaseUrl } from "@vitals/shared";

export * from "@vitals/shared";

setApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);

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
