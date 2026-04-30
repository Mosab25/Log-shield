import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Sidebar } from "../components/Sidebar";

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen text-slate-100">
      <div className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-cyan-200/10 bg-slate-950/90 shadow-2xl shadow-black/50 backdrop-blur-xl xl:block">
        <Sidebar />
      </div>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative h-full w-80 max-w-[86vw] border-r border-cyan-200/10 bg-slate-950 shadow-2xl shadow-black">
            <Sidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="xl:pl-72">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="mx-auto w-full max-w-[96rem] px-4 py-5 sm:px-5 lg:px-8 lg:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
