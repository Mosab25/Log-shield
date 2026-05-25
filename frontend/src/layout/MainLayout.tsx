import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { Menu, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { ModuleThemeFrame } from "../components/ModuleTheme";
import { Navbar } from "../components/Navbar";
import { OutletTransition } from "../components/PageTransition";
import { Sidebar } from "../components/Sidebar";
import { useMediaQuery } from "../hooks/useMediaQuery";

export function MainLayout() {
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchMoveX = useRef<number | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("logshield.sidebar.collapsed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("logshield.sidebar.collapsed", String(sidebarCollapsed));
    } catch {
      // Silent fail for localStorage issues
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (isDesktop && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [isDesktop, sidebarOpen]);

  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile, location.pathname]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [sidebarOpen]);

  const leftPad = useMemo(() => {
    if (isMobile) return "0px";
    if (isTablet) return "var(--sidebar-width-collapsed)";
    return sidebarCollapsed ? "var(--sidebar-width-collapsed)" : "var(--sidebar-width)";
  }, [isMobile, isTablet, sidebarCollapsed]);

  function handleDrawerTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    touchMoveX.current = null;
  }

  function handleDrawerTouchMove(event: TouchEvent<HTMLDivElement>) {
    touchMoveX.current = event.touches[0]?.clientX ?? null;
  }

  function handleDrawerTouchEnd() {
    if (touchStartX.current == null || touchMoveX.current == null) return;
    const delta = touchStartX.current - touchMoveX.current;
    if (delta > 64) {
      setSidebarOpen(false);
    }
  }

  return (
    <ModuleThemeFrame className="layout-wrapper min-h-screen text-cyber-text">
      <div
        className={`fixed inset-y-0 left-0 z-40 border-r border-cyan-400/12 bg-cyber-surface/95 shadow-2xl shadow-black/50 backdrop-blur-xl transition-[width] duration-200 ${
          isDesktop || isTablet ? "block" : "hidden"
        }`}
        style={{ width: isTablet ? "var(--sidebar-width-collapsed)" : sidebarCollapsed ? "var(--sidebar-width-collapsed)" : "var(--sidebar-width)" }}
      >
        <Sidebar
          collapsed={isTablet ? true : sidebarCollapsed}
          onToggle={isTablet ? undefined : () => setSidebarCollapsed(value => !value)}
          onNavigate={() => undefined}
        />
      </div>

      {isMobile ? (
        <button
          type="button"
          onClick={() => setSidebarOpen(value => !value)}
          aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
          className="fixed left-3 top-3 z-[200] h-9 w-9 rounded-lg border border-white/10 bg-[rgba(5,9,20,0.9)] p-0 text-cyber-text shadow-lg shadow-black/50"
        >
          {sidebarOpen ? <X className="mx-auto h-4 w-4" /> : <Menu className="mx-auto h-4 w-4" />}
        </button>
      ) : null}

      {isMobile && sidebarOpen ? (
        <div className="fixed inset-0 z-[150]">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 z-[140] bg-black/55"
            onClick={() => setSidebarOpen(false)}
          />
          <div
            className="fixed left-0 top-0 z-[150] h-full w-[75%] max-w-[280px] overflow-y-auto border-r border-[var(--border)] bg-[var(--bg-secondary)] transition-[left] duration-300 ease-out"
            onTouchStart={handleDrawerTouchStart}
            onTouchMove={handleDrawerTouchMove}
            onTouchEnd={handleDrawerTouchEnd}
          >
            <Sidebar
              collapsed={false}
              onNavigate={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="transition-[padding-left] duration-200" style={{ paddingLeft: leftPad }}>
        <Navbar onMobileMenuClick={isMobile ? () => setSidebarOpen(true) : undefined} />
        <main className="page-wrapper w-full py-4 sm:py-5 lg:py-6">
          <OutletTransition />
        </main>
      </div>
    </ModuleThemeFrame>
  );
}
