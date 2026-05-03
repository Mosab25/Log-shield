import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || "Unexpected UI error.",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("AppErrorBoundary caught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-cyber-bg px-4 text-cyber-text">
          <div className="soc-panel max-w-xl p-6">
            <h1 className="text-xl font-black text-cyber-text">LogShield UI Error</h1>
            <p className="mt-3 text-sm text-cyber-muted">
              The page crashed while rendering. This is usually a temporary route or data rendering issue.
            </p>
            <p className="mt-2 rounded-lg border border-red-300/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-cyber-cyan px-4 py-2 text-sm font-bold text-cyber-bg transition hover:bg-cyan-200"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
