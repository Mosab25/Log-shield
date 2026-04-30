import { Outlet } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { Sidebar } from "../components/Sidebar";

export function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-800 bg-slate-950/95 xl:block"><Sidebar /></div>
      <div className="xl:pl-72">
        <Navbar />
        <main className="mx-auto max-w-7xl px-5 py-6 lg:px-8"><Outlet /></main>
      </div>
    </div>
  );
}
