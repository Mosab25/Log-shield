import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ChevronLeft,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Lock,
  Mail,
  Network,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";

function LogShieldEmblem() {
  return (
    <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 shadow-[0_0_40px_rgba(34,211,238,0.24)]">
      <div className="absolute inset-1 rounded-[1.1rem] border border-white/10" />
      <svg viewBox="0 0 64 64" aria-hidden="true" className="h-11 w-11 drop-shadow-[0_0_18px_rgba(103,232,249,0.45)]">
        <path
          d="M32 6 51 14v15c0 14.5-8 23.5-19 29C21 52.5 13 43.5 13 29V14L32 6Z"
          fill="none"
          stroke="url(#shieldGradient)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M24 33.5 30 39 41 25" fill="none" stroke="#e0faff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 20h7m10 0h7M19 28h6m14 0h6M24 47h16" fill="none" stroke="#22d3ee" strokeWidth="1.7" strokeLinecap="round" opacity=".62" />
        <defs>
          <linearGradient id="shieldGradient" x1="12" x2="54" y1="8" y2="56">
            <stop stopColor="#a5f3fc" />
            <stop offset=".52" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function LoginPage() {
  const { login, verify2FA, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<{ challengeId: string; deliveryTarget: string | null; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/home";

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

  if (!isLoading && isAuthenticated) return <Navigate to={from} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if ((!twoFactorChallenge && lockoutSeconds > 0) || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    setLoadingMsg(twoFactorChallenge ? "Verifying code..." : "Connecting...");
    const slowTimer = setTimeout(() => {
      setLoadingMsg("Waking up server...");
    }, 2000);
    const verySlowTimer = setTimeout(() => {
      setLoadingMsg("Almost ready...");
    }, 5000);

    try {
      if (twoFactorChallenge) {
        await verify2FA(twoFactorChallenge.challengeId, otpCode);
      } else {
        const trimmedEmail = email.trim();
        if (trimmedEmail.toLowerCase().endsWith(".local")) {
          setError("This email domain is reserved and cannot be used. Please sign in with the real LogShield account email.");
          return;
        }
        const result = await login(trimmedEmail, password);
        if (result.requires2FA) {
          setTwoFactorChallenge({
            challengeId: result.challengeId || "",
            deliveryTarget: result.deliveryTarget ?? null,
            message: result.message || "Verification code sent to the admin security email.",
          });
          setOtpCode("");
          setPassword("");
          return;
        }
      }
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
        if (twoFactorChallenge && /sign in again|verification challenge|already been used/i.test(msg)) {
          setTwoFactorChallenge(null);
          setOtpCode("");
        }
        setError(msg);
      }
    } finally {
      clearTimeout(slowTimer);
      clearTimeout(verySlowTimer);
      setIsSubmitting(false);
      setLoadingMsg("");
    }
  }

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, "0")}` : `${sec}s`;
  };

  const verificationSubtitle = twoFactorChallenge?.deliveryTarget
    ? `Enter the verification code sent to ${twoFactorChallenge.deliveryTarget}.`
    : "Enter the verification code sent to the admin security email.";

  const submitLabel = (() => {
    if (isSubmitting && twoFactorChallenge) return "Verifying code...";
    if (isSubmitting) return "Signing in...";
    if (lockoutSeconds > 0 && !twoFactorChallenge) return `Locked (${formatTimer(lockoutSeconds)})`;
    return twoFactorChallenge ? "Verify Code" : "Sign in";
  })();

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-cyber-bg px-4 py-8 text-cyber-text sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(34,211,238,0.14),transparent_34rem),radial-gradient(circle_at_18%_78%,rgba(139,92,246,0.08),transparent_26rem),linear-gradient(135deg,#060B13_0%,#0B1220_48%,#060B13_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(34,211,238,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.18)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-px w-[84rem] -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
      <div className="pointer-events-none absolute -right-48 top-20 h-[34rem] w-[34rem] rounded-full border border-cyan-400/10" />
      <div className="pointer-events-none absolute -right-32 top-36 h-[22rem] w-[22rem] rounded-full border border-cyan-400/10" />

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_28rem]">
        <div className="hidden max-w-2xl lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100 shadow-[0_0_26px_rgba(34,211,238,0.16)]">
            <ShieldCheck className="h-4 w-4" />
            Secure Access
          </div>

          <h1 className="mt-8 max-w-3xl text-5xl font-black leading-tight text-cyber-text xl:text-6xl">
            Real-time defense intelligence for modern SOC teams.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-cyber-muted">
            LogShield brings risk detection, alert triage, and security monitoring into one polished command surface.
          </p>

          <div className="mt-10 grid max-w-xl gap-4 sm:grid-cols-3">
            {[
              { icon: Activity, label: "Threat Detection" },
              { icon: Fingerprint, label: "Risk Scoring" },
              { icon: Network, label: "Incident Triage" },
            ].map(item => (
              <div key={item.label} className="rounded-2xl border border-cyan-400/12 bg-cyber-elevated/50 p-4 shadow-2xl shadow-cyan-950/20 backdrop-blur">
                <item.icon className="h-5 w-5 text-cyan-300" />
                <p className="mt-3 text-sm font-semibold text-cyber-text">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <section className="relative rounded-[2rem] border border-cyan-400/15 bg-cyber-surface/80 p-1 shadow-[0_30px_100px_rgba(0,0,0,0.55),0_0_80px_rgba(34,211,238,0.1)] backdrop-blur-2xl">
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyber-cyan/50 to-transparent" />
            <div className="rounded-[1.75rem] border border-cyan-400/8 bg-gradient-to-b from-white/[0.06] to-white/[0.015] p-6 sm:p-8">
              <div className="flex items-center gap-4">
                <LogShieldEmblem />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-300">LogShield</p>
                  <h2 className="mt-1 text-2xl font-black text-cyber-text">LogShield Console</h2>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-3xl font-bold tracking-tight text-cyber-text">{twoFactorChallenge ? "Admin Verification" : "Sign in securely"}</h3>
                <p className="mt-2 text-sm leading-6 text-cyber-muted">
                  {twoFactorChallenge ? verificationSubtitle : "Access your monitoring workspace and continue investigating active security signals."}
                </p>
              </div>

              <form onSubmit={submit} className="mt-8 space-y-5" autoComplete="off">
                {!twoFactorChallenge ? (
                  <>
                    <label className="block">
                      <span className="text-sm font-medium text-cyber-text">Email address</span>
                      <span className="mt-2 flex items-center gap-3 rounded-2xl border border-cyan-400/15 bg-cyber-surface/80 px-4 py-3.5 text-cyber-text shadow-inner shadow-black/30 transition focus-within:border-cyber-cyan/50 focus-within:ring-4 focus-within:ring-cyber-cyan/10">
                        <Mail className="h-5 w-5 text-cyan-300/80" />
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="w-full bg-transparent text-sm outline-none placeholder:text-cyber-muted"
                          placeholder="you@company.com"
                          autoComplete="username"
                          required
                        />
                      </span>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-cyber-text">Password</span>
                      <span className="mt-2 flex items-center gap-3 rounded-2xl border border-cyan-400/15 bg-cyber-surface/80 px-4 py-3.5 text-cyber-text shadow-inner shadow-black/30 transition focus-within:border-cyber-cyan/50 focus-within:ring-4 focus-within:ring-cyber-cyan/10">
                        <Lock className="h-5 w-5 text-cyan-300/80" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="w-full bg-transparent text-sm outline-none placeholder:text-cyber-muted"
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(value => !value)}
                          className="rounded-lg p-1 text-cyber-muted transition hover:bg-cyber-elevated hover:text-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan/50"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </span>
                    </label>
                  </>
                ) : (
                  <>
                    <div className="rounded-2xl border border-cyber-cyan/20 bg-cyber-cyan/10 p-4 text-sm leading-6 text-cyan-200">
                      {twoFactorChallenge.message}
                    </div>
                    <label className="block">
                      <span className="text-sm font-medium text-cyber-text">6-digit verification code</span>
                      <span className="mt-2 flex items-center gap-3 rounded-2xl border border-cyan-400/15 bg-cyber-surface/80 px-4 py-3.5 text-cyber-text shadow-inner shadow-black/30 transition focus-within:border-cyber-cyan/50 focus-within:ring-4 focus-within:ring-cyber-cyan/10">
                        <KeyRound className="h-5 w-5 text-cyan-300/80" />
                        <input
                          type="text"
                          value={otpCode}
                          onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="w-full bg-transparent text-sm tracking-[0.35em] outline-none placeholder:text-cyber-muted"
                          placeholder="000000"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          required
                        />
                      </span>
                    </label>
                  </>
                )}

          {error && !lockoutSeconds && (
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-200 shadow-[0_0_24px_rgba(245,158,11,0.06)]">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    <span>{error}</span>
                  </div>
          )}
          {lockoutSeconds > 0 && (
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-center shadow-[0_0_30px_rgba(239,68,68,0.08)]">
                    <Lock className="mx-auto mb-2 h-8 w-8 text-red-400" />
                    <p className="font-semibold text-red-200">Access temporarily paused</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums text-red-300">{formatTimer(lockoutSeconds)}</p>
                    <p className="mt-2 text-xs text-red-300/75">{error ?? "Too many failed login attempts. Please wait before trying again."}</p>
                  </div>
          )}

                <button
                  disabled={(lockoutSeconds > 0 && !twoFactorChallenge) || isSubmitting || (twoFactorChallenge ? otpCode.trim().length !== 6 : false)}
                  className={`group flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-black text-cyber-bg shadow-[0_18px_42px_rgba(34,211,238,0.2)] transition duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyber-cyan/30 ${
                    ((lockoutSeconds > 0 && !twoFactorChallenge) || isSubmitting || (twoFactorChallenge ? otpCode.trim().length !== 6 : false))
                      ? "cursor-not-allowed bg-slate-600 text-slate-300 shadow-none"
                      : "bg-gradient-to-r from-cyan-200 via-cyber-cyan to-sky-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(34,211,238,0.28)]"
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="spin-icon" />
                      {loadingMsg || submitLabel}
                    </span>
                  ) : submitLabel}
                  {!isSubmitting && (lockoutSeconds <= 0 || twoFactorChallenge) ? <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /> : null}
                </button>
                {twoFactorChallenge ? (
                  <button
                    type="button"
                    onClick={() => {
                      setTwoFactorChallenge(null);
                      setOtpCode("");
                      setError(null);
                    }}
                    className="soc-button-ghost w-full"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back to login
                  </button>
                ) : null}
              </form>

              <div className="mt-7 border-t border-cyan-400/12 pt-5">
                <p className="text-center text-sm text-cyber-muted">
                  {twoFactorChallenge ? (
                    "Admin verification is required before access tokens are issued."
                  ) : (
                    <>
                      No account yet?{" "}
                      <Link to="/register" className="font-semibold text-cyan-300 transition hover:text-white focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-cyber-cyan/50">
                        Create one
                      </Link>
                    </>
                  )}
                </p>
              </div>
            </div>
          </section>

          <p className="mt-5 text-center text-xs text-cyber-muted">
            Protected access for security operations and incident response teams.
          </p>
        </div>
      </section>
    </main>
  );
}
