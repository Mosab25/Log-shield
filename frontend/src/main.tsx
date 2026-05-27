import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { AuthProvider } from "./auth/AuthContext";
import { BlockedAccessGate } from "./components/BlockedAccessGate";
import { queryClient } from "./queryClient";
import { startKeepAlive } from "./lib/keepAlive";
import { isChunkLoadError, isResizeObserverError } from "./lib/chunkReload";
import "./index.css";

startKeepAlive();

// ── Global error handlers ────────────────────────────────────────────────
// IMPORTANT: These handlers NEVER reload the page automatically.
// They only suppress harmless errors and log chunk errors for diagnostics.

window.addEventListener("error", (event: ErrorEvent) => {
  // Silently suppress harmless ResizeObserver loop notifications
  if (isResizeObserverError(event.message ?? event.error)) {
    event.stopImmediatePropagation();
    event.preventDefault();
    return;
  }

  // Log chunk errors for diagnostics — NO reload
  if (isChunkLoadError(event.message ?? event.error)) {
    console.warn("[LogShield] Chunk load error detected (no auto-reload):", event.message);
    return;
  }

  // All other errors: let React ErrorBoundary handle them naturally.
});

window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
  const reason = event.reason;

  // Silently suppress harmless ResizeObserver loop notifications
  if (isResizeObserverError(reason)) {
    event.preventDefault();
    return;
  }

  // Log chunk errors for diagnostics — NO reload
  if (isChunkLoadError(reason)) {
    console.warn("[LogShield] Chunk load rejection detected (no auto-reload):", reason);
    return;
  }

  // All other rejections: do nothing, let normal error handling work.
});

// ── App render ───────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <BlockedAccessGate>
          <AuthProvider>
            <QueryClientProvider client={queryClient}>
              <App />
            </QueryClientProvider>
          </AuthProvider>
        </BlockedAccessGate>
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>
);
