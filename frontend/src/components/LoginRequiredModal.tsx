import { LogIn, UserPlus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppModal } from "./ui/AppModal";

interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  returnTo?: string;
}

export function LoginRequiredModal({
  isOpen,
  onClose,
  title = "Login Required",
  message = "Please login or create an account to use this LogShield feature.",
  returnTo,
}: LoginRequiredModalProps) {
  const navigate = useNavigate();

  const state = returnTo ? { from: { pathname: returnTo } } : undefined;

  return (
    <AppModal isOpen={isOpen} onClose={onClose} size="sm" panelClassName="rounded-3xl border border-cyan-300/20 bg-[#0B1020] p-1 shadow-[0_30px_90px_rgba(0,0,0,0.55),0_0_70px_rgba(0,212,255,0.16)]" overlayClassName="p-4 backdrop-blur-md">
      <div>
        <div className="rounded-[1.35rem] border border-white/5 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Protected Action</p>
              <h2 id="login-required-title" className="mt-2 text-2xl font-black text-white">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-cyan-300/10 bg-slate-950/60 p-2 text-slate-400 transition hover:border-cyan-300/30 hover:text-white"
              aria-label="Close login required modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-300">{message}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => navigate("/login", { state })}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
            >
              <LogIn className="h-4 w-4" />
              Login
            </button>
            <button
              type="button"
              onClick={() => navigate("/register", { state })}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-slate-950/60 px-4 py-3 text-sm font-bold text-cyan-100 transition hover:border-cyan-300/45 hover:text-white"
            >
              <UserPlus className="h-4 w-4" />
              Sign Up
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </AppModal>
  );
}
