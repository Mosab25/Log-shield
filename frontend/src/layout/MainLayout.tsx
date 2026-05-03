import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Sidebar } from "../components/Sidebar";

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  // Handle responsive behavior - close mobile drawer when switching to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  // Handle Escape key to close mobile drawer
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen text-cyber-text">
      {/* Desktop Sidebar - always visible on desktop */}
      <div className={`fixed inset-y-0 left-0 z-40 hidden border-r border-cyan-400/12 bg-cyber-surface/95 shadow-2xl shadow-black/50 backdrop-blur-xl transition-[width] duration-200 xl:block ${sidebarCollapsed ? "w-20" : "w-72"}`}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(value => !value)}
          onNavigate={() => setSidebarCollapsed(true)}
        />
      </div>

      {/* Mobile Sidebar Drawer - only on mobile/tablet */}
      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-cyber-bg/80 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative h-full w-80 max-w-[90vw] border-r border-cyan-400/12 bg-cyber-surface shadow-2xl shadow-black overflow-y-auto">
            <Sidebar 
              collapsed={false} 
              onNavigate={() => setSidebarOpen(false)} 
            />
          </div>
        </div>
      ) : null}

      {/* Main Content Area */}
      <div className={`transition-[padding] duration-200 ${sidebarCollapsed ? "xl:pl-20" : "xl:pl-72"}`}>
        <Navbar onMobileMenuClick={() => setSidebarOpen(true)} />
        <main className="mx-auto w-full max-w-[96rem] px-3 py-4 sm:px-4 sm:py-5 lg:px-6 lg:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
