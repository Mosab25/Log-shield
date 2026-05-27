import { Component, type ErrorInfo, type ReactNode } from "react";
import {
  classifyError,
  isResizeObserverError,
  manualReloadWithCacheBust,
} from "../lib/chunkReload";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
  errorType: "chunk" | "resize-observer" | "render";
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: "",
    errorType: "render",
  };

  static getDerivedStateFromError(error: Error): State | null {
    // Silently ignore harmless ResizeObserver loop notifications
    if (isResizeObserverError(error)) {
      return null; // do NOT show error UI
    }

    return {
      hasError: true,
      message: error?.message || "Unexpected UI error.",
      errorType: classifyError(error),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const errorType = classifyError(error);

    // Diagnostic logging (temporary, safe console-only)
    try {
      const route =
        typeof window !== "undefined" ? window.location.pathname : "unknown";
      console.group("[LogShield ErrorBoundary]");
      console.log("Route:", route);
      console.log("Error type:", errorType);
      console.log("Message:", error?.message);
      if (info?.componentStack) {
        console.log("Component stack:", info.componentStack);
      }
      console.groupEnd();
    } catch {
      // ignore logging failures
    }

    // Silently ignore ResizeObserver loop errors
    if (errorType === "resize-observer") {
      return;
    }

    console.error("AppErrorBoundary caught error:", error, info);

    // IMPORTANT: No automatic reload here. Manual only via buttons below.
  }

  render() {
    if (this.state.hasError) {
      const isChunk = this.state.errorType === "chunk";

      return (
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            alignItems: "center",
            justifyContent: "center",
            background: "#05070D",
            padding: "1rem",
            color: "#DCE8F4",
            fontFamily:
              'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: "32rem",
              width: "100%",
              border: "1px solid rgba(143, 163, 184, 0.12)",
              borderRadius: "1.35rem",
              background: "rgba(16, 24, 38, 0.85)",
              padding: "1.5rem",
              boxShadow: "0 18px 50px rgba(0, 0, 0, 0.22)",
            }}
          >
            <h1 style={{ fontSize: "1.25rem", fontWeight: 900, margin: 0 }}>
              {isChunk ? "LogShield was updated" : "LogShield UI Error"}
            </h1>
            <p
              style={{
                marginTop: "0.75rem",
                fontSize: "0.875rem",
                color: "#9AADBF",
                lineHeight: 1.6,
              }}
            >
              {isChunk
                ? "A required app module could not be loaded. Please reload the latest version."
                : "The page crashed while rendering. This is usually a temporary issue."}
            </p>
            <p
              style={{
                marginTop: "0.5rem",
                borderRadius: "0.5rem",
                border: "1px solid rgba(255, 59, 59, 0.3)",
                background: "rgba(255, 59, 59, 0.1)",
                padding: "0.5rem 0.75rem",
                fontSize: "0.75rem",
                color: "#ffb4b4",
                wordBreak: "break-word",
              }}
            >
              {this.state.message}
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                marginTop: "1rem",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (isChunk) {
                    manualReloadWithCacheBust();
                  } else {
                    window.location.reload();
                  }
                }}
                style={{
                  borderRadius: "0.75rem",
                  border: "none",
                  background: "linear-gradient(90deg, #00D8FF, #33E6FF)",
                  padding: "0.5rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  color: "#05070D",
                  cursor: "pointer",
                }}
              >
                {isChunk ? "Reload latest version" : "Reload Page"}
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/home";
                }}
                style={{
                  borderRadius: "0.75rem",
                  border: "1px solid rgba(143, 163, 184, 0.2)",
                  background: "rgba(16, 24, 38, 0.6)",
                  padding: "0.5rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#9AADBF",
                  cursor: "pointer",
                }}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
