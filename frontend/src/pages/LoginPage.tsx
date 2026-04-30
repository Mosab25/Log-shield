import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck, Lock, AlertTriangle } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("admin@logshield.demo");
  const [password, setPassword] = useState("Admin@12345");
  const [error, setError] = useState<string | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/dashboard";
  if (!isLoading && isAuthenticated) return <Navigate to={from} replace />;

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (lockoutSeconds > 0 || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        const detailStr = typeof err.detail === "object" && err.detail !== null && "detail" in (err.detail as object) ? String((err.detail as { detail: unknown }).detail) : err.message;
        const match = detailStr.match(/(?:locked for|try again in)\s+(\d+)\s+seconds/i);
        const secs = match ? parseInt(match[1], 10) : 60;
        setLockoutSeconds(secs);
        setError(detailStr);
      } else {
        const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Login failed.";
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, "0")}` : `${sec}s`;
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
        <div className="flex items-center gap-3"><ShieldCheck className="h-10 w-10 text-cyan-300" /><div><h1 className="text-2xl font-bold">LogShield</h1><p className="text-sm text-slate-400">SOC Tier 1 Console</p></div></div>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <input value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3" placeholder="Email" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3" placeholder="Password" />
          {error && !lockoutSeconds && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {lockoutSeconds > 0 && (
            <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-center">
              <Lock className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-200 font-semibold">Account Temporarily Locked</p>
              <p className="text-3xl font-bold text-red-300 mt-2 tabular-nums">{formatTimer(lockoutSeconds)}</p>
              <p className="text-xs text-red-400/70 mt-2">{error ?? "Too many failed login attempts. Please wait before trying again."}</p>
            </div>
          )}
          <button disabled={lockoutSeconds > 0 || isSubmitting} className={`w-full rounded-2xl px-5 py-3 font-bold text-slate-950 transition-colors ${lockoutSeconds > 0 ? "bg-slate-600 cursor-not-allowed" : "bg-cyan-400 hover:bg-cyan-300"}`}>
            {isSubmitting ? "Signing in..." : lockoutSeconds > 0 ? `Locked (${formatTimer(lockoutSeconds)})` : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-400">
          No account yet?{" "}
          <Link to="/register" className="text-cyan-300 hover:text-cyan-200">
            Create one
          </Link>
        </p>
        <p className="mt-5 text-xs leading-6 text-slate-400">Demo: admin@logshield.demo / Admin@12345</p>
      </section>
    </main>
  );
}
