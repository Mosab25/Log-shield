import { Activity, AlertTriangle, Ban, FileText, Globe, LayoutDashboard, ListChecks, ScrollText, Settings, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { NavLink } from "react-router-dom";

import { useAuth, type UserRole } from "../auth/AuthContext";

const items: Array<{ label: string; to: string; icon: any; roles?: UserRole[] }> = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Logs", to: "/logs", icon: ScrollText },
  { label: "Alerts", to: "/alerts", icon: AlertTriangle },
  { label: "Threat Intel", to: "/threats", icon: ShieldAlert },
  { label: "CVE Search", to: "/threat-intel", icon: Globe },
  { label: "Rules", to: "/rules", icon: ListChecks },
  { label: "Reports", to: "/reports", icon: FileText },
  { label: "Users", to: "/users", icon: Users, roles: ["admin"] },
  { label: "Audit", to: "/audit", icon: Activity, roles: ["admin"] },
  { label: "IP Blocks", to: "/blocks", icon: Ban, roles: ["admin"] },
  { label: "Settings", to: "/settings", icon: Settings, roles: ["admin"] }
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { role } = useAuth();
  return (
    <aside className="flex h-full flex-col">
      <div className="border-b border-cyan-200/10 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200/25 bg-cyan-300/10 text-cyan-200 shadow-[0_0_35px_rgba(34,211,238,0.16)]">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white">LogShield</h1>
            <p className="text-xs font-medium text-slate-400">SOC Tier 1 Console</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1.5 px-4 py-5">
        {items.filter(i => !i.roles || (role && i.roles.includes(role))).map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "border border-cyan-200/30 bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/30"
                    : "border border-transparent text-slate-300 hover:border-cyan-200/10 hover:bg-white/[0.045] hover:text-white"
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-cyan-200/10 p-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase text-slate-400">Workspace</span>
            <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2 py-0.5 text-xs font-bold text-emerald-200">Online</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">Defensive monitoring, triage, and audit surface.</p>
        </div>
      </div>
    </aside>
  );
}
