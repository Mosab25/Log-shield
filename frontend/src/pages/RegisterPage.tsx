import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, Lock, Mail, ShieldCheck, User } from "lucide-react";
import { ApiError, apiClient } from "../api/client";
import { useAuth } from "../auth/AuthContext";

interface RegisterResponse {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export function RegisterPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && isAuthenticated) return <Navigate to="/dashboard" replace />;

  const passwordHint = "Minimum 10 chars with uppercase, lowercase, number, and special character.";

  function validateForm(): string | null {
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) return "All fields are required.";
    if (password !== confirmPassword) return "Password confirmation does not match.";
    if (password.length < 10) return "Password does not meet security requirements.";
    return null;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setSuccess(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.register<RegisterResponse>({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
      });
      setSuccess("Account created successfully. You can now log in.");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422 && typeof err.detail === "object" && err.detail !== null) {
          const details = err.detail as Array<{ loc: string[]; msg: string; type: string }>;
          const fieldErrors = details.map(d => d.msg).join("; ");
          setError(fieldErrors || err.message);
        } else {
          setError(err.message);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Registration failed.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020817] px-4 py-8 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(34,211,238,0.18),transparent_34rem),linear-gradient(135deg,#020817_0%,#061227_48%,#020817_100%)]" />
      <section className="soc-panel-strong relative z-10 w-full max-w-md p-7 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200/25 bg-cyan-300/10 text-cyan-200">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-cyan-200">LogShield</p>
            <h1 className="text-2xl font-black text-white">Create Account</h1>
          </div>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4" autoComplete="off">
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">Full name</span>
            <span className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-700/80 bg-slate-950/80 px-4 py-3 transition focus-within:border-cyan-300/70">
              <User className="h-5 w-5 text-cyan-200/80" />
              <input value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-600" placeholder="Full Name" autoComplete="name" />
            </span>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">Email</span>
            <span className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-700/80 bg-slate-950/80 px-4 py-3 transition focus-within:border-cyan-300/70">
              <Mail className="h-5 w-5 text-cyan-200/80" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-600" placeholder="you@company.com" autoComplete="email" />
            </span>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">Password</span>
            <span className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-700/80 bg-slate-950/80 px-4 py-3 transition focus-within:border-cyan-300/70">
              <Lock className="h-5 w-5 text-cyan-200/80" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-600" placeholder="Password" autoComplete="new-password" />
            </span>
          </label>
          <p className="text-xs leading-5 text-slate-400">{passwordHint}</p>
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">Confirm password</span>
            <span className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-700/80 bg-slate-950/80 px-4 py-3 transition focus-within:border-cyan-300/70">
              <Lock className="h-5 w-5 text-cyan-200/80" />
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-600" placeholder="Confirm Password" autoComplete="new-password" />
            </span>
          </label>

          {error ? (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {success ? (
            <div className="flex items-start gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          ) : null}

          <button disabled={isSubmitting} className="soc-button-primary w-full py-3.5">
            {isSubmitting ? "Creating account..." : "Register"}
            {!isSubmitting ? <ArrowRight className="h-4 w-4" /> : null}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-cyan-200 hover:text-white">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
