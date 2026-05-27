/**
 * Chunk / dynamic-import error detection utility.
 *
 * IMPORTANT: This module does NOT auto-reload. All reloads are manual only.
 * ResizeObserver errors are classified as harmless and silently ignored.
 */

/** Patterns that positively identify a chunk / dynamic-import loading failure. */
const CHUNK_ERROR_PATTERNS = [
  "Loading chunk",
  "Loading CSS chunk",
  "Failed to fetch dynamically imported module",
  "Unable to preload CSS",
  "Importing a module script failed",
  "error loading dynamically imported module",
  "ChunkLoadError",
  "Loading module from",
] as const;

/** Check whether an error is a confirmed chunk/module loading failure. */
export function isChunkLoadError(error: unknown): boolean {
  const message = extractMessage(error);
  if (!message) return false;
  const lower = message.toLowerCase();
  return CHUNK_ERROR_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}

/** Check whether an error is a harmless ResizeObserver notification. */
export function isResizeObserverError(error: unknown): boolean {
  const message = extractMessage(error);
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("resizeobserver loop") ||
    lower.includes("resizeobserver loop completed") ||
    lower.includes("resizeobserver loop limit exceeded")
  );
}

/** Classify an error for diagnostic logging. */
export function classifyError(error: unknown): "chunk" | "resize-observer" | "render" {
  if (isChunkLoadError(error)) return "chunk";
  if (isResizeObserverError(error)) return "resize-observer";
  return "render";
}

/**
 * Manual reload with cache-bust. Called only from user-clicked buttons.
 * Appends ?v=<timestamp> to force fresh assets.
 */
export function manualReloadWithCacheBust(): void {
  const url = new URL(window.location.href);
  url.searchParams.set("v", String(Date.now()));
  window.location.replace(url.toString());
}

// ── helpers ──────────────────────────────────────────────────────────────

function extractMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string") return record.message;
    if (typeof record.reason === "string") return record.reason;
    if (
      typeof record.reason === "object" &&
      record.reason !== null &&
      typeof (record.reason as Record<string, unknown>).message === "string"
    ) {
      return (record.reason as Record<string, unknown>).message as string;
    }
  }
  return String(error);
}
