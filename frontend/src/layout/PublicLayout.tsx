import { NavLink } from "react-router-dom";
import { LogIn, ShieldCheck, UserPlus } from "lucide-react";

import { useAuth } from "../auth/AuthContext";
import { ModuleThemeFrame } from "../components/ModuleTheme";
import { OutletTransition } from "../components/PageTransition";

const publicLinks = [
  { to: "/home", label: "Home" },
  { to: "/intro", label: "Intro" },
  { to: "/tools", label: "SOC Toolkit" },
  { to: "/url-scanner", label: "URL Scanner" },
  { to: "/threat-intelligence", label: "Threat Intelligence" },
  { to: "/awareness", label: "Awareness" },
];

function navClass({ isActive }: { isActive: boolean }) {
  return `module-public-nav-link rounded-xl px-3 py-2 text-sm font-semibold transition ${
    isActive
      ? "module-public-nav-link-active text-slate-950"
      : "text-slate-300 hover:text-white"
  }`;
}

export function PublicLayout() {
  const { isAuthenticated } = useAuth();

  return (
    <ModuleThemeFrame className="min-h-screen overflow-x-hidden bg-cyber-bg text-cyber-text">
      <header className="module-public-header sticky top-0 z-40 bg-[#050816]/88 backdrop-blur-xl">
        <nav className="mx-auto flex w-full max-w-[96rem] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <NavLink to="/home" className="flex items-center gap-3 text-white">
            <span className="module-brand-mark flex h-10 w-10 items-center justify-center rounded-2xl">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-base font-black leading-tight">LogShield</span>
              <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/75">Public Preview</span>
            </span>
          </NavLink>

          <div className="order-3 flex w-full gap-2 overflow-x-auto pb-1 sm:order-2 sm:w-auto sm:flex-wrap sm:justify-center sm:overflow-visible sm:pb-0">
            {publicLinks.map(link => (
              <NavLink key={link.to} to={link.to} className={navClass}>
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="order-2 flex items-center gap-2 sm:order-3">
            {isAuthenticated ? (
              <NavLink to="/dashboard" className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-200">
                Dashboard
              </NavLink>
            ) : (
              <>
                <NavLink to="/login" className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/15 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/40 hover:text-white">
                  <LogIn className="h-4 w-4" />
                  Login
                </NavLink>
                <NavLink to="/register" className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-3 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-200">
                  <UserPlus className="h-4 w-4" />
                  Sign Up
                </NavLink>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[96rem] px-3 py-5 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
        <OutletTransition />
      </main>
    </ModuleThemeFrame>
  );
}
