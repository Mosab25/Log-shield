import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import { useAuth } from "./AuthContext";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200"><div className="soc-panel px-6 py-5 text-sm font-semibold">Loading LogShield session...</div></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}
