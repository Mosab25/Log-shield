import { ArrowLeft, LogOut, Menu, ShieldCheck, UserCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { pageTitleForPath } from "../navigation";
import { GlobalSearch } from "./GlobalSearch";

export function Navbar({
  onMobileMenuClick,
}: {
  onMobileMenuClick?: () => void;
}) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const title = pageTitleForPath(location.pathname, role);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  function handleBack() {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/home");
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-cyan-400/12 bg-cyber-surface/85 shadow-lg shadow-black/20 backdrop-blur-xl">
      <div className="flex min-h-16 items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-4 sm:py-3 lg:gap-4 lg:px-6 lg:py-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onMobileMenuClick}
            aria-label="Open navigation"
            className="soc-button-ghost h-10 w-10 px-0 xl:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className="soc-button-ghost h-10 px-2 sm:px-3"
            title="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden xs:inline sm:inline">Back</span>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-xs font-semibold uppercase text-cyber-muted">
              <ShieldCheck className="h-3 w-3 text-cyan-300" />
              <span className="hidden sm:inline">Defensive monitoring</span>
            </div>
            <h2 className="truncate text-base font-black text-cyber-text sm:text-lg lg:text-xl">{title}</h2>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <div className="hidden xs:block sm:hidden md:block">
            <p className="truncate text-sm font-semibold text-cyber-text">{user?.full_name ?? "Unknown"}</p>
            <p className="text-xs font-bold uppercase text-cyan-300">{role ?? "user"}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyber-surface text-cyan-200 shadow-inner shadow-black/20">
            <UserCircle className="h-5 w-5" />
          </div>
          <button onClick={handleLogout} className="soc-button-ghost h-10 px-2 sm:px-3">
            <LogOut className="h-4 w-4" />
            <span className="hidden xs:inline sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
