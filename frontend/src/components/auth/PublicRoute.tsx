import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../../auth/AuthContext";

export function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="soc-panel px-6 py-5 text-sm font-semibold">Loading LogShield session...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
