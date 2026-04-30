import { Activity, AlertTriangle, FileText, Globe, LayoutDashboard, ListChecks, ScrollText, Settings, ShieldAlert, ShieldCheck, Users } from "lucide-react";
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
  { label: "Settings", to: "/settings", icon: Settings, roles: ["admin"] }
];

export function Sidebar() {
  const { role } = useAuth();
  return (
    <aside className="flex h-full flex-col">
      <div className="border-b border-slate-800 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-300/30"><ShieldCheck className="h-7 w-7" /></div>
          <div><h1 className="text-lg font-bold text-white">LogShield</h1><p className="text-xs text-slate-400">SOC Tier 1 Console</p></div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-4 py-5">
        {items.filter(i => !i.roles || (role && i.roles.includes(role))).map(item => {
          const Icon = item.icon;
          return <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${isActive ? "bg-cyan-400 text-slate-950" : "text-slate-300 hover:bg-slate-900 hover:text-white"}`}><Icon className="h-5 w-5" />{item.label}</NavLink>;
        })}
      </nav>
    </aside>
  );
}
