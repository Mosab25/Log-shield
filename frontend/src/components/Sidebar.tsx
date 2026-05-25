import { memo, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { NAVIGATION_SECTIONS, navigationForRole } from "../navigation";
import { prefetchRouteData } from "../routePrefetch";
import { moduleThemeForPath, moduleThemeStyle } from "../theme/moduleThemes";
import { getRouteAccent } from "../theme/routeAccents";

function defaultOpenSections(role: string | null) {
  if (!role) return Object.fromEntries(NAVIGATION_SECTIONS.map(section => [section, section === "OVERVIEW"])) as Record<string, boolean>;
  
  if (role === "admin") {
    return Object.fromEntries([
      ["USER PORTAL", false],
      ["OVERVIEW", true],
      ["MONITORING", true],
      ["INVESTIGATION", true],
      ["DETECTION & RESPONSE", true],
      ["ASSET & RISK", true],
      ["TRAINING", true],
      ["ADMINISTRATION", true]
    ]) as Record<string, boolean>;
  }
  
  if (role === "analyst") {
    return Object.fromEntries([
      ["USER PORTAL", false],
      ["OVERVIEW", true],
      ["MONITORING", true],
      ["INVESTIGATION", true],
      ["DETECTION & RESPONSE", true],
      ["ASSET & RISK", true],
      ["TRAINING", true],
      ["ADMINISTRATION", false]
    ]) as Record<string, boolean>;
  }
  
  // For viewer and other roles
  return Object.fromEntries([
    ["USER PORTAL", true],
    ["OVERVIEW", true],
    ["MONITORING", true],
    ["TRAINING", true],
    ["INVESTIGATION", false],
    ["DETECTION & RESPONSE", false],
    ["ASSET & RISK", false],
    ["ADMINISTRATION", false]
  ]) as Record<string, boolean>;
}

function onlySectionOpen(section: string) {
  return Object.fromEntries(NAVIGATION_SECTIONS.map(item => [item, item === section])) as Record<string, boolean>;
}

export const Sidebar = memo(function Sidebar({
  collapsed = false,
  onNavigate,
  onToggle,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggle?: () => void;
}) {
  const { role } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const items = navigationForRole(role);
  const routeAccent = getRouteAccent(location.pathname);
  const activeRouteStyle = useMemo(() => ({
    "--module-accent": routeAccent.accent,
    "--module-accent-2": routeAccent.secondary,
    "--module-accent-soft": routeAccent.soft,
    "--module-gradient": "linear-gradient(135deg, var(--brand-soft), transparent)",
    background: "transparent",
    border: "1px solid transparent",
    borderLeft: "3px solid var(--module-accent)",
    boxShadow: "none",
    transition: "border-color 240ms ease, background-color 240ms ease, color 240ms ease",
  } as CSSProperties), [routeAccent.accent, routeAccent.secondary, routeAccent.soft]);
  const collapsedActiveStyle = useMemo(() => ({
    border: "1px solid transparent",
    borderLeft: "3px solid var(--module-accent)",
    background: "transparent",
    boxShadow: "none",
    transition: "border-color 240ms ease, color 240ms ease",
  } as CSSProperties), []);
  const activeSection = useMemo(() => {
    return items.find(item => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`))?.section ?? "OVERVIEW";
  }, [items, location.pathname]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("logshield.sidebar.sections") || "{}") as Record<string, boolean>;
      const defaults = defaultOpenSections(role);
      return { ...defaults, ...stored };
    } catch {
      return defaultOpenSections(role);
    }
  });

  useEffect(() => {
    // Always ensure active section is expanded
    setOpenSections(prev => {
      if (prev[activeSection]) return prev;
      return { ...prev, [activeSection]: true };
    });
  }, [activeSection]);

  useEffect(() => {
    // Persist section state to localStorage
    try {
      localStorage.setItem("logshield.sidebar.sections", JSON.stringify(openSections));
    } catch {
      // Silent fail for localStorage issues
    }
  }, [openSections]);

  function toggleSection(section: string) {
    // Don't allow closing section if it contains the active route
    const sectionItems = items.filter(item => item.section === section);
    const hasActiveItem = sectionItems.some(item => 
      location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
    );
    
    if (hasActiveItem) {
      // Keep section open if it contains active item
      return;
    }
    
    // Toggle section normally
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  }

  function handleNavigate(section: string) {
    // Ensure the navigated section is open
    setOpenSections(prev => ({ ...prev, [section]: true }));
    onNavigate?.();
  }

  return (
    <aside className="flex h-full min-h-0 flex-col">
      <div className={`shrink-0 border-b border-cyan-400/12 ${collapsed ? "px-3 py-5" : "px-6 py-6"}`}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between gap-3"}`}>
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyber-cyan/10 text-cyan-300 shadow-[0_0_35px_rgba(34,211,238,0.12)]">
              <ShieldCheck className="h-7 w-7" />
            </div>
            {!collapsed ? (
              <div className="min-w-0">
                <h1 className="truncate text-lg font-black tracking-tight text-cyber-text">LogShield</h1>
                <p className="truncate text-xs font-medium text-cyber-muted">Guided SOC Console</p>
              </div>
            ) : null}
          </div>
          {onToggle && !collapsed ? (
            <button 
              type="button" 
              onClick={onToggle} 
              className="soc-button-ghost h-8 w-8 px-0 border border-cyber-cyan/20 hover:border-cyber-cyan/40 hover:bg-cyber-cyan/10" 
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        {onToggle && collapsed ? (
          <button 
            type="button" 
            onClick={onToggle} 
            className="soc-button-ghost mx-auto mt-4 h-8 w-8 px-0 border border-cyber-cyan/20 hover:border-cyber-cyan/40 hover:bg-cyber-cyan/10" 
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <nav className={`flex-1 space-y-5 overflow-y-auto ${collapsed ? "px-2 py-4" : "px-4 py-5"}`}>
        {NAVIGATION_SECTIONS.map(section => {
          const sectionItems = items.filter(item => item.section === section);
          if (sectionItems.length === 0) return null;
          const isOpen = collapsed || Boolean(openSections[section]);
          const sectionId = `sidebar-section-${section.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

          return (
            <div key={section} className="space-y-2">
              {!collapsed ? (
                <button
                  type="button"
                  onClick={() => toggleSection(section)}
                  className="flex w-full items-center justify-between rounded-xl border border-cyan-400/10 bg-cyber-elevated/50 px-3 py-2 text-left text-[0.66rem] font-black uppercase text-cyber-muted transition hover:border-cyber-cyan/20 hover:bg-cyber-cyan/10 hover:text-cyan-200"
                  style={{ letterSpacing: "0.14em" }}
                  aria-expanded={isOpen}
                  aria-controls={sectionId}
                >
                  <span>{section}</span>
                  {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              ) : null}
              {isOpen ? (
                <div id={sectionId} className="space-y-1.5">
                  {sectionItems.map(item => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                    const theme = moduleThemeForPath(item.path);
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        title={collapsed ? `${item.label} - ${item.section}` : item.description}
                        onMouseEnter={() => prefetchRouteData(queryClient, item.path)}
                        onClick={() => handleNavigate(item.section)}
                        style={isActive ? (collapsed ? { ...activeRouteStyle, ...collapsedActiveStyle } : activeRouteStyle) : moduleThemeStyle(theme)}
                        className={() =>
                          `group flex items-center rounded-2xl text-sm font-semibold transition relative ${
                            collapsed ? "justify-center px-0 py-3" : "gap-3 px-4 py-3"
                          } ${
                            isActive
                              ? "text-cyber-text"
                              : "module-nav-item border border-transparent text-cyber-text hover:bg-cyber-elevated hover:text-white"
                          }`
                        }
                        aria-label={item.label}
                      >
                        <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-[color:var(--module-accent)]" : ""}`} />
                        {!collapsed ? <span className="truncate">{item.label}</span> : null}
                        {collapsed && (
                          <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-[color:var(--module-accent)] transition-[background-color,border-color] duration-[240ms] ease-out" />
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      {!collapsed ? (
        <div className="shrink-0 border-t border-cyan-400/12 p-4">
          <div className="rounded-2xl border border-cyan-400/10 bg-cyber-elevated/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase text-cyber-muted">Workspace</span>
              <span className="rounded-full border border-cyber-green/25 bg-cyber-green/10 px-2 py-0.5 text-xs font-bold text-cyber-green">Online</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-cyber-muted">Guided triage, investigation, response, and learning surface.</p>
          </div>
        </div>
      ) : null}
    </aside>
  );
});
