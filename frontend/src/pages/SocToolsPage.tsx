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
} from "lucide-react";

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
    <button onClick={copy} className="ml-2 shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-200">
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
      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-300/60 focus:outline-none"
    />
  );
}

/** Renders tool output as plain text only. Accepts string, not ReactNode, to prevent XSS. */
function ToolOutput({ text }: { text: string }) {
  return (
    <pre className="min-h-[3rem] rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-sm text-emerald-300 whitespace-pre-wrap break-all">{text}</pre>
  );
}

/** Renders a single IOC item as plain text only. */
function SafeText({ text }: { text: string }) {
  return <pre className="font-mono text-sm text-emerald-300 whitespace-pre-wrap break-all">{text}</pre>;
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
  return <p className="py-4 text-center text-sm text-slate-500">{text}</p>;
}

function SizeWarning({ input }: { input: string }) {
  if (inputSizeOk(input)) return null;
  return <ToolError message="Input is too large. Please keep tool input under 50KB." />;
}

function ClearBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition hover:border-red-400/40 hover:text-red-300">
      <X className="inline h-3 w-3 mr-1" />Clear
    </button>
  );
}

function ActionBtn({ label, onClick, disabled, variant = "primary" }: { label: string; onClick: () => void; disabled?: boolean; variant?: "primary" | "secondary" }) {
  const cls = variant === "primary"
    ? "rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
    : "rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:text-cyan-200 disabled:opacity-50 disabled:cursor-not-allowed";
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
      {output && <div className="space-y-1"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-400">Output</span><CopyBtn text={output} /></div><ToolOutput text={output} /></div>}
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
      {output && <div className="space-y-1"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-400">Output</span><CopyBtn text={output} /></div><ToolOutput text={output} /></div>}
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
        <select value={algo} onChange={e => setAlgo(e.target.value as Algo)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
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
                <span className="text-xs font-semibold text-slate-400">{r.algo}</span>
                <CopyBtn text={r.hash} />
              </div>
              <ToolOutput text={r.hash} />
            </div>
          ))}
          <p className="text-xs text-slate-500">SHA-1 is weak for security but useful for legacy IOC matching. MD5 is not included — consider it a future enhancement for IOC matching.</p>
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
          <div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-400">Header</span><CopyBtn text={header} /></div>
          <ToolOutput text={header} />
        </div>
      )}
      {payload && (
        <div className="space-y-1">
          <div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-400">Payload</span><CopyBtn text={payload} /></div>
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
            <span className="text-sm font-semibold text-slate-300">Found {allIocs.length} IOC{allIocs.length !== 1 ? "s" : ""}</span>
            <CopyBtn text={allJson} />
          </div>
          {groups.map(g => (
            <div key={g.label} className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-cyan-300">{g.label} <span className="text-slate-500">({g.items.length})</span></span>
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
      {output && <div className="space-y-1"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-400">Output</span><CopyBtn text={output} /></div><ToolOutput text={output} /></div>}
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
        <select value={mode} onChange={e => setMode(e.target.value as "unix2date" | "date2unix")} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
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
      {result && <div className="space-y-1"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-400">Result</span><CopyBtn text={result} /></div><ToolOutput text={result} /></div>}
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
            <div key={c.label} className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
              <p className="text-xs font-semibold text-slate-400">{c.label}</p>
              <p className="mt-1 text-sm font-semibold text-cyan-200">{c.value}</p>
            </div>
          ))}
        </div>
      )}
      {result && (
        <div className="space-y-1">
          <div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-400">Raw User-Agent</span><CopyBtn text={result.raw} /></div>
          <ToolOutput text={result.raw} />
          <p className="text-xs text-slate-500">Best-effort parsing. Results may not be exact for unusual or spoofed User-Agents.</p>
        </div>
      )}
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
];

/* ───────────── Main Page ───────────── */

export function SocToolsPage() {
  const [active, setActive] = useState(tools[0].id);
  const tool = tools.find(t => t.id === active)!;
  const ToolComponent = tool.component;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <p className="text-sm uppercase tracking-[.3em] text-cyan-300">SOC Tools</p>
        <h1 className="mt-3 text-3xl font-bold text-white">LogShield Cyber Toolkit</h1>
        <p className="mt-2 text-slate-400">Decode, transform, and inspect security artifacts safely during investigations.</p>
      </section>

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
