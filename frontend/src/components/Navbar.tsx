import { LogOut, Menu, ShieldCheck, UserCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/logs": "Raw & Normalized Logs",
  "/alerts": "Alert Management",
  "/threats": "Threat Knowledge Base",
  "/threat-intel": "CVE Search",
  "/rules": "Detection Rules",
  "/reports": "Security Reports",
  "/users": "Users Management",
  "/audit": "Audit Logs",
  "/blocks": "IP Blocks",
  "/settings": "Settings",
};

export function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const title = pageTitles[`/${location.pathname.split("/")[1]}`] ?? "LogShield Console";

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-cyan-200/10 bg-slate-950/78 shadow-lg shadow-black/20 backdrop-blur-xl">
      <div className="flex min-h-20 items-center justify-between gap-4 px-4 py-3 sm:px-5 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open navigation"
            className="soc-button-ghost h-11 w-11 px-0 xl:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
              <ShieldCheck className="h-4 w-4 text-cyan-200" />
              Defensive monitoring workspace
            </div>
            <h2 className="mt-1 truncate text-lg font-black text-white sm:text-xl">{title}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden text-right md:block">
            <p className="text-sm font-semibold text-white">{user?.full_name ?? "Unknown"}</p>
            <p className="text-xs font-bold uppercase text-cyan-200">{role ?? "user"}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700/80 bg-slate-900/85 text-cyan-100 shadow-inner shadow-black/20">
            <UserCircle className="h-6 w-6" />
          </div>
          <button onClick={handleLogout} className="soc-button-ghost px-3 sm:px-4">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
