import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

/*
 * XSS SAFETY NOTE
 * ────────────────
 * All user input and tool output in this page is rendered as PLAIN TEXT only.
 *
 * Safe patterns used:
 *   - React JSX expressions {stringVar} auto-escape HTML entities
 *   - <textarea> renders content as text, never HTML
 *   - ToolOutput accepts `string` only (not ReactNode) to prevent rich content
 *   - SafeText component explicitly renders text via {text} in a <pre>
 *   - navigator.clipboard.writeText() copies plain text only
 *   - No dangerouslySetInnerHTML, eval, Function, DOMParser, or innerHTML
 *
 * DO NOT introduce:
 *   - dangerouslySetInnerHTML for user input or tool output
 *   - eval / Function / DOMParser for processing user input
 *   - innerHTML assignment with user-derived strings
 *   - ReactNode typing on output components (use string only)
 */
import {
  Binary,
  Link2,
  Fingerprint,
  KeyRound,
  ScanSearch,
  ShieldOff,
  Clock,
  MonitorSmartphone,
  Copy,
  Check,
  X,
  AlertTriangle,
  Wrench,
  MailSearch,
  ShieldCheck,
  Network,
  ListTree,
  FileSearch,
  FileWarning,
  Search,
  Upload,
} from "lucide-react";
import { Globe } from "lucide-react";
import { analyzeLogs, type AiAnalysisResult } from "../api/aiAnalysis";
import { analyzeEmailHeaders, type EmailHeaderAnalysisResponse } from "../api/emailAnalysis";
import { scanWebsite, type WebsiteAnalyzerResponse, type WebsiteAnalyzerFinding } from "../api/websiteAnalyzer";
import { checkEmailBreaches, type EmailBreachCheckResponse, type EmailBreachResult } from "../api/emailBreach";
import {
  checkDomainSpoofing,
  type DomainSpoofingFinding,
  type DomainSpoofingResponse,
  type DomainSpoofingVariant,
} from "../api/domainSpoofing";
import { toUserErrorMessage } from "../api/client";
import { AiInsightCard } from "../components/ai/AiInsightCard";
import { InfoHint, VerdictBadge } from "../components/Guidance";
import { AppModal } from "../components/ui/AppModal";
import { Chip } from "../components/ui/Chip";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { ToolDemoModal } from "../components/soc-tools/ToolDemoModal";
import { useAuthGate } from "../auth/useAuthGate";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { deriveAttackSignalFromText } from "../securitySignals";
import { socToolDemos } from "../data/socToolDemos";
import {
  compareLatestTwoByHostname,
  exportScanComparisonJson,
  exportScanComparisonTxt,
  exportScanJson,
  exportScanTxt,
  getWebsiteScanHistory,
  saveWebsiteScanToHistory,
  type StoredWebsiteScan,
} from "../features/mySecurity/scanHistory";
import { useAuth } from "../auth/AuthContext";

const MAX_INPUT_BYTES = 50 * 1024;

type RequireToolAuth = (action: () => void | Promise<void>) => boolean;

const ToolAuthGateContext = createContext<RequireToolAuth>((action) => {
  void action();
  return true;
});

function useToolAuthGate() {
  return useContext(ToolAuthGateContext);
}

function inputSizeOk(text: string): boolean {
  return new TextEncoder().encode(text).length <= MAX_INPUT_BYTES;
}

/* ───────────── shared UI primitives ───────────── */

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(
      () => { setOk(true); setTimeout(() => setOk(false), 1500); },
      () => {},
    );
  }, [text]);
  if (!text) return null;
  return (
    <button type="button" onClick={copy} className="ml-2 shrink-0 rounded-lg border border-cyan-400/15 bg-cyber-elevated px-2 py-1 text-xs text-cyber-muted transition hover:border-cyber-cyan/40 hover:text-cyber-cyan">
      {ok ? <Check className="inline h-3 w-3 mr-1" /> : <Copy className="inline h-3 w-3 mr-1" />}{ok ? "Copied" : "Copy"}
    </button>
  );
}

function ToolInput({ value, onChange, placeholder, rows = 5 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-2xl border border-cyan-400/15 bg-cyber-surface px-4 py-3 font-mono text-sm text-cyber-text placeholder:text-cyber-muted focus:border-cyber-cyan/60 focus:outline-none"
    />
  );
}

/** Renders tool output as plain text only. Accepts string, not ReactNode, to prevent XSS. */
function ToolOutput({ text }: { text: string }) {
  return (
    <pre className="min-h-[3rem] rounded-2xl border border-cyan-400/15 bg-cyber-surface px-4 py-3 font-mono text-sm text-cyber-green whitespace-pre-wrap break-all">{text}</pre>
  );
}

/** Renders a single IOC item as plain text only. */
function SafeText({ text }: { text: string }) {
  return <pre className="font-mono text-sm text-cyber-green whitespace-pre-wrap break-all">{text}</pre>;
}

function ToolError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function ToolEmptyState({ text }: { text: string }) {
  return <p className="py-4 text-center text-sm text-cyber-muted">{text}</p>;
}

function SizeWarning({ input }: { input: string }) {
  if (inputSizeOk(input)) return null;
  return <ToolError message="Input is too large. Please keep tool input under 50KB." />;
}

function ClearBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-lg border border-cyan-400/15 bg-cyber-elevated px-3 py-1.5 text-xs text-cyber-muted transition hover:border-cyber-red/40 hover:text-cyber-red">
      <X className="inline h-3 w-3 mr-1" />Clear
    </button>
  );
}

function ActionBtn({ label, onClick, disabled, variant = "primary" }: { label: string; onClick: () => void; disabled?: boolean; variant?: "primary" | "secondary" }) {
  const requireAuth = useToolAuthGate();
  const cls = variant === "primary"
    ? "rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
    : "rounded-xl border border-cyan-400/15 bg-cyber-elevated px-4 py-2 text-sm font-semibold text-cyber-text transition hover:border-cyber-cyan/40 hover:text-cyber-cyan disabled:opacity-50 disabled:cursor-not-allowed";
  return <button onClick={() => requireAuth(onClick)} disabled={disabled} className={cls}>{label}</button>;
}

type ToolVerdict = "safe" | "suspicious" | "malicious" | "unknown";
type ToolSeverity = "low" | "medium" | "high" | "critical";

interface ToolAssessment {
  title: string;
  verdict: ToolVerdict;
  severity: ToolSeverity;
  riskScore: number;
  summary: string;
  reasons: string[];
  recommendedActions?: string[];
  entities?: Record<string, string | null | undefined>;
}

function severityTone(severity: ToolSeverity): string {
  if (severity === "critical") return "border-red-500/30 bg-red-500/10 text-red-300";
  if (severity === "high") return "border-red-400/30 bg-red-500/10 text-red-200";
  if (severity === "medium") return "border-amber-400/25 bg-amber-500/10 text-amber-200";
  return "border-emerald-400/25 bg-emerald-500/10 text-emerald-300";
}

function ToolAssessmentCard({ assessment }: { assessment: ToolAssessment | null }) {
  if (!assessment) return null;
  const entityEntries = Object.entries(assessment.entities || {}).filter(([, value]) => value);
  return (
    <div className="space-y-4 rounded-3xl border border-cyan-300/12 bg-slate-950/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">Security Assessment</p>
          <h3 className="mt-1 text-lg font-bold text-white">{assessment.title}</h3>
          <p className="mt-1 text-sm text-slate-400">{assessment.summary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <VerdictBadge verdict={assessment.verdict} />
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${severityTone(assessment.severity)}`}>
            {assessment.riskScore}/100 - {assessment.severity}
          </span>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-cyan-400/10 bg-cyber-elevated/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Why this looks like that</p>
          <div className="mt-3 space-y-2">
            {assessment.reasons.map(reason => (
              <div key={reason} className="flex gap-2 text-sm text-slate-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {entityEntries.length > 0 ? (
            <div className="rounded-2xl border border-cyan-400/10 bg-cyber-elevated/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Investigation clues</p>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                {entityEntries.map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">{key.replace(/_/g, " ")}</span>
                    <span className="max-w-[16rem] truncate font-mono text-cyan-200" title={value || ""}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {assessment.recommendedActions?.length ? (
            <div className="rounded-2xl border border-cyan-400/10 bg-cyber-elevated/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">What to do next</p>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                {assessment.recommendedActions.slice(0, 4).map(action => (
                  <div key={action} className="flex gap-2">
                    <span className="font-black text-cyan-300">•</span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ───────────── 1. Base64 Tool ───────────── */

function Base64Tool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<ToolAssessment | null>(null);

  function encode() {
    setError(null);
    setAssessment(null);
    if (!inputSizeOk(input)) return;
    try {
      const encoded = btoa(unescape(encodeURIComponent(input)));
      setOutput(encoded);
      setAssessment(assessTextArtifact("Base64 input assessment", input, { treatIocsAsSuspicious: true }));
    } catch { setError("Encoding failed."); }
  }
  function decode() {
    setError(null);
    setAssessment(null);
    if (!inputSizeOk(input)) return;
    try {
      const decoded = decodeURIComponent(escape(atob(input.trim())));
      setOutput(decoded);
      setAssessment(assessTextArtifact("Decoded Base64 assessment", decoded, { treatIocsAsSuspicious: true }));
    } catch { setError("Invalid Base64 input. Check encoding and try again."); }
  }

  return (
    <div className="space-y-4">
      <ToolInput value={input} onChange={setInput} placeholder="Paste text or Base64 string..." />
      <SizeWarning input={input} />
      <div className="flex flex-wrap gap-2">
        <ActionBtn label="Encode" onClick={encode} disabled={!input.trim()} />
        <ActionBtn label="Decode" onClick={decode} disabled={!input.trim()} variant="secondary" />
        <ClearBtn onClick={() => { setInput(""); setOutput(""); setError(null); setAssessment(null); }} />
      </div>
      {error && <ToolError message={error} />}
      <ToolAssessmentCard assessment={assessment} />
      {output && <div className="space-y-1"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-cyber-muted">Output</span><CopyBtn text={output} /></div><ToolOutput text={output} /></div>}
    </div>
  );
}

/* ───────────── 2. URL Tool ───────────── */

function UrlTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<ToolAssessment | null>(null);

  function encode() {
    setError(null);
    setAssessment(null);
    if (!inputSizeOk(input)) return;
    try {
      const encoded = encodeURIComponent(input);
      setOutput(encoded);
      setAssessment(assessTextArtifact("URL input assessment", input, { treatIocsAsSuspicious: true }));
    } catch { setError("URL encoding failed."); }
  }
  function decode() {
    setError(null);
    setAssessment(null);
    if (!inputSizeOk(input)) return;
    try {
      const decoded = decodeURIComponent(input.trim());
      setOutput(decoded);
      const baseAssessment = assessTextArtifact("Decoded URL assessment", decoded, { treatIocsAsSuspicious: true });
      const lowered = decoded.toLowerCase();
      if (lowered.startsWith("javascript:") || lowered.startsWith("data:text/html")) {
        baseAssessment.verdict = "malicious";
        baseAssessment.severity = "high";
        baseAssessment.riskScore = Math.max(baseAssessment.riskScore, 88);
        baseAssessment.summary = "The decoded value looks like an executable browser payload.";
        baseAssessment.reasons.unshift("The URL uses a dangerous browser-executable scheme.");
      }
      setAssessment(baseAssessment);
    } catch { setError("Invalid URL-encoded input."); }
  }

  return (
    <div className="space-y-4">
      <ToolInput value={input} onChange={setInput} placeholder="Paste URL or encoded string..." />
      <SizeWarning input={input} />
      <div className="flex flex-wrap gap-2">
        <ActionBtn label="Encode" onClick={encode} disabled={!input.trim()} />
        <ActionBtn label="Decode" onClick={decode} disabled={!input.trim()} variant="secondary" />
        <ClearBtn onClick={() => { setInput(""); setOutput(""); setError(null); setAssessment(null); }} />
      </div>
      {error && <ToolError message={error} />}
      <ToolAssessmentCard assessment={assessment} />
      {output && <div className="space-y-1"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-cyber-muted">Output</span><CopyBtn text={output} /></div><ToolOutput text={output} /></div>}
    </div>
  );
}

/* ───────────── 3. Hash Generator ───────────── */

type Algo = "SHA-256" | "SHA-512" | "SHA-1" | "MD5";

function HashTool() {
  const [input, setInput] = useState("");
  const [algo, setAlgo] = useState<Algo>("SHA-256");
  const [results, setResults] = useState<{ algo: Algo; hash: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setError(null);
    if (!inputSizeOk(input)) return;
    try {
      const algos: Algo[] = algo === "SHA-256" ? ["SHA-256", "SHA-512", "SHA-1"] : [algo];
      const out: { algo: Algo; hash: string }[] = [];
      for (const a of algos) {
        const buf = await crypto.subtle.digest(a, new TextEncoder().encode(input));
        const arr = Array.from(new Uint8Array(buf));
        out.push({ algo: a, hash: arr.map(b => b.toString(16).padStart(2, "0")).join("") });
      }
      setResults(out);
    } catch { setError("Hash generation failed."); }
  }

  return (
    <div className="space-y-4">
      <ToolInput value={input} onChange={setInput} placeholder="Enter text to hash..." rows={3} />
      <SizeWarning input={input} />
      <div className="flex flex-wrap items-center gap-3">
        <select value={algo} onChange={e => setAlgo(e.target.value as Algo)} className="rounded-xl border border-cyan-400/15 bg-cyber-surface px-3 py-2 text-sm text-cyber-text">
          <option value="SHA-256">SHA-256</option>
          <option value="SHA-512">SHA-512</option>
          <option value="SHA-1">SHA-1</option>
        </select>
        <ActionBtn label="Generate" onClick={generate} disabled={!input.trim()} />
        <ClearBtn onClick={() => { setInput(""); setResults([]); setError(null); }} />
      </div>
      {error && <ToolError message={error} />}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map(r => (
            <div key={r.algo} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-cyber-muted">{r.algo}</span>
                <CopyBtn text={r.hash} />
              </div>
              <ToolOutput text={r.hash} />
            </div>
          ))}
          <p className="text-xs text-cyber-muted">SHA-1 is weak for security but useful for legacy IOC matching. MD5 is not included — consider it a future enhancement for IOC matching.</p>
        </div>
      )}
    </div>
  );
}

/* ───────────── 4. JWT Decoder ───────────── */

function JwtTool() {
  const [input, setInput] = useState("");
  const [header, setHeader] = useState<string | null>(null);
  const [payload, setPayload] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<ToolAssessment | null>(null);

  function decode() {
    setError(null); setHeader(null); setPayload(null); setAssessment(null);
    if (!inputSizeOk(input)) return;
    const parts = input.trim().split(".");
    if (parts.length < 2) { setError("Invalid JWT format. Expected at least 2 dot-separated parts."); return; }
    let h: Record<string, unknown>;
    try {
      h = JSON.parse(decodeURIComponent(escape(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")))));
      setHeader(JSON.stringify(h, null, 2));
    } catch { setError("Failed to decode JWT header."); return; }
    let p: Record<string, unknown>;
    try {
      p = JSON.parse(decodeURIComponent(escape(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")))));
      setPayload(JSON.stringify(p, null, 2));
    } catch { setError("Failed to decode JWT payload."); return; }
    const reasons = ["JWTs are decoded locally only. Signature trust is not established by this tool."];
    let riskScore = 18;
    let severity: ToolSeverity = "low";
    let verdict: ToolVerdict = "unknown";
    let summary = "The token structure is valid enough to decode, but decoded fields should not be trusted without verification.";
    const alg = String(h.alg || "").toLowerCase();
    const role = String((p as { role?: string }).role || "").toLowerCase();
    const subject = String((p as { sub?: string }).sub || (p as { email?: string }).email || "");
    if (alg === "none") {
      riskScore = 92;
      severity = "critical";
      verdict = "malicious";
      summary = "The JWT advertises the insecure alg=none pattern.";
      reasons.unshift("The header uses alg=none, which is unsafe if accepted by any backend.");
    } else if (role === "admin" || role === "root") {
      riskScore = 48;
      severity = "medium";
      verdict = "suspicious";
      summary = "The token claims privileged access and should be verified carefully.";
      reasons.unshift("The payload includes an elevated role claim.");
    }
    setAssessment({
      title: "JWT trust assessment",
      verdict,
      severity,
      riskScore,
      summary,
      reasons,
      recommendedActions: [
        "Verify the signature on the server side before trusting any claim.",
        "Treat admin, root, or long-lived tokens as sensitive investigation evidence.",
      ],
      entities: {
        subject,
        role,
        algorithm: alg || null,
      },
    });
  }

  return (
    <div className="space-y-4">
      <ToolInput value={input} onChange={setInput} placeholder="Paste JWT token..." rows={3} />
      <SizeWarning input={input} />
      <div className="flex flex-wrap gap-2">
        <ActionBtn label="Decode" onClick={decode} disabled={!input.trim()} />
        <ClearBtn onClick={() => { setInput(""); setHeader(null); setPayload(null); setError(null); setAssessment(null); }} />
      </div>
      {error && <ToolError message={error} />}
      <ToolAssessmentCard assessment={assessment} />
      {header && (
        <div className="space-y-1">
          <div className="flex items-center justify-between"><span className="text-xs font-semibold text-cyber-muted">Header</span><CopyBtn text={header} /></div>
          <ToolOutput text={header} />
        </div>
      )}
      {payload && (
        <div className="space-y-1">
          <div className="flex items-center justify-between"><span className="text-xs font-semibold text-cyber-muted">Payload</span><CopyBtn text={payload} /></div>
          <ToolOutput text={payload} />
        </div>
      )}
      {(header || payload) && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Decoded only. Signature is not verified. Do not trust decoded data.
        </div>
      )}
    </div>
  );
}

/* ───────────── 5. IOC Extractor ───────────── */

interface IocGroup { label: string; items: string[] }

const RE_IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|1?\d{1,2})\b/g;
const RE_URL = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
const RE_EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const RE_DOMAIN = /\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(?:[a-zA-Z]{2,})\b/g;
const RE_MD5 = /\b[a-fA-F0-9]{32}\b/g;
const RE_SHA1 = /\b[a-fA-F0-9]{40}\b/g;
const RE_SHA256 = /\b[a-fA-F0-9]{64}\b/g;

function extractIocs(text: string): IocGroup[] {
  const dedup = (arr: string[]) => [...new Set(arr)];
  const urls = dedup((text.match(RE_URL) || []) as string[]);
  const emails = dedup((text.match(RE_EMAIL) || []) as string[]);
  const ipv4 = dedup((text.match(RE_IPV4) || []) as string[]);
  const sha256 = dedup((text.match(RE_SHA256) || []) as string[]);
  const sha1 = dedup((text.match(RE_SHA1) || []).filter(h => !sha256.includes(h)) as string[]);
  const md5 = dedup((text.match(RE_MD5) || []).filter(h => !sha1.includes(h) && !sha256.includes(h)) as string[]);
  const urlDomains = new Set(urls.map(u => { try { return new URL(u).hostname; } catch { return ""; } }));
  const emailDomains = new Set(emails.map(e => e.split("@")[1]));
  const domains = dedup((text.match(RE_DOMAIN) || [])
    .filter(d => !urlDomains.has(d) && !emailDomains.has(d) && !/^\d+\.\d+\.\d+$/ .test(d)) as string[]);

  const groups: IocGroup[] = [];
  if (ipv4.length) groups.push({ label: "IPv4 Addresses", items: ipv4 });
  if (urls.length) groups.push({ label: "URLs", items: urls });
  if (domains.length) groups.push({ label: "Domains", items: domains });
  if (emails.length) groups.push({ label: "Email Addresses", items: emails });
  if (md5.length) groups.push({ label: "MD5 Hashes", items: md5 });
  if (sha1.length) groups.push({ label: "SHA-1 Hashes", items: sha1 });
  if (sha256.length) groups.push({ label: "SHA-256 Hashes", items: sha256 });
  return groups;
}

function verdictFromRisk(score: number, severity: ToolSeverity, defaultVerdict: ToolVerdict = "unknown"): ToolVerdict {
  if (severity === "critical" || score >= 85) return "malicious";
  if (severity === "high" || score >= 45) return "suspicious";
  if (severity === "medium" || score >= 20) return "suspicious";
  return defaultVerdict;
}

function assessTextArtifact(title: string, text: string, options?: { treatIocsAsSuspicious?: boolean }): ToolAssessment {
  const lower = text.toLowerCase();
  const iocGroups = extractIocs(text);
  const iocCount = iocGroups.reduce((sum, group) => sum + group.items.length, 0);
  const scriptSignal = deriveAttackSignalFromText(text);
  const reasons: string[] = [];
  const actions = [
    "Extract related IOCs and pivot into Threat Intelligence or URL Scanner.",
    "Correlate the artifact with alerts, logs, and incidents before acting on it.",
  ];
  let score = 5;
  let severity: ToolSeverity = "low";
  let summary = "No clear malicious behavior was identified in the current text.";

  if (scriptSignal.isAttack) {
    score = Math.max(score, scriptSignal.severityHint === "high" ? 78 : scriptSignal.severityHint === "medium" ? 55 : 35);
    severity = scriptSignal.severityHint === "critical" ? "critical" : scriptSignal.severityHint === "high" ? "high" : "medium";
    reasons.push(...scriptSignal.reasons);
    summary = scriptSignal.attackLabel
      ? `${scriptSignal.attackLabel} patterns were detected in the provided content.`
      : "Suspicious script-like behavior was detected in the provided content.";
  }

  if (/sqlmap|nmap|nikto|masscan|python-requests|curl\/|gobuster|dirbuster/.test(lower)) {
    score = Math.max(score, 52);
    severity = severity === "low" ? "medium" : severity;
    reasons.push("Automation or offensive testing tooling terms were found.");
  }

  if (/union\s+select|or\s+1=1|information_schema|sleep\(|drop\s+table/.test(lower)) {
    score = Math.max(score, 82);
    severity = "high";
    reasons.push("SQL injection markers were found.");
    summary = "The content includes SQL injection style payloads or database probing indicators.";
  }

  if (iocCount > 0 && options?.treatIocsAsSuspicious) {
    score = Math.max(score, iocCount >= 3 ? 45 : 28);
    severity = score >= 45 ? "medium" : severity;
    reasons.push(`${iocCount} IOC${iocCount !== 1 ? "s were" : " was"} extracted from the content.`);
  }

  if (!reasons.length) {
    reasons.push("No direct attack markers, exploit payloads, or suspicious execution patterns were found.");
  }

  return {
    title,
    verdict: verdictFromRisk(score, severity, score <= 10 ? "safe" : "unknown"),
    severity,
    riskScore: Math.min(100, score),
    summary,
    reasons,
    recommendedActions: actions,
    entities: {
      ip_address: iocGroups.find(group => group.label === "IPv4 Addresses")?.items[0] || null,
      url: iocGroups.find(group => group.label === "URLs")?.items[0] || null,
      email: iocGroups.find(group => group.label === "Email Addresses")?.items[0] || null,
    },
  };
}

function IocExtractorTool() {
  const [input, setInput] = useState("");
  const [groups, setGroups] = useState<IocGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<ToolAssessment | null>(null);

  function extract() {
    setError(null);
    setAssessment(null);
    if (!inputSizeOk(input)) return;
    const result = extractIocs(input);
    if (result.length === 0) {
      setGroups([]);
      setAssessment(assessTextArtifact("IOC extraction assessment", input));
      return;
    }
    setGroups(result);
    const total = result.reduce((sum, group) => sum + group.items.length, 0);
    const baseAssessment = assessTextArtifact("IOC extraction assessment", input, { treatIocsAsSuspicious: true });
    baseAssessment.summary = `The input produced ${total} extracted IOC${total !== 1 ? "s" : ""}.`;
    baseAssessment.riskScore = Math.max(baseAssessment.riskScore, total >= 4 ? 58 : 35);
    baseAssessment.severity = total >= 4 ? "high" : "medium";
    baseAssessment.verdict = total >= 4 ? "suspicious" : baseAssessment.verdict;
    baseAssessment.reasons.unshift("Structured indicators were extracted from the provided content.");
    setAssessment(baseAssessment);
  }

  const allIocs = groups.flatMap(g => g.items);
  const allJson = JSON.stringify(Object.fromEntries(groups.map(g => [g.label, g.items])), null, 2);

  return (
    <div className="space-y-4">
      <ToolInput value={input} onChange={setInput} placeholder={'Paste log lines, email headers, or suspicious text...\n\nXSS test: <script>alert(1)</script> <img src=x onerror=alert(1)> javascript:alert(1)'} rows={6} />
      <SizeWarning input={input} />
      <div className="flex flex-wrap gap-2">
        <ActionBtn label="Extract IOCs" onClick={extract} disabled={!input.trim()} />
        <ClearBtn onClick={() => { setInput(""); setGroups([]); setError(null); setAssessment(null); }} />
      </div>
      {error && <ToolError message={error} />}
      <ToolAssessmentCard assessment={assessment} />
      {input.trim() && groups.length === 0 && !error && <ToolEmptyState text="No IOCs found in the provided text." />}
      {groups.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-cyber-text">Found {allIocs.length} IOC{allIocs.length !== 1 ? "s" : ""}</span>
            <CopyBtn text={allJson} />
          </div>
          {groups.map(g => (
            <div key={g.label} className="rounded-2xl border border-cyan-400/15 bg-cyber-elevated/60 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-cyber-cyan">{g.label} <span className="text-cyber-muted">({g.items.length})</span></span>
                <CopyBtn text={g.items.join("\n")} />
              </div>
              <div className="space-y-0.5">
                {g.items.map((item, i) => <SafeText key={i} text={item} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────── 6. Defang / Refang ───────────── */

function defang(text: string): string {
  let out = text;
  out = out.replace(/https?:\/\//g, m => m.replace("http", "hxxp"));
  out = out.replace(/\./g, "[.]");
  return out;
}

function refang(text: string): string {
  let out = text;
  out = out.replace(/hxxps?:\/\//g, m => m.replace("hxxp", "http"));
  out = out.replace(/\[\.\]/g, ".");
  return out;
}

function DefangTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  function doDefang() {
    setError(null);
    if (!inputSizeOk(input)) return;
    setOutput(defang(input));
  }
  function doRefang() {
    setError(null);
    if (!inputSizeOk(input)) return;
    setOutput(refang(input));
  }

  return (
    <div className="space-y-4">
      <ToolInput value={input} onChange={setInput} placeholder="Paste URLs, domains, or IPs to defang/refang..." rows={4} />
      <SizeWarning input={input} />
      <div className="flex flex-wrap gap-2">
        <ActionBtn label="Defang" onClick={doDefang} disabled={!input.trim()} />
        <ActionBtn label="Refang" onClick={doRefang} disabled={!input.trim()} variant="secondary" />
        <ClearBtn onClick={() => { setInput(""); setOutput(""); setError(null); }} />
      </div>
      {error && <ToolError message={error} />}
      {output && <div className="space-y-1"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-cyber-muted">Output</span><CopyBtn text={output} /></div><ToolOutput text={output} /></div>}
    </div>
  );
}

/* ───────────── 7. Timestamp Converter ───────────── */

function TimestampTool() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"unix2date" | "date2unix">("unix2date");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function convert() {
    setError(null); setResult(null);
    if (!input.trim()) return;
    if (mode === "unix2date") {
      const raw = input.trim();
      let ts = Number(raw);
      if (isNaN(ts)) { setError("Invalid Unix timestamp."); return; }
      if (ts > 1e12) ts = ts / 1000;
      const d = new Date(ts * 1000);
      if (isNaN(d.getTime())) { setError("Invalid timestamp value."); return; }
      setResult(
        `UTC ISO:   ${d.toISOString()}\nLocal:     ${d.toLocaleString()}\nUnix sec:  ${Math.floor(ts)}\nUnix ms:   ${Math.floor(ts * 1000)}`
      );
    } else {
      const d = new Date(input.trim());
      if (isNaN(d.getTime())) { setError("Invalid date string. Try ISO format like 2024-01-15T10:30:00Z"); return; }
      const sec = Math.floor(d.getTime() / 1000);
      setResult(
        `UTC ISO:   ${d.toISOString()}\nLocal:     ${d.toLocaleString()}\nUnix sec:  ${sec}\nUnix ms:   ${d.getTime()}`
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select value={mode} onChange={e => setMode(e.target.value as "unix2date" | "date2unix")} className="rounded-xl border border-cyan-400/15 bg-cyber-surface px-3 py-2 text-sm text-cyber-text">
          <option value="unix2date">Unix → Date</option>
          <option value="date2unix">Date → Unix</option>
        </select>
      </div>
      <ToolInput value={input} onChange={setInput} placeholder={mode === "unix2date" ? "e.g. 1705312200" : "e.g. 2024-01-15T10:30:00Z"} rows={2} />
      <div className="flex flex-wrap gap-2">
        <ActionBtn label="Convert" onClick={convert} disabled={!input.trim()} />
        <ClearBtn onClick={() => { setInput(""); setResult(null); setError(null); }} />
      </div>
      {error && <ToolError message={error} />}
      {result && <div className="space-y-1"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-cyber-muted">Result</span><CopyBtn text={result} /></div><ToolOutput text={result} /></div>}
    </div>
  );
}

/* ───────────── 8. User-Agent Inspector ───────────── */

interface UaResult { browser: string; os: string; device: string; engine: string; raw: string }

function parseUa(ua: string): UaResult {
  let browser = "Unknown";
  let os = "Unknown";
  let engine = "Unknown";
  const device = /Mobi|Android.*Mobile/i.test(ua) ? "Mobile" : /Tablet|iPad/i.test(ua) ? "Tablet" : "Desktop";

  if (/Edg\//.test(ua)) browser = "Microsoft Edge";
  else if (/OPR|Opera/.test(ua)) browser = "Opera";
  else if (/Firefox/i.test(ua)) browser = "Firefox";
  else if (/Chrome/i.test(ua) && !/Edg/.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua) && !/Chrome/.test(ua)) browser = "Safari";

  if (/Windows NT/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad/.test(ua)) os = "iOS";
  else if (/Linux/.test(ua)) os = "Linux";

  if (/Gecko\//.test(ua)) engine = "Gecko";
  if (/AppleWebKit/.test(ua)) engine = "WebKit";
  if (/Chrome\//.test(ua) && !/Edg/.test(ua)) engine = "Blink";
  if (/Trident/.test(ua)) engine = "Trident";

  return { browser, os, device, engine, raw: ua };
}

function UaInspectorTool() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<UaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<ToolAssessment | null>(null);

  function analyze() {
    setError(null); setResult(null); setAssessment(null);
    if (!inputSizeOk(input)) return;
    if (!input.trim()) return;
    const parsed = parseUa(input.trim());
    setResult(parsed);
    const lower = input.toLowerCase();
    const suspicious = /sqlmap|nmap|nikto|masscan|python-requests|curl\/|zgrab|bot|crawler/.test(lower);
    setAssessment({
      title: "User-Agent assessment",
      verdict: suspicious ? "suspicious" : "unknown",
      severity: suspicious ? "medium" : "low",
      riskScore: suspicious ? 52 : 12,
      summary: suspicious
        ? "The User-Agent string resembles automation, reconnaissance, or scripted access."
        : "No strong malicious fingerprint was matched, but User-Agent values are easy to spoof.",
      reasons: suspicious
        ? ["Known scanning or automation keywords were found in the User-Agent string."]
        : ["User-Agent parsing is contextual only and does not prove trust or malice by itself."],
      recommendedActions: [
        "Correlate the User-Agent with source IP, request path, and repeated behavior.",
        "Check whether the same fingerprint appears in alerts, logs, or threat hunts.",
      ],
      entities: {
        browser: parsed.browser,
        os: parsed.os,
        device: parsed.device,
      },
    });
  }

  return (
    <div className="space-y-4">
      <ToolInput value={input} onChange={setInput} placeholder="Paste User-Agent string..." rows={3} />
      <SizeWarning input={input} />
      <div className="flex flex-wrap gap-2">
        <ActionBtn label="Analyze" onClick={analyze} disabled={!input.trim()} />
        <ClearBtn onClick={() => { setInput(""); setResult(null); setError(null); setAssessment(null); }} />
      </div>
      {error && <ToolError message={error} />}
      <ToolAssessmentCard assessment={assessment} />
      {result && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Browser", value: result.browser },
            { label: "OS", value: result.os },
            { label: "Device", value: result.device },
            { label: "Engine", value: result.engine },
          ].map(c => (
            <div key={c.label} className="rounded-2xl border border-cyan-400/15 bg-cyber-elevated/60 p-4">
              <p className="text-xs font-semibold text-cyber-muted">{c.label}</p>
              <p className="mt-1 text-sm font-semibold text-cyber-cyan">{c.value}</p>
            </div>
          ))}
        </div>
      )}
      {result && (
        <div className="space-y-1">
          <div className="flex items-center justify-between"><span className="text-xs font-semibold text-cyber-muted">Raw User-Agent</span><CopyBtn text={result.raw} /></div>
          <ToolOutput text={result.raw} />
          <p className="text-xs text-cyber-muted">Best-effort parsing. Results may not be exact for unusual or spoofed User-Agents.</p>
        </div>
      )}
    </div>
  );
}

/* SOC analyzers */

function unfoldHeaderLines(input: string): string[] {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const unfolded: string[] = [];
  for (const line of lines) {
    if (/^\s/.test(line) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += ` ${line.trim()}`;
    } else if (line.trim()) {
      unfolded.push(line.trim());
    }
  }
  return unfolded;
}

function parseHeaders(input: string): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const line of unfoldHeaderLines(input)) {
    const index = line.indexOf(":");
    if (index <= 0) continue;
    const key = line.slice(0, index).trim().toLowerCase();
    const value = line.slice(index + 1).trim();
    map[key] = [...(map[key] || []), value];
  }
  return map;
}

function getHeader(headers: Record<string, string[]>, key: string): string {
  return (headers[key.toLowerCase()] || []).join(" | ");
}

function EmailHeaderTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [assessment, setAssessment] = useState<ToolAssessment | null>(null);
  const [validationError, setValidationError] = useState("");
  const [loading, setLoading] = useState(false);

  function isLikelyEmailHeaderBlock(value: string): boolean {
    const lines = value.replace(/\r\n/g, "\n").split("\n").map(line => line.trim()).filter(Boolean);
    if (lines.length < 3) return false;
    const headerLikeLines = lines.filter(line => /^[A-Za-z0-9-]+:\s*.+$/.test(line));
    return headerLikeLines.length >= 3;
  }

  async function analyze() {
    setAssessment(null);
    setValidationError("");
    if (!inputSizeOk(input)) return;
    if (!isLikelyEmailHeaderBlock(input)) {
      setOutput("");
      setValidationError("Input does not look like raw email headers. Paste header lines in 'Key: Value' format.");
      return;
    }
    try {
      setLoading(true);
      const result: EmailHeaderAnalysisResponse = await analyzeEmailHeaders(input);
      setOutput(
        JSON.stringify(
          {
            summary: result.summary,
            authentication: result.authentication,
            suspicious_signals: result.suspicious_signals,
            next_steps: result.next_steps,
            safety_model: result.safety_model,
          },
          null,
          2,
        ),
      );

      setAssessment({
        title: "Email header trust assessment",
        verdict: result.verdict,
        severity: result.severity,
        riskScore: result.risk_score,
        summary:
          result.verdict === "safe"
            ? "Authentication and routing signals look reasonable from this API-backed review."
            : "The header contains trust or routing anomalies that deserve phishing-style triage.",
        reasons:
          result.suspicious_signals.length > 0
            ? result.suspicious_signals
            : ["No obvious header anomaly found. Continue with URL/attachment checks."],
        recommendedActions: result.next_steps.slice(0, 3),
        entities: {
          from: result.summary.from || null,
          reply_to: result.summary.reply_to || null,
          return_path: result.summary.return_path || null,
        },
      });
    } catch (err) {
      setOutput("");
      setAssessment(null);
      setValidationError(toUserErrorMessage(err, "Email analysis service is unavailable. Please check backend connection."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <ToolInput value={input} onChange={setInput} rows={7} placeholder="Paste raw email headers..." />
      <SizeWarning input={input} />
      {validationError ? <ToolError message={validationError} /> : null}
      <div className="flex flex-wrap gap-2">
        <ActionBtn label={loading ? "Analyzing..." : "Analyze Headers"} onClick={analyze} disabled={!input.trim() || loading} />
        <ClearBtn onClick={() => { setInput(""); setOutput(""); setAssessment(null); setValidationError(""); }} />
      </div>
      <ToolAssessmentCard assessment={assessment} />
      {output && <div className="space-y-1"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-400">Header Analysis</span><CopyBtn text={output} /></div><ToolOutput text={output} /></div>}
    </div>
  );
}

const SECURITY_HEADERS = [
  "content-security-policy",
  "strict-transport-security",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
];

function HttpHeadersTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [assessment, setAssessment] = useState<ToolAssessment | null>(null);

  function analyze() {
    setAssessment(null);
    if (!inputSizeOk(input)) return;
    const headers = parseHeaders(input);
    const present = SECURITY_HEADERS.filter(key => Boolean(headers[key]));
    const missing = SECURITY_HEADERS.filter(key => !headers[key]);
    const cookies = headers["set-cookie"] || [];
    const cookieFindings = cookies.map(cookie => ({
      cookie: cookie.split(";")[0],
      secure: /;\s*secure/i.test(cookie),
      http_only: /;\s*httponly/i.test(cookie),
      same_site: /;\s*samesite=/i.test(cookie),
      finding: [
        !/;\s*secure/i.test(cookie) ? "missing Secure" : "",
        !/;\s*httponly/i.test(cookie) ? "missing HttpOnly" : "",
        !/;\s*samesite=/i.test(cookie) ? "missing SameSite" : "",
      ].filter(Boolean).join(", ") || "cookie flags look reasonable",
    }));

    setOutput(JSON.stringify({
      security_headers: {
        present,
        missing,
        coverage: `${present.length}/${SECURITY_HEADERS.length}`,
      },
      cookies: cookieFindings.length ? cookieFindings : "No Set-Cookie headers found.",
      notes: [
        "Missing headers are not proof of compromise, but they increase browser-side risk.",
        "CSP helps reduce XSS impact when configured carefully.",
        "HSTS should only be enabled when HTTPS is stable for the full domain.",
      ],
    }, null, 2));
    const weakCookies = cookieFindings.filter(cookie => cookie.finding !== "cookie flags look reasonable").length;
    const riskScore = missing.length >= 4 || weakCookies >= 2 ? 72 : missing.length >= 2 || weakCookies >= 1 ? 46 : 14;
    const severity: ToolSeverity = riskScore >= 72 ? "high" : riskScore >= 46 ? "medium" : "low";
    setAssessment({
      title: "HTTP header security assessment",
      verdict: riskScore >= 72 ? "suspicious" : riskScore >= 46 ? "suspicious" : "safe",
      severity,
      riskScore,
      summary: riskScore >= 46
        ? "The pasted response headers show browser-side hardening gaps or weak cookie protections."
        : "No major browser security header gap stands out in this quick review.",
      reasons: [
        missing.length ? `${missing.length} recommended security header(s) are missing.` : "Core response security headers are present.",
        weakCookies ? `${weakCookies} cookie definition(s) are missing hardening flags.` : "Observed cookies include the expected basic hardening flags.",
      ],
      recommendedActions: [
        "Add CSP, HSTS, and cookie flags where your deployment model supports them.",
        "Treat missing headers as exposure risk, not direct proof of compromise.",
      ],
    });
  }

  return (
    <div className="space-y-4">
      <ToolInput value={input} onChange={setInput} rows={7} placeholder={'Paste HTTP response headers...\nContent-Security-Policy: default-src ...\nSet-Cookie: session=...; Secure; HttpOnly'} />
      <SizeWarning input={input} />
      <div className="flex flex-wrap gap-2">
        <ActionBtn label="Inspect Headers" onClick={analyze} disabled={!input.trim()} />
        <ClearBtn onClick={() => { setInput(""); setOutput(""); setAssessment(null); }} />
      </div>
      <ToolAssessmentCard assessment={assessment} />
      {output && <div className="space-y-1"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-400">Security Header Review</span><CopyBtn text={output} /></div><ToolOutput text={output} /></div>}
    </div>
  );
}

const PORTS: Record<string, { service: string; note: string; risk: string }> = {
  "20": { service: "FTP data", risk: "medium", note: "Legacy file transfer. Confirm encryption and exposure." },
  "21": { service: "FTP control", risk: "medium", note: "Plain FTP can expose credentials." },
  "22": { service: "SSH", risk: "medium", note: "Review public exposure, MFA, keys, and failed login rates." },
  "23": { service: "Telnet", risk: "high", note: "Plaintext remote shell. Treat internet exposure as serious." },
  "25": { service: "SMTP", risk: "medium", note: "Check relay restrictions and mail security posture." },
  "53": { service: "DNS", risk: "medium", note: "Review recursion and zone-transfer exposure." },
  "80": { service: "HTTP", risk: "low", note: "Check redirect to HTTPS and app attack surface." },
  "110": { service: "POP3", risk: "medium", note: "Legacy mail protocol; verify TLS." },
  "139": { service: "NetBIOS", risk: "high", note: "Should rarely be exposed outside trusted networks." },
  "143": { service: "IMAP", risk: "medium", note: "Verify TLS and brute-force controls." },
  "389": { service: "LDAP", risk: "high", note: "Review anonymous bind and external exposure." },
  "443": { service: "HTTPS", risk: "low", note: "Review certificate, TLS, and app security headers." },
  "445": { service: "SMB", risk: "critical", note: "High-risk if exposed. Investigate immediately." },
  "3389": { service: "RDP", risk: "critical", note: "Review VPN requirement, MFA, and brute-force activity." },
  "5432": { service: "PostgreSQL", risk: "high", note: "Database service. Avoid public exposure." },
  "5900": { service: "VNC", risk: "high", note: "Remote desktop. Verify access controls." },
  "6379": { service: "Redis", risk: "critical", note: "Often abused when unauthenticated or exposed." },
  "8080": { service: "HTTP alternate", risk: "medium", note: "Common admin/app port. Review exposure." },
  "9200": { service: "Elasticsearch", risk: "critical", note: "Sensitive data risk if exposed." },
};

function PortLookupTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [assessment, setAssessment] = useState<ToolAssessment | null>(null);

  function lookup() {
    const ports = input.split(/[\s,;]+/).map(item => item.trim()).filter(Boolean);
    const results = ports.map(port => ({
      port,
      ...(PORTS[port] || { service: "Unknown", risk: "unknown", note: "No local mapping. Verify protocol and exposure context." }),
    }));
    setOutput(JSON.stringify({
      results,
      next_steps: [
        "Confirm whether the port is internet-facing or internal only.",
        "Correlate with asset inventory and related alerts.",
        "Investigate critical remote admin or database exposure first.",
      ],
    }, null, 2));
    const maxRisk = results.some(item => item.risk === "critical") ? "critical" : results.some(item => item.risk === "high") ? "high" : results.some(item => item.risk === "medium") ? "medium" : "low";
    const riskScore = maxRisk === "critical" ? 88 : maxRisk === "high" ? 68 : maxRisk === "medium" ? 38 : 12;
    setAssessment({
      title: "Port exposure assessment",
      verdict: riskScore >= 68 ? "suspicious" : riskScore >= 38 ? "unknown" : "safe",
      severity: maxRisk,
      riskScore,
      summary: "Port numbers are contextual. The highest-risk service in the current list drives the score shown here.",
      reasons: results.slice(0, 4).map(item => `Port ${item.port} maps to ${item.service} with ${item.risk} exposure risk.`),
      recommendedActions: [
        "Confirm whether the service is public, internal, or intentionally segmented.",
        "Prioritize RDP, SMB, database, and search engine exposure first.",
      ],
    });
  }

  return (
    <div className="space-y-4">
      <ToolInput value={input} onChange={setInput} rows={3} placeholder="Enter ports: 22, 80, 443, 445, 3389" />
      <div className="flex flex-wrap gap-2">
        <ActionBtn label="Lookup Ports" onClick={lookup} disabled={!input.trim()} />
        <ClearBtn onClick={() => { setInput(""); setOutput(""); setAssessment(null); }} />
      </div>
      <ToolAssessmentCard assessment={assessment} />
      {output && <div className="space-y-1"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-400">Port Context</span><CopyBtn text={output} /></div><ToolOutput text={output} /></div>}
    </div>
  );
}

const WINDOWS_EVENTS: Record<string, { name: string; category: string; why: string; next: string[] }> = {
  "4624": { name: "Successful logon", category: "Authentication", why: "Useful for validating account access and login source.", next: ["Check logon type.", "Review source workstation/IP.", "Correlate with privilege events."] },
  "4625": { name: "Failed logon", category: "Authentication", why: "Often used for brute-force or password spraying investigation.", next: ["Group by source IP.", "Check affected users.", "Review lockout events."] },
  "4648": { name: "Explicit credentials used", category: "Credential Use", why: "Can indicate lateral movement or run-as activity.", next: ["Identify target server.", "Validate business reason.", "Check nearby 4624 events."] },
  "4672": { name: "Special privileges assigned", category: "Privilege", why: "Signals privileged logon and should be reviewed for admin accounts.", next: ["Confirm admin identity.", "Check source host.", "Review actions after logon."] },
  "4688": { name: "Process creation", category: "Execution", why: "Useful for suspicious command-line and malware execution review.", next: ["Review command line.", "Check parent process.", "Extract hashes or paths."] },
  "4720": { name: "User account created", category: "Account Management", why: "Unexpected account creation can indicate persistence.", next: ["Validate requester.", "Check group membership.", "Review creator account."] },
  "4726": { name: "User account deleted", category: "Account Management", why: "May indicate cleanup or unauthorized admin activity.", next: ["Review actor.", "Check change ticket.", "Preserve audit logs."] },
  "4732": { name: "Member added to local group", category: "Privilege", why: "Important for detecting unauthorized admin group changes.", next: ["Review group name.", "Validate member.", "Check source session."] },
  "4740": { name: "Account locked out", category: "Authentication", why: "Can indicate brute-force or misconfigured service credentials.", next: ["Identify source.", "Check failed logins.", "Confirm user impact."] },
  "4768": { name: "Kerberos TGT requested", category: "Kerberos", why: "Useful for domain authentication timeline.", next: ["Check client address.", "Review failures.", "Correlate with service tickets."] },
  "4769": { name: "Kerberos service ticket requested", category: "Kerberos", why: "Useful for service access and possible Kerberoasting context.", next: ["Review service name.", "Check encryption type.", "Look for repeated requests."] },
  "4771": { name: "Kerberos pre-auth failed", category: "Kerberos", why: "Can support password spray or account issue analysis.", next: ["Group by user/source.", "Check failure code.", "Review lockouts."] },
  "4776": { name: "NTLM credential validation", category: "Authentication", why: "Useful when tracking legacy auth and lateral movement.", next: ["Check workstation.", "Review failures.", "Reduce NTLM where possible."] },
  "1102": { name: "Audit log cleared", category: "Defense Evasion", why: "High-signal event that may indicate attacker cleanup.", next: ["Escalate quickly.", "Identify actor.", "Preserve remaining logs."] },
  "7045": { name: "Service installed", category: "Persistence", why: "Can indicate persistence or legitimate software deployment.", next: ["Review service path.", "Check signer/hash.", "Validate change request."] },
};

function WindowsEventTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [assessment, setAssessment] = useState<ToolAssessment | null>(null);

  function lookup() {
    const ids = input.match(/\b\d{3,5}\b/g) || [];
    const unique = [...new Set(ids)];
    const results = unique.map(id => ({
      event_id: id,
      ...(WINDOWS_EVENTS[id] || {
        name: "Unknown Event ID",
        category: "Unknown",
        why: "No local mapping is available.",
        next: ["Search vendor documentation.", "Correlate timestamp, user, source host, and related alerts."],
      }),
    }));
    setOutput(JSON.stringify({ results }, null, 2));
    const dangerous = results.filter(item => ["1102", "4672", "4688", "4732", "7045"].includes(item.event_id));
    const riskScore = dangerous.length >= 2 ? 76 : dangerous.length === 1 ? 52 : results.length ? 24 : 0;
    setAssessment({
      title: "Windows Event assessment",
      verdict: dangerous.length >= 2 ? "suspicious" : dangerous.length === 1 ? "suspicious" : results.length ? "unknown" : "safe",
      severity: dangerous.length >= 2 ? "high" : dangerous.length === 1 ? "medium" : "low",
      riskScore,
      summary: dangerous.length
        ? "The selected event IDs include high-value execution, privilege, persistence, or tampering telemetry."
        : "These event IDs are contextual and need surrounding host, user, and timing evidence.",
      reasons: dangerous.length
        ? dangerous.map(item => `${item.event_id} (${item.name}) often appears in elevated investigations.`)
        : ["No strongly dangerous event ID was matched in the current local lookup."],
      recommendedActions: [
        "Pivot into the raw event record, user, host, and nearby timestamps.",
        "Correlate privileged or tampering events with incidents and failed logons.",
      ],
    });
  }

  return (
    <div className="space-y-4">
      <ToolInput value={input} onChange={setInput} rows={4} placeholder="Paste Event IDs or a Windows log line, e.g. 4625 4672 1102" />
      <div className="flex flex-wrap gap-2">
        <ActionBtn label="Lookup Event IDs" onClick={lookup} disabled={!input.trim()} />
        <ClearBtn onClick={() => { setInput(""); setOutput(""); setAssessment(null); }} />
      </div>
      <ToolAssessmentCard assessment={assessment} />
      {output && <div className="space-y-1"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-400">Windows Event Context</span><CopyBtn text={output} /></div><ToolOutput text={output} /></div>}
    </div>
  );
}

function LogTriageTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [assessment, setAssessment] = useState<ToolAssessment | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);

  function triage() {
    if (!inputSizeOk(input)) return;
    const text = input.toLowerCase();
    const scriptSignal = deriveAttackSignalFromText(input);
    const signals = [
      { name: "Failed login", hit: /failed login|4625|invalid password|authentication failed/.test(text), severity: "medium", action: "Group by source IP and affected user." },
      { name: "SQL injection pattern", hit: /union\s+select|or\s+1=1|information_schema|sleep\(|drop\s+table/.test(text), severity: "high", action: "Review endpoint, source IP, and application errors." },
      { name: "XSS/script payload", hit: /<script|javascript:|onerror=|onload=|%3cscript/.test(text), severity: "high", action: "Check whether payload was reflected or stored." },
      { name: "Path scanning", hit: /\/wp-admin|\/phpmyadmin|\/\.env|\/etc\/passwd|404|not found/.test(text), severity: "medium", action: "Look for repeated paths from same source IP." },
      { name: "Privilege signal", hit: /privilege|admin|sudo|4672|4732|role/.test(text), severity: "high", action: "Validate actor, target account, and change reason." },
      { name: "Potential defense evasion", hit: /audit log cleared|1102|disabled logging|tamper/.test(text), severity: "critical", action: "Escalate and preserve evidence quickly." },
      { name: "Suspicious tool/user-agent", hit: /sqlmap|nmap|nikto|masscan|python-requests|curl\//.test(text), severity: "medium", action: "Correlate source IP with web and auth activity." },
    ].filter(item => item.hit);

    const severityWeight: Record<string, number> = { low: 10, medium: 25, high: 45, critical: 65 };
    let riskScore = signals.reduce((sum, item) => sum + (severityWeight[item.severity] || 0), 0);
    if (scriptSignal.isAttack) {
      riskScore += scriptSignal.severityHint === "high" ? 40 : scriptSignal.severityHint === "medium" ? 25 : 10;
    }
    riskScore = Math.max(0, Math.min(100, riskScore));
    const verdict = scriptSignal.isAttack || signals.length > 0 ? "attack_detected" : "no_clear_attack";
    const finalSeverity =
      riskScore >= 85 ? "critical"
      : riskScore >= 60 ? "high"
      : riskScore >= 30 ? "medium"
      : "low";

    setOutput(JSON.stringify({
      safety_model: {
        executed: false,
        rendered_as_html: false,
        note: "LogShield analyzes the input as plain text only and never executes script content.",
      },
      verdict,
      severity: finalSeverity,
      risk_score: riskScore,
      attack_type: scriptSignal.attackType || null,
      attack_label: scriptSignal.attackLabel || null,
      risk_reasons: scriptSignal.reasons,
      matched_signals: signals.length ? signals : [],
      extracted_iocs: Object.fromEntries(extractIocs(input).map(group => [group.label, group.items])),
      suggested_workflow: [
        "Check timestamp, source IP, user, endpoint, and status code.",
        "Extract IOCs and search them in Threat Intel or URL Scanner.",
        "Create or link an incident if multiple events share the same entity.",
      ],
    }, null, 2));
    setAssessment({
      title: "Log triage assessment",
      verdict: riskScore >= 85 ? "malicious" : riskScore >= 30 ? "suspicious" : "unknown",
      severity: finalSeverity,
      riskScore,
      summary: verdict === "attack_detected"
        ? "The log line matches one or more attack or suspicious-behavior patterns."
        : "No strong attack pattern was confirmed from this single line alone.",
      reasons: [
        ...scriptSignal.reasons,
        ...signals.map(item => `${item.name}: ${item.action}`),
      ].slice(0, 6),
      recommendedActions: [
        "Correlate the same IP, user, endpoint, and timestamp across nearby logs.",
        "Create or link an incident when multiple related signals are present.",
      ],
      entities: {
        ip_address: extractIocs(input).find(group => group.label === "IPv4 Addresses")?.items[0] || null,
        url: extractIocs(input).find(group => group.label === "URLs")?.items[0] || null,
      },
    });
  }

  async function triageWithAi() {
    if (!input.trim() || aiBusy) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const result = await analyzeLogs({ raw_logs: input, context: "SOC Tools Log Triage" });
      setAiResult(result);
    } catch (err: any) {
      setAiError(err?.message || "AI-assisted analysis failed.");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <ToolInput value={input} onChange={setInput} rows={6} placeholder="Paste one suspicious log line or alert message for quick triage..." />
      <SizeWarning input={input} />
      <div className="flex flex-wrap gap-2">
        <ActionBtn label="Triage Log" onClick={triage} disabled={!input.trim()} />
        <ActionBtn label={aiBusy ? "AI Analyzing..." : "AI-Assisted Analyze"} onClick={() => void triageWithAi()} disabled={!input.trim() || aiBusy} variant="secondary" />
        <ClearBtn onClick={() => { setInput(""); setOutput(""); setAssessment(null); setAiResult(null); setAiError(null); }} />
      </div>
      {aiError && <ToolError message={aiError} />}
      <ToolAssessmentCard assessment={assessment} />
      {aiResult ? <AiInsightCard result={aiResult} title="AI Log Classifier" /> : null}
      {output && <div className="space-y-1"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-400">Triage Result</span><CopyBtn text={output} /></div><ToolOutput text={output} /></div>}
    </div>
  );
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const STRING_SCAN_BYTES = 1024 * 1024;
const FILE_ANALYSIS_STORAGE_KEY = "logshield.fileAnalyzer.findings";

type FileAttackVerdict = "attack_detected" | "suspicious" | "informational";

interface FileSecurityAssessment {
  verdict: FileAttackVerdict;
  attack_name: string;
  classification: string;
  event_type: string;
  severity: "low" | "medium" | "high" | "critical";
  risk_score: number;
  risk_reasons: string[];
  entities: {
    username: string | null;
    ip_address: string | null;
    url: string | null;
    user_agent: string | null;
  };
  recommended_actions: string[];
}

interface StoredFileFinding {
  id: string;
  source: "file_analyzer";
  file_name: string;
  analyzed_at: string;
  verdict: FileAttackVerdict;
  attack_name: string;
  classification: string;
  event_type: string;
  severity: string;
  risk_score: number;
  risk_reasons: string[];
  username: string | null;
  ip_address: string | null;
  user_agent: string | null;
  iocs: Record<string, string[]>;
  hashes: {
    sha1: string;
    sha256: string;
    sha512: string;
  };
}

function bytesToHex(bytes: Uint8Array, max = 32): string {
  return Array.from(bytes.slice(0, max)).map(byte => byte.toString(16).padStart(2, "0")).join(" ");
}

function bytesToAscii(bytes: Uint8Array, max = 32): string {
  return Array.from(bytes.slice(0, max)).map(byte => (byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".")).join("");
}

async function digestHex(algorithm: "SHA-1" | "SHA-256" | "SHA-512", data: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest(algorithm, data);
  return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function calculateEntropy(bytes: Uint8Array): number {
  if (bytes.length === 0) return 0;
  const counts = new Array<number>(256).fill(0);
  bytes.forEach(byte => { counts[byte] += 1; });
  let entropy = 0;
  counts.forEach(count => {
    if (!count) return;
    const p = count / bytes.length;
    entropy -= p * Math.log2(p);
  });
  return Number(entropy.toFixed(3));
}

function detectFileType(bytes: Uint8Array, fileName: string): { type: string; confidence: string; notes: string[] } {
  const hex = bytesToHex(bytes, 16).replace(/\s/g, "").toLowerCase();
  const ascii = bytesToAscii(bytes, 16);
  const lowerName = fileName.toLowerCase();
  const notes: string[] = [];

  if (hex.startsWith("4d5a")) {
    notes.push("Windows executable signature detected.");
    return { type: "PE executable / DLL", confidence: "high", notes };
  }
  if (hex.startsWith("7f454c46")) {
    notes.push("Linux/Unix ELF binary signature detected.");
    return { type: "ELF binary", confidence: "high", notes };
  }
  if (hex.startsWith("25504446")) return { type: "PDF document", confidence: "high", notes: ["PDF magic bytes detected. Review embedded JavaScript or launch actions if suspicious."] };
  if (hex.startsWith("504b0304") || hex.startsWith("504b0506") || hex.startsWith("504b0708")) {
    const type = lowerName.endsWith(".docx") || lowerName.endsWith(".xlsx") || lowerName.endsWith(".pptx")
      ? "Office Open XML document"
      : lowerName.endsWith(".jar")
        ? "Java archive"
        : "ZIP archive";
    return { type, confidence: "high", notes: ["ZIP container signature detected. Do not extract unknown archives on production machines."] };
  }
  if (hex.startsWith("526172211a0700")) return { type: "RAR archive", confidence: "high", notes: ["Archive signature detected. Treat password-protected archives with caution."] };
  if (hex.startsWith("377abcaf271c")) return { type: "7z archive", confidence: "high", notes: ["Archive signature detected. Avoid extraction unless isolated."] };
  if (hex.startsWith("d0cf11e0a1b11ae1")) return { type: "Legacy Office/OLE document", confidence: "high", notes: ["OLE document can contain macros. Review in a sandboxed workflow."] };
  if (ascii.startsWith("#!")) return { type: "Script with shebang", confidence: "high", notes: ["Script file detected. Do not execute during triage."] };
  if (lowerName.endsWith(".ps1")) return { type: "PowerShell script", confidence: "medium", notes: ["PowerShell extension detected. Review suspicious commands as text only."] };
  if (lowerName.endsWith(".js") || lowerName.endsWith(".vbs") || lowerName.endsWith(".bat") || lowerName.endsWith(".cmd")) {
    return { type: "Script file", confidence: "medium", notes: ["Script extension detected. Render and review as text only."] };
  }
  if (lowerName.endsWith(".eml")) return { type: "Email message", confidence: "medium", notes: ["Email file detected. Use Email Headers tool for header triage."] };
  return { type: "Unknown / plain data", confidence: "low", notes: ["No known magic bytes matched. Use hashes and strings for triage."] };
}

function extractPrintableStrings(bytes: Uint8Array): string[] {
  const strings: string[] = [];
  let current = "";
  const scan = bytes.slice(0, STRING_SCAN_BYTES);
  for (const byte of scan) {
    if (byte >= 32 && byte <= 126) {
      current += String.fromCharCode(byte);
    } else {
      if (current.length >= 6) strings.push(current);
      current = "";
    }
    if (strings.length >= 80) break;
  }
  if (current.length >= 6 && strings.length < 80) strings.push(current);
  return [...new Set(strings)].slice(0, 60);
}

function suspiciousStringFindings(strings: string[]): string[] {
  const joined = strings.join("\n").toLowerCase();
  const findings = [
    { hit: /powershell|invoke-webrequest|downloadstring|frombase64string/.test(joined), text: "PowerShell downloader or encoded-command terms found." },
    { hit: /cmd\.exe|wscript|cscript|rundll32|regsvr32|mshta/.test(joined), text: "Windows living-off-the-land execution terms found." },
    { hit: /http:\/\/|https:\/\//.test(joined), text: "URL strings found. Extract and scan related URLs before opening." },
    { hit: /bitcoin|wallet|ransom|decrypt|tor\.onion/.test(joined), text: "Ransomware or payment-themed strings found." },
    { hit: /mimikatz|lsass|samdump|procdump/.test(joined), text: "Credential-theft related terms found." },
    { hit: /eval\(|document\.write|atob\(|unescape\(/.test(joined), text: "Script obfuscation or dynamic execution terms found." },
  ].filter(item => item.hit).map(item => item.text);
  return findings.length ? findings : ["No obvious suspicious string pattern detected in scanned slice."];
}

function firstIoc(iocs: Record<string, string[]>, label: string): string | null {
  const items = iocs[label];
  return Array.isArray(items) && items.length ? items[0] : null;
}

function extractUsernameFromStrings(strings: string[]): string | null {
  const text = strings.join("\n");
  const patterns = [
    /\b(?:username|user|account)\s*[:=]\s*([a-zA-Z0-9._@-]{2,80})/i,
    /\bfailed\s+login\s+(?:attempt\s+)?for\s+([a-zA-Z0-9._@-]{2,80})/i,
    /\blogin\s+from\s+[0-9.]+\s+to\s+([a-zA-Z0-9._@-]{2,80})\s+portal/i,
    /\bto\s+([a-zA-Z0-9._@-]{2,80})\s+portal/i,
    /\buser\s+([a-zA-Z0-9._@-]{2,80})\b/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].replace(/[.,;:)\]]+$/, "");
  }
  return null;
}

function extractUserAgentFromStrings(strings: string[]): string | null {
  const text = strings.join("\n");
  const match = text.match(/\buser-agent\s*[:=]\s*([^\r\n]{3,200})/i);
  return match?.[1]?.trim() || null;
}

function classifyFileAttack(
  strings: string[],
  iocs: Record<string, string[]>,
  typeInfo: { type: string; confidence: string; notes: string[] },
  entropy: number,
): FileSecurityAssessment {
  const text = strings.join("\n");
  const lower = text.toLowerCase();
  const reasons: string[] = [];
  const actions = [
    "Add the IP, username, and hashes to the investigation notes.",
    "Search extracted URLs and hashes in IOC Management and Threat Intel.",
    "Correlate this activity with alerts, logs, and active incidents.",
  ];
  let classification = "artifact_triage";
  let eventType = "file_artifact_review";
  let attackName = "No clear attack pattern detected";
  let severity: FileSecurityAssessment["severity"] = "low";
  let score = 20;

  if (/failed login|authentication failed|invalid password|login_failed|4625/.test(lower)) {
    attackName = "Credential Attack / Failed Login";
    classification = "authentication_attack";
    eventType = "failed_login";
    severity = "medium";
    score = Math.max(score, 60);
    reasons.push("Failed login or authentication failure pattern found.");
    actions.unshift("Review failed login volume from the same IP and affected username.");
  }

  if (/brute force|password spraying|credential stuffing/.test(lower)) {
    attackName = "Credential Attack / Brute Force";
    classification = "credential_attack";
    eventType = "brute_force";
    severity = "high";
    score = Math.max(score, 78);
    reasons.push("Credential attack wording found.");
  }

  if (/union\s+select|or\s+1=1|information_schema|sleep\(|drop\s+table|sqlmap/.test(lower)) {
    attackName = "Web Attack / SQL Injection Attempt";
    classification = "web_attack";
    eventType = "sql_injection_attempt";
    severity = "high";
    score = Math.max(score, 82);
    reasons.push("SQL injection pattern or SQL testing tool indicator found.");
    actions.unshift("Review web logs for endpoint, payload, source IP, and response status.");
  }

  if (/<script|javascript:|onerror=|onload=|%3cscript/.test(lower)) {
    attackName = "Web Attack / XSS Payload";
    classification = "web_attack";
    eventType = "xss_payload";
    severity = "high";
    score = Math.max(score, 78);
    reasons.push("Script/XSS payload pattern found.");
  }

  if (/python-requests|curl\/|wget|nmap|nikto|masscan|gobuster|dirbuster/.test(lower)) {
    score = Math.max(score, severity === "low" ? 45 : score + 5);
    if (severity === "low") severity = "medium";
    reasons.push("Automation or security-tool User-Agent indicator found.");
  }

  if (/callback|http:\/\/|https:\/\//.test(lower) && firstIoc(iocs, "URLs")) {
    score = Math.max(score, severity === "low" ? 50 : score + 5);
    if (severity === "low") severity = "medium";
    reasons.push("URL/callback indicator found in file strings.");
  }

  if (/audit log cleared|disabled logging|tamper|1102/.test(lower)) {
    attackName = "Defense Evasion / Log Tampering";
    classification = "defense_evasion";
    eventType = "log_tampering";
    severity = "critical";
    score = Math.max(score, 90);
    reasons.push("Log clearing or tampering pattern found.");
  }

  if (/pe executable|elf binary|script|powershell|office/i.test(typeInfo.type) || /powershell|downloadstring|frombase64string|mimikatz|lsass/.test(lower)) {
    score = Math.max(score, 65);
    if (severity === "low") severity = "medium";
    if (attackName === "No clear attack pattern detected") {
      attackName = "Suspicious File Artifact";
      classification = "suspicious_file";
      eventType = "suspicious_file_artifact";
    }
    reasons.push("Executable, script, or suspicious command artifact found.");
  }

  if (entropy >= 7.2) {
    score = Math.max(score, 55);
    reasons.push("High entropy may indicate packing, compression, or encryption.");
  }

  if (!reasons.length) reasons.push("No high-confidence attack pattern found. Treat as triage context only.");
  score = Math.min(100, score);

  const verdict: FileAttackVerdict =
    score >= 60 || attackName !== "No clear attack pattern detected"
      ? "attack_detected"
      : score >= 40
        ? "suspicious"
        : "informational";

  return {
    verdict,
    attack_name: attackName,
    classification,
    event_type: eventType,
    severity,
    risk_score: score,
    risk_reasons: reasons,
    entities: {
      username: extractUsernameFromStrings(strings),
      ip_address: firstIoc(iocs, "IPv4 Addresses"),
      url: firstIoc(iocs, "URLs"),
      user_agent: extractUserAgentFromStrings(strings),
    },
    recommended_actions: actions,
  };
}

function saveFileAnalyzerFinding(finding: StoredFileFinding) {
  try {
    const raw = localStorage.getItem(FILE_ANALYSIS_STORAGE_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(existing) ? existing : [];
    const next = [finding, ...list.filter(item => item?.id !== finding.id)].slice(0, 50);
    localStorage.setItem(FILE_ANALYSIS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Local storage is optional. Analysis output still works if storage is unavailable.
  }
}

function FileAnalyzerTool() {
  const requireAuth = useToolAuthGate();
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<ToolAssessment | null>(null);

  async function analyzeFile(file: File | null) {
    setError(null);
    setOutput("");
    setMessage(null);
    setAssessment(null);
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError("File is too large for browser-side triage. Please keep files under 10MB.");
      return;
    }

    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const typeInfo = detectFileType(bytes, file.name);
      const strings = extractPrintableStrings(bytes);
      const entropy = calculateEntropy(bytes.slice(0, STRING_SCAN_BYTES));
      const extractedIocs = Object.fromEntries(extractIocs(strings.join("\n")).map(group => [group.label, group.items]));
      const hashes = {
        sha1: await digestHex("SHA-1", buffer),
        sha256: await digestHex("SHA-256", buffer),
        sha512: await digestHex("SHA-512", buffer),
      };
      const assessment = classifyFileAttack(strings, extractedIocs, typeInfo, entropy);
      const analyzedAt = new Date().toISOString();
      const result = {
        safety_model: {
          executed: false,
          uploaded: false,
          rendered_as_html: false,
          note: "LogShield reads file bytes locally in the browser only. It does not execute, import, preview, or send the file.",
        },
        file: {
          name: file.name,
          size_bytes: file.size,
          browser_mime_type: file.type || "not provided",
          last_modified: new Date(file.lastModified).toISOString(),
        },
        identification: {
          detected_type: typeInfo.type,
          confidence: typeInfo.confidence,
          magic_hex: bytesToHex(bytes, 32),
          magic_ascii: bytesToAscii(bytes, 32),
          notes: typeInfo.notes,
        },
        hashes,
        security_assessment: {
          ...assessment,
          added_to_workspace: true,
          workspace_visibility: "Derived finding only. Raw file content and printable strings are not stored.",
        },
        triage: {
          entropy_first_1mb: entropy,
          entropy_note: entropy >= 7.2 ? "High entropy may indicate compression, encryption, or packing." : "Entropy is not unusually high for the scanned slice.",
          suspicious_strings: suspiciousStringFindings(strings),
          extracted_iocs: extractedIocs,
          printable_strings_sample: strings.slice(0, 30),
        },
        recommended_next_steps: [
          ...assessment.recommended_actions,
          "Search SHA-256 in IOC Management or Threat Intel.",
          "Extract and scan URLs/domains before opening anything.",
          "If executable/script/archive is suspicious, analyze only in an isolated malware-analysis VM.",
          "Attach hashes and strings to the incident, not the raw suspicious file.",
        ],
      };
      saveFileAnalyzerFinding({
        id: `${hashes.sha256}:${file.name}`,
        source: "file_analyzer",
        file_name: file.name,
        analyzed_at: analyzedAt,
        verdict: assessment.verdict,
        attack_name: assessment.attack_name,
        classification: assessment.classification,
        event_type: assessment.event_type,
        severity: assessment.severity,
        risk_score: assessment.risk_score,
        risk_reasons: assessment.risk_reasons,
        username: assessment.entities.username,
        ip_address: assessment.entities.ip_address,
        user_agent: assessment.entities.user_agent,
        iocs: extractedIocs,
        hashes,
      });
      setAssessment({
        title: "File triage assessment",
        verdict: assessment.verdict === "attack_detected" ? (assessment.risk_score >= 85 ? "malicious" : "suspicious") : assessment.verdict === "suspicious" ? "suspicious" : "unknown",
        severity: assessment.severity,
        riskScore: assessment.risk_score,
        summary: assessment.attack_name,
        reasons: assessment.risk_reasons,
        recommendedActions: assessment.recommended_actions,
        entities: {
          username: assessment.entities.username,
          ip_address: assessment.entities.ip_address,
          url: assessment.entities.url,
          user_agent: assessment.entities.user_agent,
        },
      });
      setOutput(JSON.stringify(result, null, 2));
      setMessage("Derived finding added to IOC Management and Asset Inventory. Raw file content was not stored.");
    } catch {
      setError("Failed to read file safely in the browser.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-300/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
        This tool does not execute, import, preview, or upload files. It reads bytes locally for hashes, signatures, entropy, IOC extraction, and printable-string triage only.
      </div>
      <label className="block rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 p-5 text-sm text-slate-300 transition hover:border-cyan-300/40">
        <span className="block font-semibold text-white">Choose a file for safe local triage</span>
        <span className="mt-1 block text-xs text-slate-500">Maximum size: 10MB. Suspicious files should still be handled in an isolated analysis workflow.</span>
        <input
          type="file"
          onChange={event => {
            const file = event.target.files?.[0] ?? null;
            const allowed = requireAuth(() => void analyzeFile(file));
            if (!allowed) event.currentTarget.value = "";
          }}
          className="mt-4 block w-full text-sm text-slate-400 file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-400 file:px-4 file:py-2 file:text-sm file:font-bold file:text-slate-950 hover:file:bg-cyan-300"
          disabled={loading}
        />
      </label>
      {loading ? <p className="text-sm font-semibold text-cyan-200">Analyzing file bytes locally...</p> : null}
      {message ? <p className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</p> : null}
      {error ? <ToolError message={error} /> : null}
      <ToolAssessmentCard assessment={assessment} />
      {output && <div className="space-y-1"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-400">File Triage Report</span><CopyBtn text={output} /></div><ToolOutput text={output} /></div>}
    </div>
  );
}

/* ───────────── 15. Website Security Analyzer ───────────── */

type ScanStage = "idle" | "validating" | "fetching" | "cookies" | "paths" | "forms" | "report" | "done" | "error";

const SCAN_STAGES: { key: ScanStage; label: string }[] = [
  { key: "validating", label: "Validating URL" },
  { key: "fetching", label: "Fetching headers" },
  { key: "cookies", label: "Checking cookies" },
  { key: "paths", label: "Checking exposed paths" },
  { key: "forms", label: "Analyzing forms" },
  { key: "report", label: "Generating report" },
];

function sevColor(severity: string): string {
  switch (severity) {
    case "critical": return "border-red-500/40 bg-red-500/15 text-red-300";
    case "high": return "border-red-400/30 bg-red-500/10 text-red-200";
    case "medium": return "border-amber-400/30 bg-amber-500/10 text-amber-200";
    case "low": return "border-emerald-400/25 bg-emerald-500/10 text-emerald-300";
    default: return "border-slate-600/30 bg-slate-700/20 text-slate-400";
  }
}

function riskLevelColor(level: string): string {
  switch (level) {
    case "critical": return "bg-red-500 text-white";
    case "high": return "bg-red-400 text-white";
    case "medium": return "bg-amber-400 text-slate-900";
    case "low": return "bg-emerald-400 text-slate-900";
    default: return "bg-slate-500 text-white";
  }
}

function tlsStatusLabel(status?: string): string {
  if (status === "supported") return "Yes";
  if (status === "not_supported") return "No";
  return "Inconclusive";
}

function tlsStatusTone(status?: string): string {
  if (status === "supported") return "text-red-300";
  if (status === "not_supported") return "text-emerald-300";
  return "text-amber-300";
}

function confidenceTone(confidence?: string): string {
  if (confidence === "high") return "text-emerald-300";
  if (confidence === "medium") return "text-amber-300";
  if (confidence === "low") return "text-slate-300";
  return "text-slate-400";
}

function WebsiteAnalyzerTool() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [url, setUrl] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [stage, setStage] = useState<ScanStage>("idle");
  const [result, setResult] = useState<WebsiteAnalyzerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeAdvancedTab, setActiveAdvancedTab] = useState("passive");
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [activeTechTab, setActiveTechTab] = useState("headers");
  const [historyTick, setHistoryTick] = useState(0);
  const [selectedHistoryScan, setSelectedHistoryScan] = useState<StoredWebsiteScan | null>(null);
  const requireAuth = useToolAuthGate();
  const history = useMemo(() => getWebsiteScanHistory(userId), [historyTick, userId]);
  const currentHostname = result?.target.hostname?.trim().toLowerCase() || "";
  const historyForCurrentHost = useMemo(
    () => (currentHostname ? history.filter((item) => item.hostname.trim().toLowerCase() === currentHostname) : []),
    [currentHostname, history],
  );
  const latestHostComparison = useMemo(
    () => (currentHostname ? compareLatestTwoByHostname(userId, currentHostname) : null),
    [currentHostname, userId, historyTick],
  );

  const canScan = url.trim().length > 0 && authorized && stage === "idle";

  async function runScan() {
    setError(null);
    setResult(null);
    setShowTechDetails(false);

    // Simulate progress stages for UX
    const stages: ScanStage[] = ["validating", "fetching", "cookies", "paths", "forms", "report"];
    for (const s of stages) {
      setStage(s);
      await new Promise(r => setTimeout(r, 250));
    }

    try {
      const res = await scanWebsite(url.trim(), authorized);
      saveWebsiteScanToHistory(res, userId);
      setHistoryTick((value) => value + 1);
      setResult(res);
      setStage("done");
    } catch (err: any) {
      setError(err?.message || "Website analyzer service is unavailable. Please check backend connection.");
      setStage("error");
    }
  }

  function clear() {
    setUrl("");
    setAuthorized(false);
    setStage("idle");
    setResult(null);
    setError(null);
    setShowAdvanced(false);
    setActiveAdvancedTab("passive");
    setShowTechDetails(false);
  }

  const hostname = result?.target.hostname || "domain";
  const formattedDate = new Date().toISOString().split("T")[0];

  function exportJson() {
    if (!result) return;
    const payload = {
      scan: result,
      comparison: latestHostComparison
        ? {
            previous: latestHostComparison.previous,
            latest: latestHostComparison.latest,
            deltas: {
              risk_score: latestHostComparison.risk_delta,
              findings_count: latestHostComparison.findings_delta,
              critical: latestHostComparison.critical_delta,
              high: latestHostComparison.high_delta,
            },
            fixed: latestHostComparison.fixed,
            still_open: latestHostComparison.still_open,
            new_findings: latestHostComparison.added,
          }
        : null,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `logshield-website-security-report-${hostname}-${formattedDate}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportTxt() {
    if (!result) return;

    const crit = result.findings.filter(f => f.severity === "critical");
    const high = result.findings.filter(f => f.severity === "high");
    const medLow = result.findings.filter(f => f.severity === "medium" || f.severity === "low" || f.severity === "informational");
    const robotsCheck = result.checks.robots;
    const sitemapCheck = result.checks.sitemap;
    const tlsCheck = result.checks.tls_versions;
    const cspCheck = result.checks.csp_analysis;
    const cookiePrefixCheck = result.checks.cookie_prefix_review;
    const hiddenCheck = result.checks.hidden_defacement;
    const correlatedCheck = result.checks.correlated_risks ?? [];
    const providerContext = result.context;
    const tuningSummary = result.context_tuning_summary;
    const severitySummary = result.severity_summary;
    const owaspSummary = result.owasp_summary ?? [];
    const comparisonBlock = latestHostComparison
      ? [
          "",
          "SCAN COMPARISON",
          "===============",
          `Previous risk score: ${latestHostComparison.previous.risk_score}/100 (${latestHostComparison.previous.risk_level.toUpperCase()})`,
          `Current risk score: ${latestHostComparison.latest.risk_score}/100 (${latestHostComparison.latest.risk_level.toUpperCase()})`,
          `Score change: ${latestHostComparison.risk_delta > 0 ? `+${latestHostComparison.risk_delta}` : latestHostComparison.risk_delta}`,
          `Findings change: ${latestHostComparison.findings_delta > 0 ? `+${latestHostComparison.findings_delta}` : latestHostComparison.findings_delta}`,
          "",
          "Fixed findings (not observed in latest scan):",
          ...(latestHostComparison.fixed.length
            ? latestHostComparison.fixed.map((item) => `  - ${item.title} was not observed in the latest scan.`)
            : ["  - None"]),
          "",
          "Still open findings:",
          ...(latestHostComparison.still_open.length
            ? latestHostComparison.still_open.map((item) => `  - ${item.title}`)
            : ["  - None"]),
          "",
          "New findings:",
          ...(latestHostComparison.added.length
            ? latestHostComparison.added.map((item) => `  - ${item.title}`)
            : ["  - None"]),
          "",
          "Comparison is based on findings observed by the safe Website Security Analyzer. A finding marked as fixed means it was not observed in the latest scan, not that the entire website is guaranteed secure.",
        ]
      : [];

    const lines: string[] = [
      "================================================================================",
      "                  LOGSHIELD WEBSITE SECURITY ASSESSMENT REPORT                  ",
      "================================================================================",
      `Scan Date:       ${new Date().toLocaleString()}`,
      `Target URL:      ${result.target.input_url}`,
      `Final Destination: ${result.target.final_url}`,
      `Overall Risk:    ${result.overall.risk_score}/100 (${result.overall.risk_level.toUpperCase()})`,
      "--------------------------------------------------------------------------------",
      "",
      "1. EXECUTIVE SUMMARY",
      "====================",
      result.overall.summary,
      "",
      "CONTEXT-AWARE ANALYSIS",
      `Known provider domain: ${providerContext?.known_provider_domain ? "Yes" : "No"}`,
      `Provider family: ${providerContext?.provider_family || "N/A"}`,
      `Adjusted findings: ${providerContext?.adjusted_findings ?? 0}`,
      `Tuning summary: adjusted=${tuningSummary?.adjusted_findings_count ?? 0}, downgraded=${tuningSummary?.downgraded_findings_count ?? 0}, upgraded=${tuningSummary?.upgraded_findings_count ?? 0}`,
      providerContext?.note || "No context note available.",
      "",
      "WHAT THIS MEANS:",
      result.overall.risk_explanation || "",
      "",
      "2. TOP PRIORITIES & REMEDIATION ROADMAP",
      "======================================",
      ...(result.roadmap || []).map(r => 
        `Priority ${r.priority}: [Action] ${r.action}\n  - Effort: ${r.effort.toUpperCase()}  |  Impact: ${r.impact.toUpperCase()}\n  - Associated findings: ${r.findings.join(", ") || "None"}\n`
      ),
      "",
      "3. DETAILED FINDINGS",
      "====================",
      "",
      "CRITICAL FINDINGS:",
      crit.length === 0 ? "  No critical findings detected." : "",
      ...crit.map(f => `  [P${f.priority}] ${f.title} (${f.owasp_category || "General"})\n   * What happened: ${f.evidence}\n   * Why it matters: ${f.impact}\n   * Fix roadmap: ${f.recommendation}\n`),
      "",
      "HIGH FINDINGS:",
      high.length === 0 ? "  No high findings detected." : "",
      ...high.map(f => `  [P${f.priority}] ${f.title} (${f.owasp_category || "General"})\n   * What happened: ${f.evidence}\n   * Why it matters: ${f.impact}\n   * Fix roadmap: ${f.recommendation}\n`),
      "",
      "MEDIUM & LOW FINDINGS:",
      medLow.length === 0 ? "  No medium or low findings detected." : "",
      ...medLow.map(f => `  [P${f.priority}] ${f.title} (${f.severity.toUpperCase()} - ${f.owasp_category || "General"})\n   * What happened: ${f.evidence}\n   * Why it matters: ${f.impact}\n   * Fix roadmap: ${f.recommendation}\n`),
      "",
      "5. ADVANCED ANALYSIS",
      "====================",
      "SEVERITY SUMMARY",
      `Critical: ${severitySummary?.critical ?? 0} | High: ${severitySummary?.high ?? 0} | Medium: ${severitySummary?.medium ?? 0} | Low: ${severitySummary?.low ?? 0} | Informational: ${severitySummary?.informational ?? 0}`,
      "",
      "OWASP SUMMARY",
      ...(owaspSummary.length
        ? owaspSummary.map(
            item =>
              `  - ${item.category}: total=${item.count}, critical=${item.critical}, high=${item.high}, medium=${item.medium}, low=${item.low}, informational=${item.informational ?? 0}`,
          )
        : ["  No OWASP summary data available."]),
      "",
      "PASSIVE DISCOVERY",
      `robots.txt fetched: ${robotsCheck?.fetched ? "Yes" : "No"} | sensitive disallow entries: ${robotsCheck?.sensitive_disallow_paths?.length ?? 0}`,
      `sitemap.xml fetched: ${sitemapCheck?.fetched ? "Yes" : "No"} | urls listed: ${sitemapCheck?.url_count ?? 0} | sensitive urls: ${sitemapCheck?.sensitive_url_count ?? 0}`,
      `sitemap HTTP urls: ${sitemapCheck?.http_url_count ?? 0}`,
      "",
      "TLS VERSION SECURITY",
      `TLS 1.0 supported: ${tlsStatusLabel(tlsCheck?.tls_1_0?.status)}`,
      `TLS 1.1 supported: ${tlsStatusLabel(tlsCheck?.tls_1_1?.status)}`,
      `Recommendation: ${tlsCheck?.recommendation || "Use TLS 1.2+ or TLS 1.3."}`,
      "",
      "CSP QUALITY",
      `CSP present: ${cspCheck?.present ? "Yes" : "No"} | risk level: ${String(cspCheck?.risk_level || "unknown").toUpperCase()}`,
      ...(cspCheck?.issues?.map(issue => `  - [${issue.severity.toUpperCase()}] ${issue.title}: ${issue.evidence}`) ?? []),
      "",
      "HIDDEN DEFACEMENT & SEO SPAM",
      `Risk level: ${String(hiddenCheck?.risk_level || "informational").toUpperCase()}`,
      `Hidden elements checked: ${hiddenCheck?.hidden_elements_checked ?? 0}`,
      `Suspicious hidden elements: ${hiddenCheck?.suspicious_hidden_elements?.length ?? 0}`,
      `Spam keywords found: ${hiddenCheck?.spam_keywords_found?.join(", ") || "None"}`,
      `Suspicious link domains: ${(hiddenCheck?.suspicious_links_found?.map(item => item.domain).join(", ")) || "None"}`,
      `Summary note: ${hiddenCheck?.summary_note || "No hidden-content summary available."}`,
      ...(hiddenCheck?.suspicious_hidden_elements?.slice(0, 5).map((item: any, idx: number) =>
        `  - [${idx + 1}] tag=${item.tag || "unknown"} patterns=${(item.matched_hidden_patterns || []).join("|") || "none"} keywords=${(item.matched_keywords || []).join("|") || "none"} snippet=${item.snippet || "N/A"}`
      ) ?? []),
      "",
      "CORRELATED RISK SCENARIOS",
      ...(correlatedCheck.length === 0
        ? ["  No correlated risk scenarios detected."]
        : correlatedCheck.map(scenario => `  - [${scenario.severity.toUpperCase()}] ${scenario.title}\n    Evidence: ${scenario.evidence.join(" | ")}\n    Actions: ${scenario.recommended_actions.join(" | ")}\n    Related finding IDs: ${scenario.related_finding_ids.join(", ") || "None"}\n`)),
      "",
      "COOKIE PREFIX REVIEW",
      ...(cookiePrefixCheck?.sensitive_cookies?.length
        ? cookiePrefixCheck.sensitive_cookies.map(cookie => `  - ${cookie.name}: prefix=${cookie.prefix}, Secure=${cookie.secure ? "Yes" : "No"}, HttpOnly=${cookie.httponly ? "Yes" : "No"}, SameSite=${cookie.samesite}`)
        : ["  No sensitive cookies were detected for prefix review."]),
      ...(cookiePrefixCheck?.issues?.map(issue => `  ! ${issue.title} (${issue.cookie_name}): ${issue.recommendation}`) ?? []),
      "",
      "6. SAFETY AND METHODOLOGY NOTE",
      "==============================",
      result.safety_model.note,
      `Checks performed: Non-invasive GET/HEAD requests only. Max paths: ${result.safety_model.max_paths_checked}.`,
      `HTML rendered in scanner: ${result.safety_model.html_rendered ? "Yes" : "No"}`,
      `JavaScript executed in scanner: ${result.safety_model.javascript_executed ? "Yes" : "No"}`,
      `Links followed by scanner: ${result.safety_model.links_followed ? "Yes" : "No"}`,
      `Raw HTML stored: ${result.safety_model.raw_html_stored ? "Yes" : "No"}`,
      "================================================================================",
      ...comparisonBlock,
      "",
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `logshield-website-security-report-${hostname}-${formattedDate}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function copySummary() {
    if (!result) return;
    const text = `Risk Score: ${result.overall.risk_score}/100 (${result.overall.risk_level.toUpperCase()})\nTarget: ${result.target.input_url}\n\nSummary:\n${result.overall.summary}\n\nWhat this means:\n${result.overall.risk_explanation || ""}`;
    navigator.clipboard.writeText(text);
  }

  const critCount = result?.severity_summary?.critical ?? result?.findings.filter(f => f.severity === "critical").length ?? 0;
  const highCount = result?.severity_summary?.high ?? result?.findings.filter(f => f.severity === "high").length ?? 0;
  const medCount = result?.severity_summary?.medium ?? result?.findings.filter(f => f.severity === "medium").length ?? 0;
  const lowCount = result?.severity_summary?.low ?? result?.findings.filter(f => f.severity === "low").length ?? 0;
  const infoCount = result?.severity_summary?.informational ?? result?.findings.filter(f => f.severity === "informational").length ?? 0;
  const robots = result?.checks.robots;
  const sitemap = result?.checks.sitemap;
  const tlsVersions = result?.checks.tls_versions;
  const cspAnalysis = result?.checks.csp_analysis;
  const cookiePrefixReview = result?.checks.cookie_prefix_review;
  const hiddenDefacement = result?.checks.hidden_defacement;
  const correlatedRisks = result?.checks.correlated_risks ?? [];
  const providerContext = result?.context;
  const tuningSummary = result?.context_tuning_summary;
  const adjustedFindings = result?.findings.filter(f => Boolean(f.original_severity)).length ?? 0;
  const analystNotesCount = result?.findings.filter(f => Boolean(f.analyst_note)).length ?? 0;
  const owaspSummary = result?.owasp_summary ?? [];

  return (
    <div className="space-y-6">
      {/* Input section */}
      <div className="space-y-3">
        <input
          id="wa-url-input"
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full rounded-2xl border border-cyan-400/15 bg-cyber-surface px-4 py-3 font-mono text-sm text-cyber-text placeholder:text-cyber-muted focus:border-cyber-cyan/60 focus:outline-none"
          disabled={stage !== "idle" && stage !== "done" && stage !== "error"}
        />
        <label className="flex items-center gap-2 text-sm text-cyber-text cursor-pointer select-none">
          <input
            id="wa-auth-checkbox"
            type="checkbox"
            checked={authorized}
            onChange={e => setAuthorized(e.target.checked)}
            className="h-4 w-4 rounded border-cyan-400/30 bg-cyber-surface text-cyan-400 focus:ring-cyan-400/40"
          />
          I confirm that I own this website or have permission to scan it.
        </label>
        <div className="flex flex-wrap gap-2">
          <ActionBtn
            label={stage === "idle" || stage === "done" || stage === "error" ? "Run Security Assessment" : "Scanning..."}
            onClick={() => requireAuth(runScan)}
            disabled={!canScan && stage !== "done" && stage !== "error"}
          />
          <ClearBtn onClick={clear} />
        </div>
      </div>

      {/* Scan progress */}
      {stage !== "idle" && stage !== "done" && stage !== "error" && (
        <div className="rounded-2xl border border-cyan-400/15 bg-cyber-elevated/40 p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-300/80">Scan Progress</p>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {SCAN_STAGES.map(s => {
              const idx = SCAN_STAGES.findIndex(x => x.key === stage);
              const sIdx = SCAN_STAGES.findIndex(x => x.key === s.key);
              const isDone = sIdx < idx;
              const isCurrent = s.key === stage;
              return (
                <div key={s.key} className={`flex items-center gap-2 text-sm rounded-xl p-2.5 border transition ${
                  isDone ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300" : isCurrent ? "border-cyan-400/30 bg-cyan-400/5 text-cyan-300 font-semibold" : "border-slate-800 bg-slate-900/10 text-slate-600"
                }`}>
                  {isDone ? <Check className="h-4 w-4 text-emerald-400 shrink-0" /> : isCurrent ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent shrink-0" /> : <span className="h-4 w-4 shrink-0 border border-slate-700 rounded-full" />}
                  {s.label}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error */}
      {error && <ToolError message={error} />}

      {/* Results Report */}
      {result && (
        <div className="space-y-6">
          {/* Executive view header */}
          <div className="rounded-2xl border border-cyan-400/15 bg-slate-950/80 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Security Assessment Report</h3>
                <p className="text-xs text-slate-500 font-mono">Target: {result.target.final_url}</p>
              </div>
              <span className="rounded-md border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-[11px] font-mono text-slate-400">
                Safe non-invasive scan
              </span>
            </div>

            {/* Risk overview stat cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-cyan-400/5 bg-slate-900/40 p-4 text-center">
                <p className="text-xs font-semibold uppercase text-slate-500">Risk Score</p>
                <p className="mt-1 text-3xl font-black text-white">{result.overall.risk_score}<span className="text-lg text-slate-500">/100</span></p>
              </div>
              <div className="rounded-2xl border border-cyan-400/5 bg-slate-900/40 p-4 text-center">
                <p className="text-xs font-semibold uppercase text-slate-500">Risk Level</p>
                <span className={`mt-2 inline-block rounded-full px-4 py-1 text-xs font-black uppercase ${riskLevelColor(result.overall.risk_level)}`}>
                  {result.overall.risk_level}
                </span>
              </div>
              <div className="rounded-2xl border border-cyan-400/5 bg-slate-900/40 p-4 text-center">
                <p className="text-xs font-semibold uppercase text-slate-500">Total Findings</p>
                <p className="mt-1 text-3xl font-black text-white">{result.findings.length}</p>
              </div>
              <div className="rounded-2xl border border-cyan-400/5 bg-slate-900/40 p-4 text-center">
                <p className="text-xs font-semibold uppercase text-slate-500">Critical / High</p>
                <p className="mt-1 text-3xl font-black">
                  <span className="text-red-400">{critCount}</span>
                  <span className="text-slate-600 mx-1">/</span>
                  <span className="text-amber-400">{highCount}</span>
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 px-3 py-2 text-xs text-slate-300">
              <p>Risk score is calculated after context-aware severity tuning.</p>
              {(tuningSummary?.adjusted_findings_count ?? adjustedFindings) > 0 ? (
                <p className="mt-1 text-cyan-200">
                  {(tuningSummary?.adjusted_findings_count ?? adjustedFindings)} findings were adjusted based on contextual analysis.
                </p>
              ) : null}
            </div>
          </div>

          {/* Executive summary & what this means */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-cyan-300/10 bg-slate-950/70 p-5 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-300">Executive Summary</h4>
              <p className="text-sm text-slate-300 leading-relaxed">{result.overall.summary}</p>
              
              {result.overall.top_priorities.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-800/40 space-y-1.5">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Top 3 Priorities</p>
                  {result.overall.top_priorities.slice(0, 3).map((p, i) => (
                    <div key={i} className="flex gap-2 text-xs text-slate-300">
                      <span className="font-black text-cyan-300 shrink-0">{i + 1}.</span>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-cyan-300/10 bg-slate-950/70 p-5 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-300">What this means</h4>
              <p className="text-sm text-slate-300 leading-relaxed">{result.overall.risk_explanation}</p>
              <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3 text-[11px] text-slate-400 leading-normal">
                This report represents a defensive posture scan. None of these checks exploited vulnerabilities, brute-forced directories, or sent high traffic volumes.
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-300/10 bg-slate-950/70 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-300">Context-Aware Analysis</h4>
                <p className="text-xs text-slate-500">
                  Findings remain visible. Context adjusts impact interpretation where platform behavior can differ.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-200">
                  Adjusted findings: {tuningSummary?.adjusted_findings_count ?? providerContext?.adjusted_findings ?? adjustedFindings}
                </span>
                <span className="rounded border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200">
                  Downgraded: {tuningSummary?.downgraded_findings_count ?? 0}
                </span>
                <span className="rounded border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-[11px] text-slate-300">
                  Analyst notes: {analystNotesCount}
                </span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Provider Context</p>
                <p className="mt-2 text-sm text-slate-200">
                  {providerContext?.known_provider_domain
                    ? `Known provider domain detected (${providerContext.provider_family || "Managed platform"}).`
                    : "No known major provider context detected for this hostname."}
                </p>
                <p className="mt-1 text-xs text-slate-400">{providerContext?.note || "No additional context note was returned."}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Severity Distribution</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded border border-red-500/20 bg-red-500/5 px-2 py-1 text-red-200">Critical: {critCount}</div>
                  <div className="rounded border border-red-400/20 bg-red-400/5 px-2 py-1 text-red-200">High: {highCount}</div>
                  <div className="rounded border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-amber-200">Medium: {medCount}</div>
                  <div className="rounded border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-emerald-200">Low: {lowCount}</div>
                  <div className="col-span-2 rounded border border-slate-700 bg-slate-900/70 px-2 py-1 text-slate-300">
                    Informational: {infoCount}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">OWASP Summary</p>
              {owaspSummary.length === 0 ? (
                <p className="text-xs text-slate-500">No OWASP aggregation data was returned for this scan.</p>
              ) : (
                <div className="space-y-2">
                  {owaspSummary.map((item) => (
                    <div key={item.category} className="rounded-lg border border-slate-800 bg-black/25 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-100">{item.category}</p>
                        <span className="rounded border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-[11px] text-cyan-200">
                          {item.count} finding{item.count === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Critical {item.critical} | High {item.high} | Medium {item.medium} | Low {item.low} | Info {item.informational ?? 0}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Fix Roadmap Section */}
          {result.roadmap && result.roadmap.length > 0 && (
            <div className="rounded-2xl border border-cyan-300/10 bg-slate-950/70 p-5 space-y-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-300">Remediation Roadmap</h4>
                <p className="text-xs text-slate-500">Prioritized sequence of steps to harden your website security.</p>
              </div>
              <div className="space-y-3">
                {result.roadmap.map(item => (
                  <div key={item.priority} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/20 p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 text-xs font-bold text-cyan-300 font-mono">
                          P{item.priority}
                        </span>
                        <span className="text-sm font-semibold text-white">{item.action}</span>
                      </div>
                      {item.findings.length > 0 && (
                        <p className="text-[11px] text-slate-500 font-mono">
                          Linked findings: {item.findings.join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <span className="rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-400 uppercase">
                        Effort: <span className="text-white">{item.effort}</span>
                      </span>
                      <span className="rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-400 uppercase">
                        Impact: <span className="text-cyan-300">{item.impact}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-cyan-400/10 bg-cyber-surface/10 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-4 text-left transition hover:bg-slate-900/30"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Advanced Analysis</p>
                <p className="text-[10px] text-slate-500">Passive discovery, TLS versions, CSP quality, correlated risks, and cookie prefix review.</p>
              </div>
              <span className={`text-xs font-semibold rounded px-2 py-1 border border-slate-800 bg-slate-900 text-slate-400 transition ${showAdvanced ? "text-cyan-300 border-cyan-400/20" : ""}`}>
                {showAdvanced ? "Hide Analysis" : "Show Analysis"}
              </span>
            </button>

            {showAdvanced ? (
              <div className="border-t border-slate-800 p-4 space-y-4 bg-slate-950/40">
                <div className="flex flex-wrap gap-1.5 border-b border-slate-850 pb-2">
                  {[
                    { key: "passive", label: "Passive Discovery" },
                    { key: "tls", label: "TLS Version Security" },
                    { key: "csp", label: "CSP Quality" },
                    { key: "hidden-defacement", label: "Hidden SEO Spam" },
                    { key: "correlated", label: "Correlated Risks" },
                    { key: "cookie-prefix", label: "Cookie Prefix Review" },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveAdvancedTab(tab.key)}
                      className={`rounded px-2.5 py-1 text-xs transition ${activeAdvancedTab === tab.key ? "bg-slate-800 text-white font-bold" : "text-slate-500 hover:text-slate-300"}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeAdvancedTab === "passive" ? (
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">robots.txt</p>
                      <p className="text-sm text-slate-300">Fetched: {robots?.fetched ? "Yes" : "No"} {robots?.status_code ? `(HTTP ${robots.status_code})` : ""}</p>
                      <p className="text-xs text-slate-500">Sensitive disclosed paths: {robots?.sensitive_disallow_paths?.length ?? 0}</p>
                      {robots?.sensitive_disallow_paths?.length ? (
                        <div className="space-y-1">
                          {robots.sensitive_disallow_paths.map((entry, idx) => (
                            <div key={`${entry.path}-${idx}`} className="text-xs font-mono text-amber-300">
                              {entry.path} (keyword: {entry.keyword})
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">sitemap.xml</p>
                      <p className="text-sm text-slate-300">Fetched: {sitemap?.fetched ? "Yes" : "No"} {sitemap?.status_code ? `(HTTP ${sitemap.status_code})` : ""}</p>
                      <p className="text-xs text-slate-500">URLs listed: {sitemap?.url_count ?? 0}</p>
                      <p className="text-xs text-slate-500">Sensitive URL hints: {sitemap?.sensitive_url_count ?? 0}</p>
                      <p className="text-xs text-slate-500">HTTP URLs in sitemap: {sitemap?.http_url_count ?? 0}</p>
                    </div>
                  </div>
                ) : null}

                {activeAdvancedTab === "tls" ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">TLS Version Security</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-slate-800 bg-black/30 p-3 text-sm">
                        <p className="text-slate-500">TLS 1.0 supported</p>
                        <p className={`mt-1 font-semibold ${tlsStatusTone(tlsVersions?.tls_1_0?.status)}`}>{tlsStatusLabel(tlsVersions?.tls_1_0?.status)}</p>
                        <p className="text-[11px] text-slate-500">{tlsVersions?.tls_1_0?.reason || "No probe data."}</p>
                      </div>
                      <div className="rounded-lg border border-slate-800 bg-black/30 p-3 text-sm">
                        <p className="text-slate-500">TLS 1.1 supported</p>
                        <p className={`mt-1 font-semibold ${tlsStatusTone(tlsVersions?.tls_1_1?.status)}`}>{tlsStatusLabel(tlsVersions?.tls_1_1?.status)}</p>
                        <p className="text-[11px] text-slate-500">{tlsVersions?.tls_1_1?.reason || "No probe data."}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">{tlsVersions?.recommendation || "Use TLS 1.2+ or TLS 1.3."}</p>
                  </div>
                ) : null}

                {activeAdvancedTab === "csp" ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">CSP Quality</p>
                      <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                        cspAnalysis?.risk_level === "high"
                          ? "bg-red-500/20 text-red-300"
                          : cspAnalysis?.risk_level === "medium"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-emerald-500/20 text-emerald-300"
                      }`}>
                        {(cspAnalysis?.risk_level || "unknown").toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">CSP Present: {cspAnalysis?.present ? "Yes" : "No"}</p>
                    {cspAnalysis?.issues?.length ? (
                      <div className="space-y-2">
                        {cspAnalysis.issues.map(issue => (
                          <div key={issue.id} className="rounded-lg border border-slate-800 bg-black/30 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm text-white">{issue.title}</p>
                              <span className={`text-[10px] uppercase ${confidenceTone(issue.confidence)}`}>
                                confidence: {issue.confidence || "high"}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{issue.evidence}</p>
                            {issue.original_severity ? (
                              <p className="text-[11px] text-cyan-200 mt-1">
                                Adjusted from {issue.original_severity.toUpperCase()} to {issue.severity.toUpperCase()}
                                {issue.adjustment_reason ? ` — ${issue.adjustment_reason}` : ""}
                              </p>
                            ) : null}
                            {issue.analyst_note ? <p className="text-[11px] text-slate-300 mt-1">{issue.analyst_note}</p> : null}
                            <p className="text-xs text-cyan-200 mt-1">{issue.recommendation}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-300">No CSP weaknesses were detected by this passive parser.</p>
                    )}
                  </div>
                ) : null}

                {activeAdvancedTab === "hidden-defacement" ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">Hidden Defacement & SEO Spam</p>
                        <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${riskLevelColor(String(hiddenDefacement?.risk_level || "informational"))}`}>
                          {String(hiddenDefacement?.risk_level || "informational").toUpperCase()}
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-lg border border-slate-800 bg-black/30 p-3 text-xs text-slate-300">
                          Hidden elements checked: <span className="font-semibold text-white">{hiddenDefacement?.hidden_elements_checked ?? 0}</span>
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-black/30 p-3 text-xs text-slate-300">
                          Suspicious hidden elements: <span className="font-semibold text-white">{hiddenDefacement?.suspicious_hidden_elements?.length ?? 0}</span>
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-black/30 p-3 text-xs text-slate-300">
                          Spam keywords: <span className="font-semibold text-white">{hiddenDefacement?.spam_keywords_found?.length ?? 0}</span>
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-black/30 p-3 text-xs text-slate-300">
                          Suspicious links: <span className="font-semibold text-white">{hiddenDefacement?.suspicious_links_found?.length ?? 0}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">
                        {hiddenDefacement?.summary_note || "Hidden content checks did not identify obvious SEO spam or defacement indicators."}
                      </p>
                    </div>

                    {hiddenDefacement?.suspicious_hidden_elements?.length ? (
                      <div className="space-y-2">
                        {hiddenDefacement.suspicious_hidden_elements.map((item, idx) => (
                          <div key={`hidden-signal-${idx}`} className="rounded-lg border border-slate-800 bg-black/30 p-3 text-xs text-slate-300 space-y-1">
                            <p><span className="text-slate-500">Element:</span> {item.tag || "unknown"}</p>
                            <p><span className="text-slate-500">Matched hidden CSS:</span> {(item.matched_hidden_patterns || []).join(", ") || "none"}</p>
                            <p><span className="text-slate-500">Matched keywords:</span> {(item.matched_keywords || []).join(", ") || "none"}</p>
                            <p><span className="text-slate-500">External link count:</span> {item.external_link_count ?? 0}</p>
                            <p><span className="text-slate-500">Snippet:</span> {item.snippet || "N/A"}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 text-xs text-emerald-300">
                        No obvious hidden SEO spam indicators were detected in the tested public HTML sample.
                      </div>
                    )}

                    {hiddenDefacement?.suspicious_links_found?.length ? (
                      <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">Suspicious Hidden Link Domains</p>
                        {hiddenDefacement.suspicious_links_found.map((link, idx) => (
                          <p key={`hidden-link-${idx}`} className="text-xs text-slate-300">
                            {link.domain}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {activeAdvancedTab === "correlated" ? (
                  <div className="space-y-2">
                    {correlatedRisks.length === 0 ? (
                      <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 text-xs text-slate-500">
                        No correlated risk scenarios were detected from combined weak signals.
                      </div>
                    ) : (
                      correlatedRisks.map(scenario => (
                        <div key={scenario.id} className={`rounded-xl border p-4 space-y-2 ${sevColor(scenario.severity)}`}>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-white">{scenario.title}</p>
                            <span className="text-[10px] uppercase font-black">{scenario.severity}</span>
                          </div>
                          <ul className="list-disc ml-4 space-y-1 text-xs text-slate-300">
                            {scenario.evidence.map((item, idx) => <li key={`${scenario.id}-e-${idx}`}>{item}</li>)}
                          </ul>
                          <p className="text-xs text-slate-300">{scenario.why_it_matters}</p>
                          <p className="text-xs text-cyan-200">Recommended: {scenario.recommended_actions.join(" | ")}</p>
                        </div>
                      ))
                    )}
                  </div>
                ) : null}

                {activeAdvancedTab === "cookie-prefix" ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">Sensitive Cookie Names</p>
                      {cookiePrefixReview?.sensitive_cookies?.length ? (
                        cookiePrefixReview.sensitive_cookies.map(cookie => (
                          <div key={cookie.name} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/70 pb-2 last:border-b-0 last:pb-0">
                            <span className="text-sm font-mono text-cyan-200">{cookie.name}</span>
                            <span className="text-xs text-slate-400">
                              prefix={cookie.prefix}, Secure={cookie.secure ? "yes" : "no"}, HttpOnly={cookie.httponly ? "yes" : "no"}, SameSite={cookie.samesite}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">No sensitive cookies detected for prefix checks.</p>
                      )}
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">Prefix Recommendations</p>
                      {cookiePrefixReview?.issues?.length ? (
                        cookiePrefixReview.issues.map((issue, idx) => (
                          <div key={`${issue.id}-${idx}`} className="text-xs text-slate-300">
                            <span className="text-amber-300 font-semibold">{issue.title}</span>: {issue.recommendation}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-emerald-300">No prefix-specific weaknesses were detected in sensitive cookies.</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Priority-Based Findings Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-300">Detailed Findings ({result.findings.length})</h4>
              <div className="flex gap-1">
                {critCount > 0 && <span className="rounded bg-red-500/20 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-300">{critCount} Critical</span>}
                {highCount > 0 && <span className="rounded bg-orange-500/20 border border-orange-500/30 px-2 py-0.5 text-[10px] font-bold text-orange-300">{highCount} High</span>}
                {medCount > 0 && <span className="rounded bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">{medCount} Medium</span>}
                {lowCount + infoCount > 0 && <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-400">{lowCount + infoCount} Low/Info</span>}
              </div>
            </div>

            {result.findings.length === 0 ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-6 text-center space-y-1">
                <p className="text-sm font-bold text-emerald-300">No critical or high-risk findings were detected by the safe assessment.</p>
                <p className="text-xs text-emerald-200/60">This does not guarantee the website is vulnerability-free. The analyzer performs safe non-invasive checks only.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {result.findings.map(f => (
                  <div key={f.id} className={`rounded-2xl border p-4 space-y-3 transition ${sevColor(f.severity)}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/40 pb-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${sevColor(f.severity)}`}>
                          {f.severity}
                        </span>
                        <span className={`text-[10px] font-semibold uppercase ${confidenceTone(f.confidence)}`}>
                          Confidence: {String(f.confidence || "high")}
                        </span>
                        <span className="text-sm font-bold text-white">{f.title}</span>
                      </div>
                      <span className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                        Priority {f.priority}
                      </span>
                    </div>

                    {f.original_severity ? (
                      <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-200">
                        Severity adjusted from <span className="font-semibold uppercase">{f.original_severity}</span> to{" "}
                        <span className="font-semibold uppercase">{f.severity}</span>.
                        {f.adjustment_reason ? <span className="block mt-1 text-cyan-100/85">{f.adjustment_reason}</span> : null}
                      </div>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-2 text-xs leading-relaxed">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-400">What happened</p>
                        <p className="text-slate-300 font-mono bg-slate-950/40 p-2 rounded border border-slate-800/25">{f.evidence}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-400">Why it matters</p>
                        <p className="text-slate-300 p-1">{f.impact}</p>
                      </div>
                    </div>

                    <div className="text-xs pt-1 border-t border-slate-800/20 space-y-1">
                      <p className="font-semibold text-slate-400">How to fix</p>
                      <p className="text-slate-300 font-medium">{f.recommendation}</p>
                    </div>

                    {f.analyst_note ? (
                      <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs text-slate-300">
                        <p className="font-semibold text-slate-200">Analyst note</p>
                        <p className="mt-1">{f.analyst_note}</p>
                      </div>
                    ) : null}

                    {f.owasp_category && (
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                        <span>OWASP Mapping: {f.owasp_category}</span>
                        <span>ID: {f.id}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scan History */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Scan History</h4>
                <p className="text-xs text-slate-500">
                  Track previous scans for this website and monitor security improvement over time.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-[10px] text-slate-300">
                  Local browser scan history
                </span>
                <Link to="/scan-history" className="rounded-md border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] text-cyan-200 hover:border-cyan-300/40">
                  Open Full History
                </Link>
              </div>
            </div>

            {historyForCurrentHost.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-4 text-xs text-slate-400">
                No previous scans found. Run a scan to start tracking your website security over time.
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="tbl w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.08em] text-slate-500">
                      <th className="px-3 py-2">Scan Date</th>
                      <th className="px-3 py-2">Target</th>
                      <th className="px-3 py-2">Risk Score</th>
                      <th className="px-3 py-2">Risk Level</th>
                      <th className="px-3 py-2">Findings</th>
                      <th className="px-3 py-2">Critical/High</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyForCurrentHost.slice(0, 10).map((scan) => (
                      <tr key={scan.id} className="border-t border-slate-800/80">
                        <td className="px-3 py-2 text-xs text-slate-400">{new Date(scan.scan_date).toLocaleString()}</td>
                        <td className="px-3 py-2 text-xs text-slate-200">{scan.target_url}</td>
                        <td className="px-3 py-2 text-xs text-slate-200">{scan.risk_score}/100</td>
                        <td className="px-3 py-2 text-xs text-slate-400">{scan.risk_level}</td>
                        <td className="px-3 py-2 text-xs text-slate-400">{scan.findings_count}</td>
                        <td className="px-3 py-2 text-xs text-slate-400">{scan.critical_count}/{scan.high_count}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedHistoryScan(scan)}
                              className="rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:text-white"
                            >
                              View Report
                            </button>
                            <button
                              type="button"
                              onClick={() => exportScanTxt(scan)}
                              className="rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:text-white"
                            >
                              Export TXT
                            </button>
                            <button
                              type="button"
                              onClick={() => exportScanJson(scan)}
                              className="rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:text-white"
                            >
                              Export JSON
                            </button>
                            {historyForCurrentHost[0]?.id === scan.id && latestHostComparison ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => exportScanComparisonTxt(latestHostComparison)}
                                  className="rounded border border-cyan-400/25 px-2 py-1 text-[10px] text-cyan-200 hover:border-cyan-300/50"
                                >
                                  Compare TXT
                                </button>
                                <button
                                  type="button"
                                  onClick={() => exportScanComparisonJson(latestHostComparison)}
                                  className="rounded border border-cyan-400/25 px-2 py-1 text-[10px] text-cyan-200 hover:border-cyan-300/50"
                                >
                                  Compare JSON
                                </button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Risk Comparison */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Compare</h4>
            {latestHostComparison ? (
              <>
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-3 text-xs text-slate-300">
                    <p className="text-[10px] uppercase text-slate-500">Previous Score</p>
                    <p className="mt-1 text-lg font-bold text-slate-100">{latestHostComparison.previous.risk_score}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-3 text-xs text-slate-300">
                    <p className="text-[10px] uppercase text-slate-500">Current Score</p>
                    <p className="mt-1 text-lg font-bold text-slate-100">{latestHostComparison.latest.risk_score}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-3 text-xs text-slate-300">
                    <p className="text-[10px] uppercase text-slate-500">Score Change</p>
                    <p className={`mt-1 text-lg font-bold ${latestHostComparison.risk_delta < 0 ? "text-emerald-300" : latestHostComparison.risk_delta > 0 ? "text-red-300" : "text-slate-200"}`}>
                      {latestHostComparison.risk_delta > 0 ? `+${latestHostComparison.risk_delta}` : latestHostComparison.risk_delta}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-3 text-xs text-slate-300">
                    <p className="text-[10px] uppercase text-slate-500">Critical/High Change</p>
                    <p className="mt-1 text-lg font-bold text-slate-100">
                      {latestHostComparison.critical_delta > 0 ? `+${latestHostComparison.critical_delta}` : latestHostComparison.critical_delta}/
                      {latestHostComparison.high_delta > 0 ? `+${latestHostComparison.high_delta}` : latestHostComparison.high_delta}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-400">
                  {latestHostComparison.risk_delta < 0
                    ? `Improved by ${Math.abs(latestHostComparison.risk_delta)} points.`
                    : latestHostComparison.risk_delta > 0
                      ? `Risk increased by ${latestHostComparison.risk_delta} points.`
                      : "Risk score did not change."}
                </p>

                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <p className="text-[11px] font-semibold uppercase text-emerald-300">Fixed</p>
                    {latestHostComparison.fixed.length ? (
                      <ul className="mt-2 space-y-1 text-xs text-slate-200">
                        {latestHostComparison.fixed.slice(0, 5).map((item) => (
                          <li key={item.id}>{item.title} was not observed in the latest scan.</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-slate-400">No fixed findings in this comparison.</p>
                    )}
                  </div>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <p className="text-[11px] font-semibold uppercase text-amber-300">Still Open</p>
                    {latestHostComparison.still_open.length ? (
                      <ul className="mt-2 space-y-1 text-xs text-slate-200">
                        {latestHostComparison.still_open.slice(0, 5).map((item) => (
                          <li key={item.id}>{item.title}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-slate-400">No still-open findings in this comparison.</p>
                    )}
                  </div>
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                    <p className="text-[11px] font-semibold uppercase text-red-300">New</p>
                    {latestHostComparison.added.length ? (
                      <ul className="mt-2 space-y-1 text-xs text-slate-200">
                        {latestHostComparison.added.slice(0, 5).map((item) => (
                          <li key={item.id}>{item.title}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-slate-400">No new findings in this comparison.</p>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  Comparison is based on findings observed by the safe Website Security Analyzer. A finding marked as fixed means it was not observed in the latest scan, not that the entire website is guaranteed secure.
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-500">Run another scan for this website to compare progress.</p>
            )}
          </div>

          {selectedHistoryScan ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Selected History Report</h4>
                <button
                  type="button"
                  onClick={() => setSelectedHistoryScan(null)}
                  className="rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:text-white"
                >
                  Close
                </button>
              </div>
              <p className="text-xs text-slate-300">
                {selectedHistoryScan.target_url} | {selectedHistoryScan.risk_score}/100 ({selectedHistoryScan.risk_level.toUpperCase()})
              </p>
              <p className="text-xs text-slate-400">{selectedHistoryScan.summary}</p>
            </div>
          ) : null}

          {/* Export Actions Panel */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white">Export Assessment Report</p>
              <p className="text-[10px] text-slate-500">Download formatted technical details or summary views.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copySummary} className="rounded-lg border border-slate-800 bg-cyber-elevated px-3.5 py-1.5 text-xs text-cyber-muted transition hover:border-cyber-cyan/40 hover:text-cyber-cyan">
                <Copy className="inline h-3.5 w-3.5 mr-1.5" />Copy Summary
              </button>
              <button type="button" onClick={exportJson} className="rounded-lg border border-slate-800 bg-cyber-elevated px-3.5 py-1.5 text-xs text-cyber-muted transition hover:border-cyber-cyan/40 hover:text-cyber-cyan">
                Export JSON
              </button>
              <button type="button" onClick={exportTxt} className="rounded-lg border border-slate-800 bg-cyber-elevated px-3.5 py-1.5 text-xs text-cyber-muted transition hover:border-cyber-cyan/40 hover:text-cyber-cyan">
                Export TXT
              </button>
            </div>
          </div>

          {/* Expandable Technical Details Toggle (default: collapsed) */}
          <div className="rounded-2xl border border-cyan-400/10 bg-cyber-surface/10 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTechDetails(!showTechDetails)}
              className="w-full flex items-center justify-between p-4 text-left transition hover:bg-slate-900/30"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Technical Details / Diagnostics</p>
                <p className="text-[10px] text-slate-500">Review raw HTTP headers, cookies, sitemap status, and tech headers.</p>
              </div>
              <span className={`text-xs font-semibold rounded px-2 py-1 border border-slate-800 bg-slate-900 text-slate-400 transition transform ${showTechDetails ? "text-cyan-300 border-cyan-400/20" : ""}`}>
                {showTechDetails ? "Hide Details" : "Show Details"}
              </span>
            </button>

            {showTechDetails && (
              <div className="border-t border-slate-800 p-4 space-y-4 bg-slate-950/40">
                {/* Tech subtabs */}
                <div className="flex flex-wrap gap-1.5 border-b border-slate-850 pb-2">
                  {["headers", "cookies", "paths", "technology", "forms", "raw_json"].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setActiveTechTab(t)}
                      className={`rounded px-2.5 py-1 text-xs font-mono transition ${activeTechTab === t ? "bg-slate-800 text-white font-bold" : "text-slate-500 hover:text-slate-300"}`}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Tech subtab content */}
                {activeTechTab === "headers" && (
                  <div className="space-y-2">
                    {result.checks.headers.map(h => (
                      <div key={h.header} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${h.present ? "border-emerald-400/20 bg-emerald-500/5 text-emerald-300" : "border-red-400/20 bg-red-500/5 text-red-300"}`}>
                        <span className="font-mono font-semibold">{h.header}</span>
                        <span className="text-xs">{h.present ? h.value || "Present" : "Missing"}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeTechTab === "cookies" && (
                  <div className="space-y-2">
                    {result.checks.cookies.length === 0 && <div className="text-xs text-slate-500 p-2 font-mono">No cookies detected.</div>}
                    {result.checks.cookies.map((c, i) => (
                      <div key={i} className="rounded-xl border border-cyan-400/10 bg-cyber-elevated/40 p-4 text-xs space-y-1 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-cyan-200">{c.name}</span>
                          {c.is_session_cookie && <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[9px] text-amber-300 font-bold font-sans">SESSION</span>}
                        </div>
                        <div className="flex flex-wrap gap-3 text-slate-400">
                          <span>Secure: <span className={c.secure ? "text-emerald-300 font-bold" : "text-red-300"}>{c.secure ? "Yes" : "No"}</span></span>
                          <span>HttpOnly: <span className={c.httponly ? "text-emerald-300 font-bold" : "text-red-300"}>{c.httponly ? "Yes" : "No"}</span></span>
                          <span>SameSite: <span className={c.samesite !== "missing" ? "text-emerald-300 font-bold" : "text-red-300"}>{c.samesite}</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTechTab === "paths" && (
                  <div className="space-y-2">
                    {result.checks.exposed_paths.map((p, i) => (
                      <div key={i} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${p.accessible ? "border-amber-400/20 bg-amber-500/5 text-amber-200 font-semibold" : "border-slate-800 bg-slate-900/20 text-slate-500"}`}>
                        <span className="font-mono">{p.path}</span>
                        <span className="text-xs font-mono">{p.status_code ?? "N/A"} {p.accessible ? "Accessible" : "Blocked"}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeTechTab === "technology" && (
                  <div className="space-y-2">
                    {result.checks.technology.length === 0 && <div className="text-xs text-slate-500 p-2 font-mono">No technical signatures exposed in server response.</div>}
                    {result.checks.technology.map((t, i) => (
                      <div key={i} className="rounded-xl border border-cyan-400/10 bg-cyber-elevated/40 p-4 text-xs space-y-1">
                        <span className="font-semibold text-cyan-200 font-mono">{t.type}</span>
                        <p className="font-mono text-slate-300">{t.value}</p>
                        <p className="text-slate-500">{t.recommendation}</p>
                      </div>
                    ))}
                  </div>
                )}

                {activeTechTab === "forms" && (
                  <div className="space-y-2">
                    {result.checks.forms.length === 0 && <div className="text-xs text-slate-500 p-2 font-mono">No forms found on target page.</div>}
                    {result.checks.forms.map((f: any, i: number) => (
                      <div key={i} className="rounded-xl border border-cyan-400/10 bg-cyber-elevated/40 p-4 text-xs space-y-1 font-mono">
                        <span className="font-semibold text-cyan-200">Form #{i + 1}</span>
                        <div className="flex flex-wrap gap-3 text-slate-400">
                          <span>Password field: <span className={f.has_password ? "text-amber-300 font-bold" : "text-slate-500"}>{f.has_password ? "Yes" : "No"}</span></span>
                          <span>File upload: <span className={f.has_file_upload ? "text-amber-300 font-bold" : "text-slate-500"}>{f.has_file_upload ? "Yes" : "No"}</span></span>
                          <span>CSRF token: <span className={f.csrf_token_present ? "text-emerald-300 font-bold" : "text-red-300"}>{f.csrf_token_present ? "Yes" : "No"}</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTechTab === "raw_json" && (
                  <div className="max-h-[300px] overflow-y-auto rounded-xl border border-slate-800 bg-black/60 p-4 font-mono text-[11px] text-emerald-400">
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Safety note */}
          <div className="flex items-start gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-200">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>{result.safety_model.note}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────── 16. Email Breach Checker ───────────── */

function normalizeDomainInput(value: string): { domain: string; error: string | null } {
  const raw = value.trim().toLowerCase();
  if (!raw) return { domain: "", error: "Please enter a valid domain." };
  if (raw.includes("@")) return { domain: "", error: "Please enter a domain, not an email address." };

  let hostname = "";
  try {
    const parsed = new URL(raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`);
    hostname = parsed.hostname.toLowerCase();
  } catch {
    return { domain: "", error: "Please enter a valid domain." };
  }

  if (!hostname) return { domain: "", error: "Please enter a valid domain." };
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    return { domain: "", error: "Local or internal hostnames are not allowed." };
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":")) {
    return { domain: "", error: "Please enter a domain, not an IP address." };
  }
  if (!hostname.includes(".")) return { domain: "", error: "Please enter a root domain like example.com." };
  if (!/^[a-z0-9.-]+$/.test(hostname)) return { domain: "", error: "Domain contains unsupported characters." };

  return { domain: hostname, error: null };
}

function DomainSpoofingDefenseTool() {
  const [domainInput, setDomainInput] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [maxVariants, setMaxVariants] = useState<10 | 20 | 50>(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<DomainSpoofingResponse | null>(null);

  const normalized = useMemo(() => normalizeDomainInput(domainInput), [domainInput]);
  const canRun = Boolean(normalized.domain) && authorized && !loading;

  const runCheck = useCallback(async () => {
    setError(null);
    setNotice(null);
    setResult(null);

    if (normalized.error) {
      setError(normalized.error);
      return;
    }
    if (!normalized.domain) {
      setError("Please enter a valid domain.");
      return;
    }
    if (!authorized) {
      setError("Please confirm you own this brand/domain or have permission to monitor impersonation risks.");
      return;
    }

    setLoading(true);
    try {
      const response = await checkDomainSpoofing(normalized.domain, true, maxVariants);
      setResult(response);
    } catch (err) {
      setError(toUserErrorMessage(err, "Unable to complete action. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [authorized, maxVariants, normalized.domain, normalized.error]);

  const clearAll = useCallback(() => {
    setDomainInput("");
    setAuthorized(false);
    setMaxVariants(20);
    setLoading(false);
    setError(null);
    setNotice(null);
    setResult(null);
  }, []);

  const buildSummary = useCallback((payload: DomainSpoofingResponse) => {
    const lines = [
      "LogShield Domain Spoofing Defense Report",
      `Date: ${new Date().toLocaleString()}`,
      `Target Domain: ${payload.target.domain}`,
      `Brand: ${payload.target.brand}`,
      `Variants Generated: ${payload.summary.variants_generated}`,
      `Active/Resolving Variants: ${payload.summary.registered_or_resolving}`,
      `MX-enabled Variants: ${payload.summary.mx_enabled}`,
      `Highest Risk: ${payload.summary.highest_risk.toUpperCase()}`,
      "",
      "Top Priorities:",
      ...payload.summary.top_priorities.map((item, idx) => `${idx + 1}. ${item}`),
      "",
      "Top Findings:",
      ...payload.findings.slice(0, 10).map((finding) => `- [${finding.severity.toUpperCase()}] ${finding.title}: ${finding.evidence}`),
      "",
      "Recommendations:",
      ...payload.variants.slice(0, 20).map((item) => `- ${item.domain}: ${item.recommendation}`),
      "",
      "Safety Model:",
      payload.safety_model.note,
    ];
    return lines.join("\n");
  }, []);

  const copySummary = useCallback(() => {
    if (!result) return;
    void navigator.clipboard.writeText(buildSummary(result));
    setNotice("Summary copied to clipboard.");
  }, [buildSummary, result]);

  const exportTxt = useCallback(() => {
    if (!result) return;
    const blob = new Blob([buildSummary(result)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `logshield-domain-spoofing-${result.target.domain}-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }, [buildSummary, result]);

  const exportJson = useCallback(() => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `logshield-domain-spoofing-${result.target.domain}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [result]);

  return (
    <div className="space-y-5">
      <InfoHint title="Defensive brand protection only">
        Only monitor domains you own or are authorized to protect. This tool does not create phishing content, does not register domains, and performs limited passive DNS checks only.
      </InfoHint>

      <div className="rounded-2xl border border-cyan-400/15 bg-cyber-elevated/40 p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Domain</label>
            <input
              type="text"
              value={domainInput}
              onChange={(event) => setDomainInput(event.target.value)}
              placeholder="example.com"
              className="mt-1 w-full rounded-xl border border-cyan-400/15 bg-cyber-surface px-3 py-2 text-sm text-cyber-text placeholder:text-cyber-muted focus:border-cyan-300/50 focus:outline-none"
            />
            {normalized.domain ? <p className="mt-1 text-[11px] text-cyan-200">Normalized domain: {normalized.domain}</p> : null}
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Max Variants</label>
            <select
              value={maxVariants}
              onChange={(event) => setMaxVariants(Number(event.target.value) as 10 | 20 | 50)}
              className="mt-1 w-full rounded-xl border border-cyan-400/15 bg-cyber-surface px-3 py-2 text-sm text-cyber-text focus:border-cyan-300/50 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm text-cyber-text cursor-pointer select-none">
          <input
            type="checkbox"
            checked={authorized}
            onChange={(event) => setAuthorized(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-cyan-400/30 bg-cyber-surface text-cyan-400 focus:ring-cyan-400/40"
          />
          I confirm that I own this brand/domain or have permission to monitor impersonation risks.
        </label>

        <div className="flex flex-wrap gap-2">
          <ActionBtn label={loading ? "Checking..." : "Run Check"} onClick={runCheck} disabled={!canRun} />
          <ClearBtn onClick={clearAll} />
        </div>
      </div>

      {normalized.error && domainInput.trim() ? <ToolError message={normalized.error} /> : null}
      {error ? <ToolError message={error} /> : null}
      {notice ? <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-200">{notice}</div> : null}

      {result ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-center">
              <p className="text-[10px] uppercase text-slate-500">Variants Generated</p>
              <p className="text-xl font-black text-white">{result.summary.variants_generated}</p>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-center">
              <p className="text-[10px] uppercase text-cyan-300/80">Active / Resolving</p>
              <p className="text-xl font-black text-cyan-200">{result.summary.registered_or_resolving}</p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
              <p className="text-[10px] uppercase text-amber-300/80">MX Enabled</p>
              <p className="text-xl font-black text-amber-200">{result.summary.mx_enabled}</p>
            </div>
            <div className={`rounded-xl border p-3 text-center ${breachRiskTone(result.summary.highest_risk)}`}>
              <p className="text-[10px] uppercase">Highest Risk</p>
              <p className="text-xl font-black uppercase">{result.summary.highest_risk}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-center">
              <p className="text-[10px] uppercase text-slate-500">Target</p>
              <p className="text-sm font-black text-white">{result.target.domain}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">Top Priority Actions</p>
            <ul className="space-y-1 text-sm text-slate-300">
              {result.summary.top_priorities.map((priority) => (
                <li key={priority} className="flex gap-2">
                  <span className="text-cyan-300">•</span>
                  <span>{priority}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">Variant Signals</h4>
            <div className="table-wrapper">
              <table className="tbl w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.08em] text-slate-500">
                    <th className="px-3 py-2">Lookalike Domain</th>
                    <th className="px-3 py-2">Technique</th>
                    <th className="px-3 py-2">DNS</th>
                    <th className="px-3 py-2">MX</th>
                    <th className="px-3 py-2">Risk</th>
                    <th className="px-3 py-2">Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {result.variants.map((variant: DomainSpoofingVariant) => (
                    <tr key={variant.domain} className="border-t border-slate-800/70">
                      <td className="px-3 py-2 text-xs font-mono text-cyan-200">{variant.domain}</td>
                      <td className="px-3 py-2 text-xs text-slate-400">{variant.technique}</td>
                      <td className="px-3 py-2 text-xs text-slate-300">
                        {variant.dns_resolves
                          ? `A:${variant.a_records.length} AAAA:${variant.aaaa_records.length} CNAME:${variant.cname_records.length}`
                          : "No signal"}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-300">{variant.has_mx ? "MX present" : "No MX"}</td>
                      <td className="px-3 py-2 text-xs">
                        <span className={`rounded border px-2 py-0.5 text-[10px] uppercase font-semibold ${breachRiskTone(variant.risk_level)}`}>
                          {variant.risk_level}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-400">{variant.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">Findings</h4>
            {result.findings.length ? (
              <div className="space-y-2">
                {result.findings.map((finding: DomainSpoofingFinding) => (
                  <div key={finding.id} className={`rounded-xl border p-3 ${sevColor(finding.severity)}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{finding.title}</p>
                      <span className="text-[10px] uppercase font-black">{finding.severity}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-300">{finding.evidence}</p>
                    <p className="mt-1 text-xs text-cyan-200">{finding.recommendation}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No findings were generated in this run.</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
            <p className="text-xs text-slate-400">Potential risk indicators only. This tool does not confirm phishing content.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copySummary} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:text-white">
                <Copy className="mr-1 inline h-3.5 w-3.5" />
                Copy Summary
              </button>
              <button type="button" onClick={exportTxt} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:text-white">
                Export TXT
              </button>
              <button type="button" onClick={exportJson} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:text-white">
                Export JSON
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-200">
            {result.safety_model.note}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type BreachInputMode = "single" | "paste" | "upload";

const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const MAX_BREACH_EMAILS = 100;
const MAX_UPLOAD_BYTES = 1024 * 1024;
const ALLOWED_UPLOAD_EXTENSIONS = [".txt", ".csv", ".json", ".log", ".md"];

function normalizeEmailCandidate(value: string): string {
  return value.trim().replace(/^[<("'`\[]+/, "").replace(/[>)"'`\].,;:!?]+$/, "").toLowerCase();
}

function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  if (local.length <= 1) return `*@${domain}`;
  if (local.length === 2) return `${local[0]}*@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

function extractEmailsFromText(text: string) {
  const tokens = text.split(/[\s,;|]+/).map(normalizeEmailCandidate).filter(Boolean);
  const candidates = tokens.filter((token) => token.includes("@"));
  const validCandidates = candidates.filter(isValidEmail);
  const unique = Array.from(new Set(validCandidates));
  const invalidIgnored = Math.max(0, candidates.length - validCandidates.length);
  const duplicatesRemoved = Math.max(0, validCandidates.length - unique.length);
  const tooMany = unique.length > MAX_BREACH_EMAILS;
  return {
    emails: unique.slice(0, MAX_BREACH_EMAILS),
    totalDetected: candidates.length,
    invalidIgnored,
    duplicatesRemoved,
    limited: tooMany,
  };
}

function breachRiskTone(level: string): string {
  switch (level) {
    case "critical":
      return "border-red-500/40 bg-red-500/15 text-red-200";
    case "high":
      return "border-red-400/30 bg-red-500/10 text-red-200";
    case "medium":
      return "border-amber-400/30 bg-amber-500/10 text-amber-200";
    default:
      return "border-emerald-400/25 bg-emerald-500/10 text-emerald-300";
  }
}

function breachStatusTone(status: string): string {
  switch (status) {
    case "exposed":
      return "border-red-400/30 bg-red-500/10 text-red-200";
    case "not_found":
      return "border-emerald-400/25 bg-emerald-500/10 text-emerald-300";
    case "provider_error":
      return "border-amber-400/25 bg-amber-500/10 text-amber-200";
    default:
      return "border-slate-600/30 bg-slate-700/20 text-slate-300";
  }
}

function EmailBreachCheckerTool() {
  const requireAuth = useToolAuthGate();
  const [mode, setMode] = useState<BreachInputMode>("single");
  const [singleEmail, setSingleEmail] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [authConfirmed, setAuthConfirmed] = useState(false);
  const [showFullEmails, setShowFullEmails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EmailBreachCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [extractStats, setExtractStats] = useState<{
    totalDetected: number;
    invalidIgnored: number;
    duplicatesRemoved: number;
    limited: boolean;
  }>({ totalDetected: 0, invalidIgnored: 0, duplicatesRemoved: 0, limited: false });
  const [detailsItem, setDetailsItem] = useState<EmailBreachResult | null>(null);

  const canCheck = authConfirmed && emails.length > 0 && !loading;

  const clearAll = useCallback(() => {
    setSingleEmail("");
    setPasteText("");
    setEmails([]);
    setAuthConfirmed(false);
    setShowFullEmails(false);
    setLoading(false);
    setResult(null);
    setError(null);
    setNotice(null);
    setDetailsItem(null);
    setExtractStats({ totalDetected: 0, invalidIgnored: 0, duplicatesRemoved: 0, limited: false });
  }, []);

  const setFromText = useCallback((text: string) => {
    const extracted = extractEmailsFromText(text);
    setEmails(extracted.emails);
    setExtractStats({
      totalDetected: extracted.totalDetected,
      invalidIgnored: extracted.invalidIgnored,
      duplicatesRemoved: extracted.duplicatesRemoved,
      limited: extracted.limited,
    });
    if (extracted.limited) {
      setNotice("More than 100 emails were detected. Only the first 100 will be checked.");
    } else if (extracted.emails.length === 0) {
      setNotice("No valid email addresses were found.");
    } else {
      setNotice(null);
    }
  }, []);

  const handleExtractPaste = useCallback(() => {
    setError(null);
    setResult(null);
    setFromText(pasteText);
  }, [pasteText, setFromText]);

  const handleSingleInputChange = useCallback((value: string) => {
    setSingleEmail(value);
    setError(null);
    setResult(null);
    const normalized = normalizeEmailCandidate(value);
    if (!normalized) {
      setEmails([]);
      setNotice(null);
      return;
    }
    if (!isValidEmail(normalized)) {
      setEmails([]);
      setNotice("Please enter a valid email address.");
      return;
    }
    setEmails([normalized]);
    setNotice(null);
    setExtractStats({ totalDetected: 1, invalidIgnored: 0, duplicatesRemoved: 0, limited: false });
  }, []);

  const handleFileUpload = useCallback(async (file: File | null) => {
    setError(null);
    setResult(null);
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const extension = fileName.slice(fileName.lastIndexOf("."));
    if (!ALLOWED_UPLOAD_EXTENSIONS.includes(extension)) {
      setError("Invalid file type. Allowed: .txt, .csv, .json, .log, .md");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("File is too large. Maximum size is 1 MB.");
      return;
    }

    const text = await file.text();
    setFromText(text);
  }, [setFromText]);

  const buildSummaryText = useCallback((scanResult: EmailBreachCheckResponse, includeFull: boolean) => {
    const lines = [
      "LogShield Email Breach Checker Report",
      `Date: ${new Date().toLocaleString()}`,
      `Provider: ${scanResult.provider}`,
      `Provider Configured: ${scanResult.provider_configured ? "Yes" : "No"}`,
      `Total Checked: ${scanResult.summary.total_checked}`,
      `Exposed: ${scanResult.summary.exposed_count}`,
      `Not Found: ${scanResult.summary.not_found_count}`,
      `Unknown / Provider Errors: ${scanResult.summary.unknown_count}`,
      `Highest Risk: ${scanResult.summary.highest_risk.toUpperCase()}`,
      "",
      "Top Priority Actions:",
      ...scanResult.summary.top_priorities.map((item, idx) => `${idx + 1}. ${item}`),
      "",
      "Email Results:",
      ...scanResult.results.map((item) => {
        const emailValue = includeFull && item.email_normalized ? item.email_normalized : item.email;
        const names = item.breaches.map((breach) => breach.name).filter(Boolean).slice(0, 4).join(", ") || "N/A";
        return `- ${emailValue}: status=${item.status}, exposed=${item.exposed ? "yes" : "no"}, breach_count=${item.breach_count}, risk=${item.risk_level}, breaches=${names}`;
      }),
      "",
      "Safety Model:",
      scanResult.safety_model.note,
    ];
    return lines.join("\n");
  }, []);

  const runCheck = useCallback(async () => {
    setError(null);
    setNotice(null);
    setResult(null);

    if (!authConfirmed) {
      setError("Please confirm you are authorized to check these email addresses.");
      return;
    }
    if (emails.length === 0) {
      setError("No valid email addresses were found.");
      return;
    }

    setLoading(true);
    try {
      const scanResult = await checkEmailBreaches(emails, true);
      setResult(scanResult);
    } catch (err) {
      setError(toUserErrorMessage(err, "Unable to complete action. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [authConfirmed, emails]);

  const copySummary = useCallback(() => {
    if (!result) return;
    void navigator.clipboard.writeText(buildSummaryText(result, showFullEmails));
    setNotice("Summary copied to clipboard.");
  }, [buildSummaryText, result, showFullEmails]);

  const exportJson = useCallback(() => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `logshield-email-breach-report-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [result]);

  const exportTxt = useCallback(() => {
    if (!result) return;
    const blob = new Blob([buildSummaryText(result, showFullEmails)], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `logshield-email-breach-report-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [buildSummaryText, result, showFullEmails]);

  return (
    <div className="space-y-5">
      <InfoHint title="Privacy-first breach check">
        This tool never asks for passwords. Check only emails you own or are authorized to review. Uploaded files are parsed locally to extract emails and are not stored.
      </InfoHint>

      <div className="rounded-2xl border border-cyan-400/15 bg-cyber-elevated/40 p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "single", label: "Single Email" },
            { key: "paste", label: "Paste Emails" },
            { key: "upload", label: "Upload File" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setMode(tab.key as BreachInputMode);
                setError(null);
                setNotice(null);
              }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${mode === tab.key ? "border-cyan-300/30 bg-cyan-400/10 text-cyan-200" : "border-slate-700 bg-slate-900/50 text-slate-400 hover:text-slate-200"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {mode === "single" ? (
          <input
            type="email"
            value={singleEmail}
            onChange={(event) => handleSingleInputChange(event.target.value)}
            placeholder="name@example.com"
            className="w-full rounded-xl border border-cyan-400/15 bg-cyber-surface px-3 py-2 text-sm text-cyber-text placeholder:text-cyber-muted focus:border-cyan-300/50 focus:outline-none"
          />
        ) : null}

        {mode === "paste" ? (
          <div className="space-y-2">
            <ToolInput
              value={pasteText}
              onChange={setPasteText}
              rows={6}
              placeholder="Paste emails or mixed text. We'll extract valid emails safely."
            />
            <div className="flex flex-wrap gap-2">
              <ActionBtn label="Extract Emails" onClick={handleExtractPaste} disabled={!pasteText.trim()} variant="secondary" />
            </div>
          </div>
        ) : null}

        {mode === "upload" ? (
          <label className="block rounded-xl border border-dashed border-cyan-400/20 bg-slate-900/40 p-4 text-sm text-slate-300">
            <span className="mb-2 flex items-center gap-2 font-semibold text-cyan-200">
              <Upload className="h-4 w-4" />
              Upload .txt / .csv / .json / .log / .md (max 1 MB)
            </span>
            <input
              type="file"
              accept=".txt,.csv,.json,.log,.md,text/plain,application/json,text/csv,text/markdown"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                const allowed = requireAuth(() => void handleFileUpload(file));
                if (!allowed) event.currentTarget.value = "";
              }}
              className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-400 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-slate-950 hover:file:bg-cyan-300"
            />
          </label>
        ) : null}
      </div>

      <div className="rounded-2xl border border-cyan-400/12 bg-slate-950/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">Extracted Emails</p>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={showFullEmails}
                onChange={(event) => setShowFullEmails(event.target.checked)}
                className="h-4 w-4 rounded border-cyan-400/30 bg-cyber-surface text-cyan-400 focus:ring-cyan-400/40"
              />
              Show full emails
            </label>
            <button
              type="button"
              onClick={() => {
                setEmails([]);
                setExtractStats({ totalDetected: 0, invalidIgnored: 0, duplicatesRemoved: 0, limited: false });
                setNotice(null);
              }}
              className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-400 transition hover:text-slate-200"
            >
              Clear list
            </button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-xs text-slate-300">Total detected: {extractStats.totalDetected}</div>
          <div className="rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-xs text-slate-300">Duplicates removed: {extractStats.duplicatesRemoved}</div>
          <div className="rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-xs text-slate-300">Invalid ignored: {extractStats.invalidIgnored}</div>
          <div className="rounded-lg border border-slate-800 bg-black/30 px-3 py-2 text-xs text-slate-300">Ready to check: {emails.length}</div>
        </div>

        {emails.length > 0 ? (
          <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-800 bg-black/30 px-3 py-2">
            <div className="flex flex-wrap gap-2">
              {emails.slice(0, 24).map((email) => (
                <span key={email} className="rounded border border-cyan-400/20 bg-cyan-500/5 px-2 py-1 text-[11px] font-mono text-cyan-200">
                  {showFullEmails ? email : maskEmail(email)}
                </span>
              ))}
              {emails.length > 24 ? (
                <span className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-400">+{emails.length - 24} more</span>
              ) : null}
            </div>
          </div>
        ) : (
          <ToolEmptyState text="No extracted emails yet." />
        )}
      </div>

      <label className="flex items-start gap-2 text-sm text-cyber-text cursor-pointer select-none">
        <input
          type="checkbox"
          checked={authConfirmed}
          onChange={(event) => setAuthConfirmed(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-cyan-400/30 bg-cyber-surface text-cyan-400 focus:ring-cyan-400/40"
        />
        I confirm that I own these email addresses or have permission to check them for breach exposure.
      </label>

      <div className="flex flex-wrap gap-2">
        <ActionBtn
          label={loading ? "Checking..." : "Check Email Exposure"}
          onClick={runCheck}
          disabled={!canCheck}
        />
        <ClearBtn onClick={clearAll} />
      </div>

      {notice ? (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-200">{notice}</div>
      ) : null}
      {error ? <ToolError message={error} /> : null}

      {result ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-center">
              <p className="text-[10px] uppercase text-slate-500">Total Checked</p>
              <p className="text-xl font-black text-white">{result.summary.total_checked}</p>
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center">
              <p className="text-[10px] uppercase text-red-300/80">Exposed</p>
              <p className="text-xl font-black text-red-300">{result.summary.exposed_count}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
              <p className="text-[10px] uppercase text-emerald-300/80">Not Found</p>
              <p className="text-xl font-black text-emerald-300">{result.summary.not_found_count}</p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
              <p className="text-[10px] uppercase text-amber-300/80">Unknown</p>
              <p className="text-xl font-black text-amber-300">{result.summary.unknown_count}</p>
            </div>
            <div className={`rounded-xl border p-3 text-center ${breachRiskTone(result.summary.highest_risk)}`}>
              <p className="text-[10px] uppercase">Highest Risk</p>
              <p className="text-xl font-black uppercase">{result.summary.highest_risk}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">Top Priority Actions</p>
            <ul className="space-y-1 text-sm text-slate-300">
              {result.summary.top_priorities.map((priority) => (
                <li key={priority} className="flex gap-2">
                  <span className="text-cyan-300">•</span>
                  <span>{priority}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            {result.results.map((item) => (
              <div key={item.email_normalized || item.email} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-sm text-cyan-200">{showFullEmails && item.email_normalized ? item.email_normalized : item.email}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded border px-2 py-0.5 text-[11px] uppercase font-semibold ${breachStatusTone(item.status)}`}>
                      {item.status.replace("_", " ")}
                    </span>
                    <span className={`rounded border px-2 py-0.5 text-[11px] uppercase font-semibold ${breachRiskTone(item.risk_level)}`}>
                      {item.risk_level}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-400">Breach count: {item.breach_count}</p>
                {item.breaches.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {item.breaches.slice(0, 6).map((breach, idx) => (
                      <span key={`${item.email}-${idx}`} className="rounded border border-slate-700 bg-black/30 px-2 py-1 text-[11px] text-slate-300">
                        {breach.name || breach.domain || "Unknown breach"}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="space-y-1 text-xs text-slate-300">
                  {item.recommendations.slice(0, 3).map((rec) => (
                    <p key={rec}>• {rec}</p>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setDetailsItem(item)}
                  className="rounded-lg border border-cyan-400/15 bg-cyber-elevated px-3 py-1.5 text-xs text-cyber-muted transition hover:border-cyan-300/40 hover:text-cyan-200"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
            <p className="text-xs text-slate-400">Export and share a safe summary.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copySummary} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:text-white">
                <Copy className="mr-1 inline h-3.5 w-3.5" />
                Copy Summary
              </button>
              <button type="button" onClick={exportTxt} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:text-white">
                Export TXT
              </button>
              <button type="button" onClick={exportJson} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:text-white">
                Export JSON
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detailsItem ? (
        <AppModal
          isOpen={Boolean(detailsItem)}
          onClose={() => setDetailsItem(null)}
          title="Email Breach Details"
          size="xl"
          closeOnOverlayClick
          panelClassName="soc-panel p-4 sm:p-5"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-300">Email Breach Details</p>
                <p className="mt-1 font-mono text-sm text-cyan-200">
                  {showFullEmails && detailsItem.email_normalized ? detailsItem.email_normalized : detailsItem.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailsItem(null)}
                className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-200"
              >
                <X className="mr-1 inline h-3.5 w-3.5" />
                Close
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-2 text-xs text-slate-300">Status: {detailsItem.status}</div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-2 text-xs text-slate-300">Risk: {detailsItem.risk_level}</div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-2 text-xs text-slate-300">Breaches: {detailsItem.breach_count}</div>
            </div>
            <div className="space-y-2">
              {detailsItem.breaches.length === 0 ? (
                <p className="text-xs text-slate-400">No detailed breach entries were returned by the provider.</p>
              ) : (
                detailsItem.breaches.map((breach, idx) => (
                  <div key={`detail-${idx}`} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300 space-y-1">
                    <p className="font-semibold text-white">{breach.name || breach.domain || "Unknown breach source"}</p>
                    {breach.domain ? <p>Domain: {breach.domain}</p> : null}
                    {breach.breach_date ? <p>Breach date: {breach.breach_date}</p> : null}
                    {breach.data_classes.length > 0 ? <p>Data classes: {breach.data_classes.join(", ")}</p> : null}
                    {breach.description ? <p>{breach.description}</p> : null}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setDetailsItem(null)}
                className="rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-200"
              >
                Close Details
              </button>
            </div>
          </div>
        </AppModal>
      ) : null}
    </div>
  );
}

/* ───────────── Tool Registry ───────────── */

interface ToolDef {
  id: string;
  label: string;
  icon: any;
  description: string;
  category: "Decode/Transform" | "IOC & Triage" | "Web & URL" | "Endpoint & Windows" | "Headers & Identity" | "Website Assessment";
  safety?: string;
  featured?: boolean;
  component: () => JSX.Element;
}

const tools: ToolDef[] = [
  { id: "base64", label: "Base64", icon: Binary, description: "Encode and decode Base64 strings.", category: "Decode/Transform", component: Base64Tool },
  { id: "url", label: "URL", icon: Link2, description: "Encode and decode URL strings.", category: "Web & URL", component: UrlTool },
  { id: "hash", label: "Hash", icon: Fingerprint, description: "Generate SHA-256, SHA-512, SHA-1 hashes.", category: "IOC & Triage", component: HashTool },
  { id: "jwt", label: "JWT", icon: KeyRound, description: "Decode JWT header and payload (no verification).", category: "Headers & Identity", component: JwtTool },
  { id: "ioc", label: "IOC Extractor", icon: ScanSearch, description: "Extract IPs, URLs, domains, emails, hashes from text.", category: "IOC & Triage", component: IocExtractorTool },
  { id: "defang", label: "Defang / Refang", icon: ShieldOff, description: "Defang or refang URLs, domains, and IPs.", category: "Web & URL", component: DefangTool },
  { id: "timestamp", label: "Timestamp", icon: Clock, description: "Convert Unix timestamps to dates and vice versa.", category: "Decode/Transform", component: TimestampTool },
  { id: "ua", label: "User-Agent", icon: MonitorSmartphone, description: "Inspect and parse User-Agent strings.", category: "Web & URL", component: UaInspectorTool },
  { id: "email-headers", label: "Email Headers", icon: MailSearch, description: "Inspect SPF, DKIM, DMARC, routing hops, and phishing header clues.", category: "Headers & Identity", component: EmailHeaderTool },
  { id: "http-headers", label: "HTTP Headers", icon: ShieldCheck, description: "Review browser security headers and cookie flags.", category: "Headers & Identity", component: HttpHeadersTool },
  { id: "ports", label: "Port Lookup", icon: Network, description: "Identify common services, exposure risk, and analyst notes for ports.", category: "Web & URL", component: PortLookupTool },
  { id: "windows-events", label: "Windows Events", icon: ListTree, description: "Look up high-value Windows Event IDs and investigation context.", category: "Endpoint & Windows", component: WindowsEventTool },
  { id: "log-triage", label: "Log Triage", icon: FileSearch, description: "Classify suspicious log lines and extract quick investigation leads.", category: "IOC & Triage", component: LogTriageTool },
  { id: "file-analyzer", label: "File Analyzer", icon: FileWarning, description: "Safely inspect file hashes, signatures, strings, entropy, and IOCs without execution.", category: "IOC & Triage", safety: "No file execution", component: FileAnalyzerTool },
  { id: "domain-spoofing-defense", label: "Domain Spoofing Defense", icon: Globe, description: "Generate limited lookalike domain candidates and passively check DNS signals to detect possible brand impersonation risks.", category: "Website Assessment", safety: "Passive DNS only. Defensive monitoring.", featured: true, component: DomainSpoofingDefenseTool },
  { id: "email-breach-checker", label: "Email Breach Checker", icon: MailSearch, description: "Check whether authorized email addresses appear in known breach records and receive clear account protection recommendations.", category: "Website Assessment", safety: "No password checks. Privacy-first lookup.", featured: true, component: EmailBreachCheckerTool },
  { id: "website-analyzer", label: "Website Security Analyzer", icon: Globe, description: "Scan your website safely and receive a user-friendly security report.", category: "Website Assessment", safety: "Non-invasive GET/HEAD only", featured: true, component: WebsiteAnalyzerTool },
];

const toolCategories = ["All", "Decode/Transform", "IOC & Triage", "Web & URL", "Endpoint & Windows", "Headers & Identity", "Website Assessment"] as const;

function normalizeToolQueryValue(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "website-security-analyzer") return "website-analyzer";
  if (normalized === "website-analyzer") return "website-analyzer";
  if (normalized === "email-breach-checker") return "email-breach-checker";
  if (normalized === "domain-spoofing-defense") return "domain-spoofing-defense";
  return tools.find((item) => item.id === normalized)?.id ?? null;
}

/* ───────────── Main Page ───────────── */

export function SocToolsPage() {
  const { requireAuth, loginRequiredModal, isAuthenticated } = useAuthGate();
  const [searchParams] = useSearchParams();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const initialTool = normalizeToolQueryValue(searchParams.get("tool")) ?? tools[0].id;
  const [active, setActive] = useState(initialTool);
  const [mobileToolOpen, setMobileToolOpen] = useState(false);
  const [toolFocusHighlight, setToolFocusHighlight] = useState(false);
  const activeToolRef = useRef<HTMLDivElement | null>(null);
  const mobileToolRef = useRef<HTMLDivElement | null>(null);
  const activeInputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const shouldScrollToToolRef = useRef(false);
  const focusHighlightTimerRef = useRef<number | null>(null);
  const [category, setCategory] = useState<(typeof toolCategories)[number]>("All");
  const [query, setQuery] = useState("");
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoToolId, setDemoToolId] = useState<string | null>(null);
  const tool = tools.find(t => t.id === active)!;
  const ToolComponent = tool.component;
  const filteredTools = tools.filter(item => {
    const matchesCategory = category === "All" || item.category === category;
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || [item.label, item.description, item.category].join(" ").toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  }).sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));

  useEffect(() => {
    const requestedTool = normalizeToolQueryValue(searchParams.get("tool"));
    if (!requestedTool || requestedTool === active) return;
    setActive(requestedTool);
  }, [active, searchParams]);

  const focusToolInput = useCallback((container: HTMLDivElement | null) => {
    const input = container?.querySelector("textarea, input:not([type='hidden'])") as
      | HTMLTextAreaElement
      | HTMLInputElement
      | null;
    if (!input) return;
    activeInputRef.current = input;
    activeInputRef.current.focus();
  }, []);

  const handleSelectTool = useCallback((toolId: string) => {
    shouldScrollToToolRef.current = true;
    setActive(toolId);
    if (isMobile) {
      setMobileToolOpen(true);
    }
  }, [isMobile]);

  const handleOpenDemo = useCallback((toolId: string) => {
    setDemoToolId(toolId);
    setDemoOpen(true);
  }, []);

  const activeDemo = demoToolId ? socToolDemos[demoToolId] ?? null : null;

  useEffect(() => {
    if (!shouldScrollToToolRef.current) return;
    if (!active) return;

    const timer = window.setTimeout(() => {
      if (isMobile) {
        window.setTimeout(() => {
          focusToolInput(mobileToolRef.current);
        }, 260);
      } else {
        activeToolRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        setToolFocusHighlight(true);
        if (focusHighlightTimerRef.current) {
          window.clearTimeout(focusHighlightTimerRef.current);
        }
        focusHighlightTimerRef.current = window.setTimeout(() => setToolFocusHighlight(false), 620);
        window.setTimeout(() => {
          focusToolInput(activeToolRef.current);
        }, 350);
      }

      shouldScrollToToolRef.current = false;
    }, 80);

    return () => window.clearTimeout(timer);
  }, [active, focusToolInput, isMobile, mobileToolOpen]);

  useEffect(() => () => {
    if (focusHighlightTimerRef.current) {
      window.clearTimeout(focusHighlightTimerRef.current);
    }
  }, []);

  return (
    <ToolAuthGateContext.Provider value={requireAuth}>
    <div className="space-y-6">
      <PageHeader
        eyebrow="SOC ANALYST TOOLKIT"
        title="SOC Tools"
        description="Decode, inspect, extract, and triage security artifacts safely."
      />

      <InfoHint title="Defensive-only local processing">
        Tools process input locally in your browser and are intended for defensive analysis only. Use IOC Extractor for IPs/domains/URLs/hashes, JWT Decoder for header and payload review, Defang for safe sharing, and Timestamp Converter for log correlation.
      </InfoHint>
      {!isAuthenticated ? (
        <InfoHint title="Public read-only mode">
          You can browse the SOC toolkit and read each tool description. Running analyzers, decoders, extractors, and file triage requires a LogShield account.
        </InfoHint>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Tools" value={tools.length} />
        <StatCard label="Active Category" value={tool.category} />
        <StatCard label="Current Tool" value={tool.label} />
      </div>

      <div className="soc-panel p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search tools by name, category, or purpose..."
              className="soc-input w-full pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {toolCategories.map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`row-action ${category === item ? "primary" : ""}`.trim()}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredTools.map(t => {
          const Icon = t.icon;
          const tone = t.category === "IOC & Triage" ? "warning" : t.category === "Endpoint & Windows" ? "neutral" : t.category === "Headers & Identity" ? "violet" : "info";
          return (
            <div
              key={t.id}
              className={`rounded-xl border p-4 text-left transition ${
                active === t.id
                  ? "border-cyan-200/30 bg-cyan-300/10"
                  : "border-slate-700 bg-slate-800/60 hover:border-cyan-200/20 hover:text-white"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <Icon className="h-5 w-5 text-cyan-300" />
                <div className="flex items-center gap-1.5">
                  {t.featured ? <Chip tone="safe">Featured</Chip> : null}
                  <Chip tone={tone}>{t.category}</Chip>
                </div>
              </div>
              <p className="text-sm font-bold text-cyber-text">{t.label}</p>
              <p className="mt-1 text-xs text-cyber-muted">{t.description}</p>
              {t.safety ? <p className="mt-2 text-[11px] text-emerald-300">{t.safety}</p> : null}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => handleOpenDemo(t.id)}
                  className="rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-200"
                >
                  How it works
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTool(t.id)}
                  className="row-action primary justify-center"
                >
                  Open Tool
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active tool */}
      <div ref={activeToolRef} className={`active-tool-panel rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 ${toolFocusHighlight ? "tool-focus-highlight" : ""} ${isMobile ? "hidden" : "block"}`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
          {(() => { const Icon = tool.icon; return <Icon className="h-5 w-5 text-cyan-300" />; })()}
          <div>
            <h2 className="text-lg font-bold text-white">{tool.label}</h2>
            <p className="text-sm text-slate-400">{tool.description}</p>
          </div>
          </div>
          <Chip tone={tool.category === "IOC & Triage" ? "warning" : tool.category === "Headers & Identity" ? "violet" : "info"}>{tool.category}</Chip>
        </div>
        <ToolComponent />
      </div>
      {isMobile ? (
        <AppModal
          isOpen={mobileToolOpen}
          onClose={() => setMobileToolOpen(false)}
          size="xl"
          closeOnOverlayClick
          panelClassName="soc-panel p-4"
        >
          <div ref={mobileToolRef} className="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">{tool.label}</h2>
              <p className="text-xs text-[var(--text-muted)]">{tool.description}</p>
            </div>
            <Chip tone={tool.category === "IOC & Triage" ? "warning" : tool.category === "Headers & Identity" ? "violet" : "info"}>
              {tool.category}
            </Chip>
          </div>
          <ToolComponent />
        </AppModal>
      ) : null}

      <ToolDemoModal
        isOpen={demoOpen}
        demo={activeDemo}
        onClose={() => setDemoOpen(false)}
        onOpenTool={() => {
          if (demoToolId) {
            setDemoOpen(false);
            handleSelectTool(demoToolId);
          }
        }}
      />

      {/* Safety note */}
      <div className="flex items-start gap-3 rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-xs text-slate-400">
        <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
        <span>All processing happens locally in your browser. No data is sent to the server or any external service. Input is not stored or logged.</span>
      </div>
    </div>
    {loginRequiredModal}
    </ToolAuthGateContext.Provider>
  );
}
