import { useAuth } from "../auth/AuthContext";
import { MainLayout } from "./MainLayout";
import { PublicLayout } from "./PublicLayout";

export function AdaptiveLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cyber-bg text-cyber-text">
        <div className="soc-panel px-6 py-5 text-sm font-semibold text-slate-300">Loading LogShield session...</div>
      </div>
    );
  }

  return isAuthenticated ? <MainLayout /> : <PublicLayout />;
}
