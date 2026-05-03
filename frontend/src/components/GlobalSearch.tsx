import { useEffect, useMemo, useRef, useState } from "react";
import { Command, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { navigationForRole } from "../navigation";

export function GlobalSearch() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const items = useMemo(() => navigationForRole(role), [role]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items.slice(0, 8);
    return items
      .filter(item => {
        const haystack = [
          item.label,
          item.description,
          item.section,
          ...item.keywords,
        ].join(" ").toLowerCase();
        return haystack.includes(needle);
      })
      .slice(0, 10);
  }, [items, query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  function choose(path: string) {
    navigate(path);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative flex shrink-0 lg:min-w-[16rem] lg:max-w-md lg:flex-1">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center gap-2 rounded-2xl border border-cyber-border-cyan bg-gradient-to-r from-cyber-surface/60 to-cyber-elevated/40 px-0 text-left text-sm text-cyber-muted shadow-inner shadow-black/20 transition hover:border-cyber-violet/30 hover:from-cyber-cyan/10 hover:to-cyber-violet/10 hover:text-cyber-text lg:h-11 lg:w-auto lg:justify-between lg:px-4 lg:py-2.5"
        aria-label="Search LogShield pages"
      >
        <span className="flex min-w-0 items-center gap-1 lg:gap-3">
          <Search className="h-4 w-4 shrink-0 text-cyan-300" />
          <span className="hidden truncate lg:inline">Search...</span>
        </span>
        <span className="hidden items-center gap-1 rounded-lg border border-cyber-border-violet bg-gradient-to-r from-cyber-violet/10 to-cyber-cyan/10 px-2 py-0.5 text-[0.68rem] font-bold text-cyber-text xl:flex">
          <Command className="h-3 w-3" /> K
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] bg-cyber-bg/70 px-3 py-20 sm:px-4 sm:py-24 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <div className="mx-auto w-full max-w-2xl rounded-[1.35rem] border border-cyber-border-cyan bg-gradient-to-br from-cyber-surface to-cyber-elevated shadow-2xl shadow-black/60" onMouseDown={event => event.stopPropagation()}>
            <div className="border-b border-cyan-400/10 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-cyber-muted" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Type logs, alerts, cve, tools, incidents..."
                  className="soc-input w-full pl-10"
                  aria-label="Search modules"
                />
              </div>
            </div>
            <div className="max-h-[24rem] overflow-y-auto p-2">
              {results.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-cyber-muted">No pages match your current role and search.</p>
              ) : (
                results.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => choose(item.path)}
                      className="flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-cyber-cyan/10"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyber-cyan/15 bg-gradient-to-br from-cyber-cyan/10 to-cyber-violet/10 text-cyber-cyan">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-bold text-cyber-text">{item.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-cyber-muted">{item.description}</span>
                        <span className="mt-1 block text-[0.65rem] font-black uppercase text-cyber-muted/60" style={{ letterSpacing: "0.12em" }}>{item.section}</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
