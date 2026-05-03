import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle, HelpCircle, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";

type Verdict = "safe" | "suspicious" | "malicious" | "unknown";

const verdictStyles: Record<Verdict, string> = {
  safe: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  suspicious: "border-amber-500/25 bg-amber-500/10 text-amber-200",
  malicious: "border-red-500/30 bg-red-500/10 text-red-400",
  unknown: "border-cyber-muted/25 bg-cyber-muted/10 text-cyber-muted",
};

function verdictIcon(verdict: Verdict) {
  if (verdict === "safe") return <CheckCircle className="h-4 w-4" />;
  if (verdict === "suspicious") return <AlertTriangle className="h-4 w-4" />;
  if (verdict === "malicious") return <XCircle className="h-4 w-4" />;
  return <ShieldAlert className="h-4 w-4" />;
}

export function InfoHint({
  title = "What is this?",
  children,
  icon: Icon = HelpCircle,
}: {
  title?: string;
  children: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <aside className="rounded-[1.1rem] border border-cyber-cyan/15 bg-cyber-cyan/[0.04] p-4">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
        <div>
          <h3 className="text-sm font-bold text-cyber-text">{title}</h3>
          <div className="mt-1 text-sm leading-6 text-cyber-muted">{children}</div>
        </div>
      </div>
    </aside>
  );
}

export function RecommendedActions({
  title = "Recommended next steps",
  actions,
}: {
  title?: string;
  actions: string[];
}) {
  return (
    <section className="soc-panel p-5">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-cyber-cyan" />
        <h3 className="text-base font-bold text-cyber-text">{title}</h3>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((action, index) => (
          <div key={action} className="rounded-2xl border border-cyber-cyan/10 bg-cyber-elevated/50 px-4 py-3 text-sm text-cyber-muted">
            <span className="mr-2 font-black text-cyber-cyan">{index + 1}.</span>
            {action}
          </div>
        ))}
      </div>
    </section>
  );
}

export function InvestigationChecklist({
  title = "Investigation checklist",
  steps,
}: {
  title?: string;
  steps: string[];
}) {
  return (
    <section className="rounded-[1.1rem] border border-cyan-400/12 bg-cyber-surface/50 p-4">
      <h3 className="text-sm font-bold text-cyber-text">{title}</h3>
      <ol className="mt-3 space-y-2">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3 text-sm leading-6 text-cyber-muted">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyber-cyan/20 bg-cyber-cyan/10 text-xs font-black text-cyan-200">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function EvidenceExplanation({
  title = "Why this matters",
  points,
}: {
  title?: string;
  points: string[];
}) {
  return (
    <section className="rounded-[1.1rem] border border-cyan-400/12 bg-cyber-surface/50 p-4">
      <h3 className="text-sm font-bold text-cyber-text">{title}</h3>
      <div className="mt-3 grid gap-2">
        {points.map(point => (
          <div key={point} className="flex items-start gap-2 text-sm leading-6 text-cyber-muted">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyber-cyan" />
            <span>{point}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function VerdictBadge({ verdict }: { verdict: Verdict | string }) {
  const normalized = ["safe", "suspicious", "malicious", "unknown"].includes(verdict)
    ? (verdict as Verdict)
    : "unknown";
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black capitalize ${verdictStyles[normalized]}`}>
      {verdictIcon(normalized)}
      {normalized}
    </span>
  );
}

export function RiskExplanation({
  score,
  reasons,
}: {
  score?: number | string | null;
  reasons: string[];
}) {
  return (
    <section className="rounded-[1.1rem] border border-amber-500/20 bg-amber-500/[0.04] p-4">
      <h3 className="text-sm font-bold text-cyber-text">Risk explanation</h3>
      <p className="mt-1 text-sm text-cyber-muted">
        Risk score: <span className="font-black text-amber-300">{score ?? "Not scored"}</span>
      </p>
      <div className="mt-3 grid gap-2">
        {reasons.map(reason => (
          <div key={reason} className="flex items-start gap-2 text-sm leading-6 text-cyber-muted">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <span>{reason}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
