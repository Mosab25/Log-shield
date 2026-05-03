import { useState, useCallback } from "react";

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
} from "lucide-react";
import { InfoHint } from "../components/Guidance";
import { PageHeader } from "../components/UI";
import { deriveAttackSignalFromText } from "../securitySignals";

const MAX_INPUT_BYTES = 50 * 1024;

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
    <button onClick={copy} className="ml-2 shrink-0 rounded-lg border border-cyan-400/15 bg-cyber-elevated px-2 py-1 text-xs text-cyber-muted transition hover:border-cyber-cyan/40 hover:text-cyber-cyan">
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
  const cls = variant === "primary"
    ? "rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
    : "rounded-xl border border-cyan-400/15 bg-cyber-elevated px-4 py-2 text-sm font-semibold text-cyber-text transition hover:border-cyber-cyan/40 hover:text-cyber-cyan disabled:opacity-50 disabled:cursor-not-allowed";
  return <button onClick={onClick} disabled={disabled} className={cls}>{label}</button>;
}

/* ───────────── 1. Base64 Tool ───────────── */

function Base64Tool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  function encode() {
    setError(null);
    if (!inputSizeOk(input)) return;
    try {
      setOutput(btoa(unescape(encodeURIComponent(input))));
    } catch { setError("Encoding failed."); }
  }
  function decode() {
    setError(null);
    if (!inputSizeOk(input)) return;
    try {
      setOutput(decodeURIComponent(escape(atob(input.trim()))));
    } catch { setError("Invalid Base64 input. Check encoding and try again."); }
  }

  return (
    <div className="space-y-4">
      <ToolInput value={input} onChange={setInput} placeholder="Paste text or Base64 string..." />
      <SizeWarning input={input} />
      <div className="flex flex-wrap gap-2">
        <ActionBtn label="Encode" onClick={encode} disabled={!input.trim()} />
        <ActionBtn label="Decode" onClick={decode} disabled={!input.trim()} variant="secondary" />
        <ClearBtn onClick={() => { setInput(""); setOutput(""); setError(null); }} />
      </div>
      {error && <ToolError message={error} />}
      {output && <div className="space-y-1"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-cyber-muted">Output</span><CopyBtn text={output} /></div><ToolOutput text={output} /></div>}
    </div>
  );
}

/* ───────────── 2. URL Tool ───────────── */

function UrlTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  function encode() {
    setError(null);
    if (!inputSizeOk(input)) return;
    try { setOutput(encodeURIComponent(input)); } catch { setError("URL encoding failed."); }
  }
  function decode() {
    setError(null);
    if (!inputSizeOk(input)) return;
    try { setOutput(decodeURIComponent(input.trim())); } catch { setError("Invalid URL-encoded input."); }
  }

  return (
    <div className="space-y-4">
      <ToolInput value={input} onChange={setInput} placeholder="Paste URL or encoded string..." />
      <SizeWarning input={input} />
      <div className="flex flex-wrap gap-2">
        <ActionBtn label="Encode" onClick={encode} disabled={!input.trim()} />
        <ActionBtn label="Decode" onClick={decode} disabled={!input.trim()} variant="secondary" />
        <ClearBtn onClick={() => { setInput(""); setOutput(""); setError(null); }} />
      </div>
      {error && <ToolError message={error} />}
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

  function decode() {
    setError(null); setHeader(null); setPayload(null);
    if (!inputSizeOk(input)) return;
    const parts = input.trim().split(".");
    if (parts.length < 2) { setError("Invalid JWT format. Expected at least 2 dot-separated parts."); return; }
    try {
      const h = JSON.parse(decodeURIComponent(escape(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")))));
      setHeader(JSON.stringify(h, null, 2));
    } catch { setError("Failed to decode JWT header."); return; }
    try {
      const p = JSON.parse(decodeURIComponent(escape(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")))));
      setPayload(JSON.stringify(p, null, 2));
    } catch { setError("Failed to decode JWT payload."); return; }
  }

  return (
    <div className="space-y-4">
      <ToolInput value={input} onChange={setInput} placeholder="Paste JWT token..." rows={3} />
      <SizeWarning input={input} />
      <div className="flex flex-wrap gap-2">
        <ActionBtn label="Decode" onClick={decode} disabled={!input.trim()} />
        <ClearBtn onClick={() => { setInput(""); setHeader(null); setPayload(null); setError(null); }} />
      </div>
      {error && <ToolError message={error} />}
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

function IocExtractorTool() {
  const [input, setInput] = useState("");
  const [groups, setGroups] = useState<IocGroup[]>([]);
  const [error, setError] = useState<string | null>(null);

  function extract() {
    setError(null);
    if (!inputSizeOk(input)) return;
    const result = extractIocs(input);
    if (result.length === 0) { setGroups([]); return; }
    setGroups(result);
  }

  const allIocs = groups.flatMap(g => g.items);
  const allJson = JSON.stringify(Object.fromEntries(groups.map(g => [g.label, g.items])), null, 2);

  return (
    <div className="space-y-4">
      <ToolInput value={input} onChange={setInput} placeholder={'Paste log lines, email headers, or suspicious text...\n\nXSS test: <script>alert(1)</script> <img src=x onerror=alert(1)> javascript:alert(1)'} rows={6} />
      <SizeWarning input={input} />
      <div className="flex flex-wrap gap-2">
        <ActionBtn label="Extract IOCs" onClick={extract} disabled={!input.trim()} />
        <ClearBtn onClick={() => { setInput(""); setGroups([]); setError(null); }} />
      </div>
      {error && <ToolError message={error} />}
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

  function analyze() {
    setError(null); setResult(null);
    if (!inputSizeOk(input)) return;
    if (!input.trim()) return;
    setResult(parseUa(input.trim()));
  }

  return (
    <div className="space-y-4">
      <ToolInput value={input} onChange={setInput} placeholder="Paste User-Agent string..." rows={3} />
      <SizeWarning input={input} />
      <div className="flex flex-wrap gap-2">
        <ActionBtn label="Analyze" onClick={analyze} disabled={!input.trim()} />
        <ClearBtn onClick={() => { setInput(""); setResult(null); setError(null); }} />
      </div>
      {error && <ToolError message={error} />}
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

  function analyze() {
    if (!inputSizeOk(input)) return;
    const headers = parseHeaders(input);
    const received = headers.received || [];
    const auth = getHeader(headers, "authentication-results").toLowerCase();
    const suspicious: string[] = [];
    if (!auth.includes("spf=pass")) suspicious.push("SPF did not clearly pass.");
    if (!auth.includes("dkim=pass")) suspicious.push("DKIM did not clearly pass.");
    if (!auth.includes("dmarc=pass")) suspicious.push("DMARC did not clearly pass.");
    if (!getHeader(headers, "return-path")) suspicious.push("Return-Path is missing.");
    if (received.length > 5) suspicious.push("Long Received chain. Review hops for forwarding or relay abuse.");

    setOutput(JSON.stringify({
      summary: {
        from: getHeader(headers, "from") || "not found",
        reply_to: getHeader(headers, "reply-to") || "not found",
        return_path: getHeader(headers, "return-path") || "not found",
        subject: getHeader(headers, "subject") || "not found",
        date: getHeader(headers, "date") || "not found",
        message_id: getHeader(headers, "message-id") || "not found",
        received_hops: received.length,
      },
      authentication: {
        spf: auth.includes("spf=pass") ? "pass" : auth.includes("spf=") ? "review" : "not found",
        dkim: auth.includes("dkim=pass") ? "pass" : auth.includes("dkim=") ? "review" : "not found",
        dmarc: auth.includes("dmarc=pass") ? "pass" : auth.includes("dmarc=") ? "review" : "not found",
      },
      suspicious_signals: suspicious.length ? suspicious : ["No obvious header anomaly found. Continue with URL/attachment checks."],
      next_steps: [
        "Compare From, Reply-To, and Return-Path domains.",
        "Extract URLs and domains with IOC Extractor.",
        "Check sending IPs in logs or threat intelligence.",
        "Preserve the full header as incident evidence if suspicious.",
      ],
    }, null, 2));
  }

  return (
    <div className="space-y-4">
      <ToolInput value={input} onChange={setInput} rows={7} placeholder="Paste raw email headers..." />
      <SizeWarning input={input} />
      <div className="flex flex-wrap gap-2">
        <ActionBtn label="Analyze Headers" onClick={analyze} disabled={!input.trim()} />
        <ClearBtn onClick={() => { setInput(""); setOutput(""); }} />
      </div>
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

  function analyze() {
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
  }

  return (
    <div className="space-y-4">
      <ToolInput value={input} onChange={setInput} rows={7} placeholder={'Paste HTTP response headers...\nContent-Security-Policy: default-src ...\nSet-Cookie: session=...; Secure; HttpOnly'} />
      <SizeWarning input={input} />
      <div className="flex flex-wrap gap-2">
        <ActionBtn label="Inspect Headers" onClick={analyze} disabled={!input.trim()} />
        <ClearBtn onClick={() => { setInput(""); setOutput(""); }} />
      </div>
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
  }

  return (
    <div className="space-y-4">
      <ToolInput value={input} onChange={setInput} rows={3} placeholder="Enter ports: 22, 80, 443, 445, 3389" />
      <div className="flex flex-wrap gap-2">
        <ActionBtn label="Lookup Ports" onClick={lookup} disabled={!input.trim()} />
        <ClearBtn onClick={() => { setInput(""); setOutput(""); }} />
      </div>
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
  }

  return (
    <div className="space-y-4">
      <ToolInput value={input} onChange={setInput} rows={4} placeholder="Paste Event IDs or a Windows log line, e.g. 4625 4672 1102" />
      <div className="flex flex-wrap gap-2">
        <ActionBtn label="Lookup Event IDs" onClick={lookup} disabled={!input.trim()} />
        <ClearBtn onClick={() => { setInput(""); setOutput(""); }} />
      </div>
      {output && <div className="space-y-1"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-400">Windows Event Context</span><CopyBtn text={output} /></div><ToolOutput text={output} /></div>}
    </div>
  );
}

function LogTriageTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

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
  }

  return (
    <div className="space-y-4">
      <ToolInput value={input} onChange={setInput} rows={6} placeholder="Paste one suspicious log line or alert message for quick triage..." />
      <SizeWarning input={input} />
      <div className="flex flex-wrap gap-2">
        <ActionBtn label="Triage Log" onClick={triage} disabled={!input.trim()} />
        <ClearBtn onClick={() => { setInput(""); setOutput(""); }} />
      </div>
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
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function analyzeFile(file: File | null) {
    setError(null);
    setOutput("");
    setMessage(null);
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
          onChange={event => void analyzeFile(event.target.files?.[0] ?? null)}
          className="mt-4 block w-full text-sm text-slate-400 file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-400 file:px-4 file:py-2 file:text-sm file:font-bold file:text-slate-950 hover:file:bg-cyan-300"
          disabled={loading}
        />
      </label>
      {loading ? <p className="text-sm font-semibold text-cyan-200">Analyzing file bytes locally...</p> : null}
      {message ? <p className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</p> : null}
      {error ? <ToolError message={error} /> : null}
      {output && <div className="space-y-1"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-400">File Triage Report</span><CopyBtn text={output} /></div><ToolOutput text={output} /></div>}
    </div>
  );
}

/* ───────────── Tool Registry ───────────── */

interface ToolDef {
  id: string;
  label: string;
  icon: any;
  description: string;
  component: () => JSX.Element;
}

const tools: ToolDef[] = [
  { id: "base64", label: "Base64", icon: Binary, description: "Encode and decode Base64 strings.", component: Base64Tool },
  { id: "url", label: "URL", icon: Link2, description: "Encode and decode URL strings.", component: UrlTool },
  { id: "hash", label: "Hash", icon: Fingerprint, description: "Generate SHA-256, SHA-512, SHA-1 hashes.", component: HashTool },
  { id: "jwt", label: "JWT", icon: KeyRound, description: "Decode JWT header and payload (no verification).", component: JwtTool },
  { id: "ioc", label: "IOC Extractor", icon: ScanSearch, description: "Extract IPs, URLs, domains, emails, hashes from text.", component: IocExtractorTool },
  { id: "defang", label: "Defang / Refang", icon: ShieldOff, description: "Defang or refang URLs, domains, and IPs.", component: DefangTool },
  { id: "timestamp", label: "Timestamp", icon: Clock, description: "Convert Unix timestamps to dates and vice versa.", component: TimestampTool },
  { id: "ua", label: "User-Agent", icon: MonitorSmartphone, description: "Inspect and parse User-Agent strings.", component: UaInspectorTool },
  { id: "email-headers", label: "Email Headers", icon: MailSearch, description: "Inspect SPF, DKIM, DMARC, routing hops, and phishing header clues.", component: EmailHeaderTool },
  { id: "http-headers", label: "HTTP Headers", icon: ShieldCheck, description: "Review browser security headers and cookie flags.", component: HttpHeadersTool },
  { id: "ports", label: "Port Lookup", icon: Network, description: "Identify common services, exposure risk, and analyst notes for ports.", component: PortLookupTool },
  { id: "windows-events", label: "Windows Events", icon: ListTree, description: "Look up high-value Windows Event IDs and investigation context.", component: WindowsEventTool },
  { id: "log-triage", label: "Log Triage", icon: FileSearch, description: "Classify suspicious log lines and extract quick investigation leads.", component: LogTriageTool },
  { id: "file-analyzer", label: "File Analyzer", icon: FileWarning, description: "Safely inspect file hashes, signatures, strings, entropy, and IOCs without execution.", component: FileAnalyzerTool },
];

/* ───────────── Main Page ───────────── */

export function SocToolsPage() {
  const [active, setActive] = useState(tools[0].id);
  const tool = tools.find(t => t.id === active)!;
  const ToolComponent = tool.component;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SOC Tools"
        title="LogShield Cyber Toolkit"
        description="Decode, transform, and inspect security artifacts safely during investigations."
        icon={Wrench}
      />

      <InfoHint title="Defensive-only local processing">
        Tools process input locally in your browser and are intended for defensive analysis only. Use IOC Extractor for IPs/domains/URLs/hashes, JWT Decoder for header and payload review, Defang for safe sharing, and Timestamp Converter for log correlation.
      </InfoHint>

      {/* Tool selector */}
      <div className="flex flex-wrap gap-2">
        {tools.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                active === t.id
                  ? "border border-cyan-200/30 bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/30"
                  : "border border-slate-700 bg-slate-800 text-slate-300 hover:border-cyan-200/20 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Active tool */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          {(() => { const Icon = tool.icon; return <Icon className="h-5 w-5 text-cyan-300" />; })()}
          <div>
            <h2 className="text-lg font-bold text-white">{tool.label}</h2>
            <p className="text-sm text-slate-400">{tool.description}</p>
          </div>
        </div>
        <ToolComponent />
      </div>

      {/* Safety note */}
      <div className="flex items-start gap-3 rounded-2xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-xs text-slate-400">
        <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
        <span>All processing happens locally in your browser. No data is sent to the server or any external service. Input is not stored or logged.</span>
      </div>
    </div>
  );
}
