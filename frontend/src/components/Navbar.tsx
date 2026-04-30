import { LogOut, ShieldCheck, UserCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Navbar() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="flex h-20 items-center justify-between px-5 lg:px-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400"><ShieldCheck className="h-4 w-4 text-cyan-300" />Defensive monitoring workspace</div>
          <h2 className="mt-1 text-xl font-semibold text-white">LogShield Console</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block"><p className="text-sm font-medium text-white">{user?.full_name ?? "Unknown"}</p><p className="text-xs uppercase tracking-wide text-cyan-300">{role}</p></div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900"><UserCircle /></div>
          <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm hover:bg-red-500/10"><LogOut className="h-4 w-4" />Logout</button>
        </div>
      </div>
    </header>
  );
}
