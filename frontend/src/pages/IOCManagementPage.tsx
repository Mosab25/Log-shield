import { useEffect, useMemo, useState } from "react";
import { Ban, Copy, ExternalLink, Fingerprint, RefreshCw, Search, ShieldAlert, X } from "lucide-react";
import { Link } from "react-router-dom";

import { apiClient } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Chip } from "../components/ui/Chip";
import { RowActions, type RowActionItem } from "../components/ui/RowActions";
import { BulkBar } from "../components/ui/BulkBar";
import { FilterRow } from "../components/ui/FilterRow";
import { PageHeader } from "../components/ui/PageHeader";
import { InfoHint, RecommendedActions, VerdictBadge } from "../components/Guidance";
import { AppModal } from "../components/ui/AppModal";
import { EmptyState, ErrorState, SkeletonRows } from "../components/UI";

type IOCType = "IP Address" | "Domain" | "URL" | "Hash" | "Email";
type IOCStatus = "New" | "Under Review" | "Confirmed Malicious" | "Benign" | "Blocked" | "Archived";
type IOCReputation = "safe" | "suspicious" | "malicious" | "unknown";

interface NormalizedLogItem {
  id: number;
  message?: string;
  event_type?: string;
  severity?: string;
  timestamp?: string;
  event_time?: string;
  created_at?: string;
  ip_address?: string | null;
  src_ip?: string | null;
}

interface AlertItem {
  id: number;
  title: string;
  description?: string | null;
  severity: string;
  risk_score?: number;
  source_ip?: string | null;
  created_at?: string;
}

interface IncidentItem {
  id: number;
  title: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface URLScanHistoryItem {
  id: number;
  url: string;
  status: string;
  provider: string;
  score: number;
  scanned_at: string;
}

interface IOCRecord {
  key: string;
  value: string;
  type: IOCType;
  reputation: IOCReputation;
  source: Set<string>;
  firstSeen: string;
  lastSeen: string;
  relatedAlerts: Set<number>;
  relatedIncidents: Set<number>;
  status: IOCStatus;
}

interface IPBlockItem {
  id: number;
  ip_address: string;
  is_active: boolean;
}

interface FileAnalyzerFinding {
  id: string;
  source: "file_analyzer";
  file_name: string;
  analyzed_at: string;
  verdict: "attack_detected" | "suspicious" | "informational";
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

const RE_IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|1?\d{1,2})\b/g;
const RE_URL = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
const RE_EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const RE_DOMAIN = /\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(?:[a-zA-Z]{2,})\b/g;
const RE_MD5 = /\b[a-fA-F0-9]{32}\b/g;
const RE_SHA1 = /\b[a-fA-F0-9]{40}\b/g;
const RE_SHA256 = /\b[a-fA-F0-9]{64}\b/g;
const DOMAIN_TEST = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
const FILE_ANALYSIS_STORAGE_KEY = "logshield.fileAnalyzer.findings";

function loadFileAnalyzerFindings(): FileAnalyzerFinding[] {
  try {
    const raw = localStorage.getItem(FILE_ANALYSIS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getTimestamp(value?: string | null): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function normalizeTime(value?: string | null): string {
  const time = getTimestamp(value);
  return time ? new Date(time).toISOString() : new Date().toISOString();
}

function strongerReputation(next: IOCReputation, current: IOCReputation): IOCReputation {
  const weight: Record<IOCReputation, number> = {
    malicious: 4,
    suspicious: 3,
    unknown: 2,
    safe: 1,
  };
  return weight[next] > weight[current] ? next : current;
}

function statusFromReputation(reputation: IOCReputation, blocked: boolean): IOCStatus {
  if (blocked) return "Blocked";
  if (reputation === "malicious") return "Confirmed Malicious";
  if (reputation === "suspicious") return "Under Review";
  if (reputation === "safe") return "Benign";
  return "New";
}

function defangValue(value: string, type: IOCType): string {
  if (type === "URL") {
    try {
      const parsed = new URL(value);
      const protocol = parsed.protocol.toLowerCase() === "https:" ? "hxxps:" : "hxxp:";
      const host = parsed.host.replace(/\./g, "[.]");
      return `${protocol}//${host}${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return value.replace(/^https/gi, "hxxps").replace(/^http/gi, "hxxp").replace(/\./g, "[.]");
    }
  }
  if (type === "Domain" || type === "IP Address") return value.replace(/\./g, "[.]");
  return value;
}

async function writeClipboardText(value: string): Promise<void> {
  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textArea);
  if (copied) return;

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  throw new Error("Clipboard unavailable");
}

function statusClass(status: IOCStatus): string {
  if (status === "Blocked") return "border-red-300/35 bg-red-500/10 text-red-200";
  if (status === "Confirmed Malicious") return "border-red-300/35 bg-red-500/10 text-red-200";
  if (status === "Under Review") return "border-amber-300/35 bg-amber-500/10 text-amber-200";
  if (status === "Benign") return "border-emerald-300/35 bg-emerald-500/10 text-emerald-200";
  if (status === "Archived") return "border-slate-500/35 bg-slate-600/20 text-slate-300";
  return "border-cyan-300/25 bg-cyan-500/10 text-cyan-200";
}

function typeClass(type: IOCType): string {
  if (type === "IP Address") return "border-cyan-300/30 bg-cyan-500/10 text-cyan-200";
  if (type === "URL") return "border-amber-300/30 bg-amber-500/10 text-amber-200";
  if (type === "Domain") return "border-cyan-300/30 bg-cyan-500/10 text-cyan-200";
  if (type === "Hash") return "border-emerald-300/30 bg-emerald-500/10 text-emerald-200";
  return "border-slate-500/30 bg-slate-600/20 text-slate-300";
}

function sourceLabel(source: string): string {
  return source
    .replace(/_/g, " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function isLikelyDomain(value: string): boolean {
  return DOMAIN_TEST.test(value) && !value.includes("@");
}

function addRecord(
  map: Map<string, IOCRecord>,
  value: string,
  type: IOCType,
  source: string,
  seenAt: string,
  reputation: IOCReputation,
  alertId?: number,
  incidentId?: number,
) {
  const key = `${type}:${value.toLowerCase()}`;
  const existing = map.get(key);
  if (!existing) {
    map.set(key, {
      key,
      value,
      type,
      reputation,
      source: new Set([source]),
      firstSeen: seenAt,
      lastSeen: seenAt,
      relatedAlerts: new Set(alertId ? [alertId] : []),
      relatedIncidents: new Set(incidentId ? [incidentId] : []),
      status: "New",
    });
    return;
  }
  existing.source.add(source);
  existing.reputation = strongerReputation(reputation, existing.reputation);
  if (getTimestamp(seenAt) < getTimestamp(existing.firstSeen)) existing.firstSeen = seenAt;
  if (getTimestamp(seenAt) > getTimestamp(existing.lastSeen)) existing.lastSeen = seenAt;
  if (alertId) existing.relatedAlerts.add(alertId);
  if (incidentId) existing.relatedIncidents.add(incidentId);
}

function buildIOCRecords(
  logs: NormalizedLogItem[],
  alerts: AlertItem[],
  incidents: IncidentItem[],
  scans: URLScanHistoryItem[],
  blockedIps: Set<string>,
  fileFindings: FileAnalyzerFinding[],
): IOCRecord[] {
  const map = new Map<string, IOCRecord>();
  const urlStatus = new Map<string, IOCReputation>();

  scans.forEach(scan => {
    const status = String(scan.status).toLowerCase();
    const rep: IOCReputation = status === "malicious" ? "malicious" : status === "suspicious" ? "suspicious" : status === "safe" ? "safe" : "unknown";
    urlStatus.set(scan.url.toLowerCase(), rep);
    addRecord(map, scan.url, "URL", "url_scanner", normalizeTime(scan.scanned_at), rep);
  });

  logs.forEach(log => {
    const text = [log.message, log.event_type, log.ip_address, log.src_ip].filter(Boolean).join(" ");
    const seenAt = normalizeTime(log.timestamp || log.event_time || log.created_at);
    const baseRep: IOCReputation =
      ["high", "critical"].includes((log.severity || "").toLowerCase()) ? "suspicious" : "unknown";

    (text.match(RE_IPV4) || []).forEach(match => addRecord(map, match, "IP Address", "logs", seenAt, baseRep));
    (text.match(RE_URL) || []).forEach(match => addRecord(map, match, "URL", "logs", seenAt, urlStatus.get(match.toLowerCase()) || baseRep));
    (text.match(RE_EMAIL) || []).forEach(match => addRecord(map, match, "Email", "logs", seenAt, baseRep));
    (text.match(RE_MD5) || []).forEach(match => addRecord(map, match, "Hash", "logs", seenAt, baseRep));
    (text.match(RE_SHA1) || []).forEach(match => addRecord(map, match, "Hash", "logs", seenAt, baseRep));
    (text.match(RE_SHA256) || []).forEach(match => addRecord(map, match, "Hash", "logs", seenAt, baseRep));
    (text.match(RE_DOMAIN) || [])
      .filter(match => isLikelyDomain(match))
      .forEach(match => addRecord(map, match, "Domain", "logs", seenAt, baseRep));
  });

  alerts.forEach(alert => {
    const text = [alert.title, alert.description, alert.source_ip].filter(Boolean).join(" ");
    const seenAt = normalizeTime(alert.created_at);
    const severity = (alert.severity || "").toLowerCase();
    const rep: IOCReputation = severity === "critical" || severity === "high" ? "suspicious" : "unknown";
    (text.match(RE_IPV4) || []).forEach(match => addRecord(map, match, "IP Address", "alerts", seenAt, rep, alert.id));
    (text.match(RE_URL) || []).forEach(match => addRecord(map, match, "URL", "alerts", seenAt, urlStatus.get(match.toLowerCase()) || rep, alert.id));
    (text.match(RE_EMAIL) || []).forEach(match => addRecord(map, match, "Email", "alerts", seenAt, rep, alert.id));
    (text.match(RE_MD5) || []).forEach(match => addRecord(map, match, "Hash", "alerts", seenAt, rep, alert.id));
    (text.match(RE_SHA1) || []).forEach(match => addRecord(map, match, "Hash", "alerts", seenAt, rep, alert.id));
    (text.match(RE_SHA256) || []).forEach(match => addRecord(map, match, "Hash", "alerts", seenAt, rep, alert.id));
    (text.match(RE_DOMAIN) || [])
      .filter(match => isLikelyDomain(match))
      .forEach(match => addRecord(map, match, "Domain", "alerts", seenAt, rep, alert.id));
  });

  incidents.forEach(incident => {
    const text = [incident.title, incident.description].filter(Boolean).join(" ");
    const seenAt = normalizeTime(incident.updated_at || incident.created_at);
    const rep: IOCReputation = "unknown";
    (text.match(RE_IPV4) || []).forEach(match => addRecord(map, match, "IP Address", "incidents", seenAt, rep, undefined, incident.id));
    (text.match(RE_URL) || []).forEach(match => addRecord(map, match, "URL", "incidents", seenAt, urlStatus.get(match.toLowerCase()) || rep, undefined, incident.id));
    (text.match(RE_EMAIL) || []).forEach(match => addRecord(map, match, "Email", "incidents", seenAt, rep, undefined, incident.id));
    (text.match(RE_MD5) || []).forEach(match => addRecord(map, match, "Hash", "incidents", seenAt, rep, undefined, incident.id));
    (text.match(RE_SHA1) || []).forEach(match => addRecord(map, match, "Hash", "incidents", seenAt, rep, undefined, incident.id));
    (text.match(RE_SHA256) || []).forEach(match => addRecord(map, match, "Hash", "incidents", seenAt, rep, undefined, incident.id));
    (text.match(RE_DOMAIN) || [])
      .filter(match => isLikelyDomain(match))
      .forEach(match => addRecord(map, match, "Domain", "incidents", seenAt, rep, undefined, incident.id));
  });

  fileFindings.forEach(finding => {
    const seenAt = normalizeTime(finding.analyzed_at);
    const rep: IOCReputation =
      finding.verdict === "attack_detected"
        ? "malicious"
        : finding.verdict === "suspicious"
          ? "suspicious"
          : "unknown";
    const iocs = finding.iocs || {};

    (iocs["IPv4 Addresses"] || []).forEach(value => addRecord(map, value, "IP Address", "file_analyzer", seenAt, rep));
    (iocs["URLs"] || []).forEach(value => addRecord(map, value, "URL", "file_analyzer", seenAt, rep));
    (iocs["Domains"] || []).forEach(value => addRecord(map, value, "Domain", "file_analyzer", seenAt, rep));
    (iocs["Email Addresses"] || []).forEach(value => addRecord(map, value, "Email", "file_analyzer", seenAt, rep));
    (iocs["MD5 Hashes"] || []).forEach(value => addRecord(map, value, "Hash", "file_analyzer", seenAt, rep));
    (iocs["SHA-1 Hashes"] || []).forEach(value => addRecord(map, value, "Hash", "file_analyzer", seenAt, rep));
    (iocs["SHA-256 Hashes"] || []).forEach(value => addRecord(map, value, "Hash", "file_analyzer", seenAt, rep));

    if (finding.ip_address) addRecord(map, finding.ip_address, "IP Address", "file_analyzer", seenAt, rep);
    if (finding.hashes?.sha1) addRecord(map, finding.hashes.sha1, "Hash", "file_analyzer", seenAt, rep);
    if (finding.hashes?.sha256) addRecord(map, finding.hashes.sha256, "Hash", "file_analyzer", seenAt, rep);
    if (finding.hashes?.sha512) addRecord(map, finding.hashes.sha512, "Hash", "file_analyzer", seenAt, rep);
  });

  return Array.from(map.values())
    .map(record => {
      const blocked = record.type === "IP Address" && blockedIps.has(record.value);
      return {
        ...record,
        status: statusFromReputation(record.reputation, blocked),
      };
    })
    .sort((a, b) => getTimestamp(b.lastSeen) - getTimestamp(a.lastSeen));
}

export function IOCManagementPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [items, setItems] = useState<IOCRecord[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [reputationFilter, setReputationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const [logsResponse, alertsResponse, incidentsResponse, scansResponse, blocksResponse] = await Promise.all([
        apiClient.get<{ items: NormalizedLogItem[] }>("/logs/normalized?skip=0&limit=100"),
        apiClient.get<{ items: AlertItem[] }>("/alerts?skip=0&limit=100"),
        apiClient.get<{ items: IncidentItem[] }>("/incidents?skip=0&limit=100"),
        apiClient.get<{ scans: URLScanHistoryItem[] }>("/url-scanner/history").catch(() => ({ scans: [] })),
        isAdmin ? apiClient.get<{ items: IPBlockItem[] }>("/blocks?skip=0&limit=100&active_only=true").catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
      ]);
      const logs = Array.isArray(logsResponse.items) ? logsResponse.items : [];
      const alerts = Array.isArray(alertsResponse.items) ? alertsResponse.items : [];
      const incidents = Array.isArray(incidentsResponse.items) ? incidentsResponse.items : [];
      const scans = Array.isArray(scansResponse.scans) ? scansResponse.scans : [];
      const blockedIps = new Set(
        (Array.isArray(blocksResponse.items) ? blocksResponse.items : [])
          .filter(item => item.is_active)
          .map(item => item.ip_address),
      );
      setItems(buildIOCRecords(logs, alerts, incidents, scans, blockedIps, loadFileAnalyzerFindings()));
    } catch (err: any) {
      setItems([]);
      setError(err?.message || "Failed to load IOC records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [isAdmin]);

  async function blockIp(record: IOCRecord) {
    if (!isAdmin || record.type !== "IP Address") return;
    try {
      await apiClient.post("/blocks", {
        ip_address: record.value,
        reason: "IOC management block request",
        blocked_until: null,
      });
      setMessage(`IP ${record.value} was blocked.`);
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to block IP.");
    }
  }

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter(item => {
      if (needle) {
        const haystack = `${item.value} ${item.type} ${item.status} ${item.reputation}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (typeFilter && item.type !== typeFilter) return false;
      if (reputationFilter && item.reputation !== reputationFilter) return false;
      if (statusFilter && item.status !== statusFilter) return false;
      return true;
    });
  }, [items, search, typeFilter, reputationFilter, statusFilter]);

  const selected = filtered.find(item => item.key === selectedKey) ?? items.find(item => item.key === selectedKey) ?? null;

  const summary = useMemo(() => {
    const total = items.length;
    const bad = items.filter(item => item.reputation === "malicious" || item.reputation === "suspicious").length;
    const newToday = items.filter(item => Date.now() - getTimestamp(item.firstSeen) <= 24 * 60 * 60 * 1000).length;
    const relatedIncidents = new Set(items.flatMap(item => Array.from(item.relatedIncidents))).size;
    const blockedIps = items.filter(item => item.status === "Blocked").length;
    return { total, bad, newToday, relatedIncidents, blockedIps };
  }, [items]);

  async function copyText(value: string, label: string) {
    if (!value) {
      setError("Nothing available to copy.");
      return;
    }

    try {
      await writeClipboardText(value);
      setMessage(`${label} copied.`);
      setError(null);
    } catch {
      setError("Copy failed. Please try again.");
    }
  }

  async function defangAndCopy(record: IOCRecord) {
    const defanged = defangValue(record.value, record.type);
    const label = record.type === "Hash" ? "Hash does not require defanging; hash" : "Defanged IOC";
    await copyText(defanged, label);
  }

  async function blockSelectedIps() {
    if (!isAdmin || selectedKeys.length === 0) return;
    const selectedIps = filtered.filter(item => selectedKeys.includes(item.key) && item.type === "IP Address" && item.status !== "Blocked");
    if (!selectedIps.length) return;
    for (const ipItem of selectedIps) {
      await blockIp(ipItem);
    }
  }

  function exportSelectedIocs() {
    if (!selectedKeys.length) return;
    const selectedItems = filtered.filter(item => selectedKeys.includes(item.key)).map(item => ({
      value: item.value,
      type: item.type,
      reputation: item.reputation,
      status: item.status,
      sources: Array.from(item.source),
      firstSeen: item.firstSeen,
      lastSeen: item.lastSeen,
      relatedAlerts: Array.from(item.relatedAlerts),
      relatedIncidents: Array.from(item.relatedIncidents),
    }));
    const blob = new Blob([JSON.stringify(selectedItems, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `logshield-iocs-selected-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function toneFromReputation(rep: IOCReputation) {
    if (rep === "malicious") return "critical" as const;
    if (rep === "suspicious") return "warning" as const;
    if (rep === "safe") return "safe" as const;
    if (rep === "unknown") return "neutral" as const;
    return "info" as const;
  }

  function statusTone(statusValue: IOCStatus) {
    if (statusValue === "Confirmed Malicious" || statusValue === "Blocked") return "critical" as const;
    if (statusValue === "Under Review") return "warning" as const;
    if (statusValue === "Benign") return "safe" as const;
    return "neutral" as const;
  }

  function rowTint(item: IOCRecord) {
    if (item.reputation === "malicious") return { backgroundColor: "rgba(255,59,59,0.03)" };
    if (item.reputation === "suspicious") return { backgroundColor: "rgba(245,158,11,0.03)" };
    return undefined;
  }

  function buildIocActions(item: IOCRecord): RowActionItem[] {
    const analyzeAction: RowActionItem = {
      key: "analyze",
      label: "Analyze IOC",
      variant: "primary",
      onClick: () => setSelectedKey(item.key),
      disabled: !item.value,
    };
    const copyAction: RowActionItem = {
      key: "copy",
      label: "Copy",
      onClick: () => void copyText(item.value, "IOC"),
      disabled: !item.value,
    };
    const defangAction: RowActionItem = {
      key: "defang",
      label: "Defang",
      onClick: () => void defangAndCopy(item),
      disabled: !item.value,
    };
    const canBlock = isAdmin && item.type === "IP Address" && item.status !== "Blocked";
    const blockAction: RowActionItem = {
      key: "block",
      label: "Block IP",
      variant: "danger",
      onClick: () => void blockIp(item),
      disabled: !canBlock,
      title: canBlock ? undefined : "Block IP is available for unblocked IP indicators only.",
    };

    if (item.reputation === "malicious") {
      return canBlock ? [blockAction, analyzeAction, copyAction] : [analyzeAction, copyAction, defangAction];
    }
    if (item.reputation === "suspicious") {
      return canBlock ? [analyzeAction, blockAction, copyAction] : [analyzeAction, copyAction, defangAction];
    }
    if (item.reputation === "unknown") {
      return [analyzeAction, copyAction, defangAction];
    }
    return [copyAction, defangAction];
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Investigation"
        title="IOC Management"
        description="Track IPs, domains, URLs, hashes, and emails observed during investigations."
      />

      <InfoHint title="What is this page?">
        IOC management centralizes indicators from logs, alerts, incidents, and URL scans so analysts can track reputation, scope, and response actions in one place.
      </InfoHint>

      <RecommendedActions
        title="Recommended next steps"
        actions={[
          "Prioritize malicious and suspicious indicators first.",
          "Use URL Scanner and Threat Intel to enrich unknown indicators.",
          "Link important indicators to incident evidence and reports.",
          "Block confirmed malicious IPs only after analyst validation.",
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="soc-panel p-4"><p className="text-xs font-bold uppercase text-slate-500">Total IOCs</p><p className="mt-2 text-3xl font-black text-white">{summary.total}</p></div>
        <div className="soc-panel p-4"><p className="text-xs font-bold uppercase text-slate-500">Malicious/Suspicious</p><p className="mt-2 text-3xl font-black text-red-200">{summary.bad}</p></div>
        <div className="soc-panel p-4"><p className="text-xs font-bold uppercase text-slate-500">New Today</p><p className="mt-2 text-3xl font-black text-cyan-200">{summary.newToday}</p></div>
        <div className="soc-panel p-4"><p className="text-xs font-bold uppercase text-slate-500">Related Incidents</p><p className="mt-2 text-3xl font-black text-amber-200">{summary.relatedIncidents}</p></div>
        <div className="soc-panel p-4"><p className="text-xs font-bold uppercase text-slate-500">Blocked IPs</p><p className="mt-2 text-3xl font-black text-red-200">{summary.blockedIps}</p></div>
      </div>

      <FilterRow>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search IOC value..." className="soc-input w-full pl-10" />
          </div>
          <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)} className="soc-input">
            <option value="">All types</option>
            <option value="IP Address">IP Address</option>
            <option value="Domain">Domain</option>
            <option value="URL">URL</option>
            <option value="Hash">Hash</option>
            <option value="Email">Email</option>
          </select>
          <select value={reputationFilter} onChange={event => setReputationFilter(event.target.value)} className="soc-input">
            <option value="">All reputation</option>
            <option value="safe">Safe</option>
            <option value="suspicious">Suspicious</option>
            <option value="malicious">Malicious</option>
            <option value="unknown">Unknown</option>
          </select>
          <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="soc-input">
            <option value="">All status</option>
            <option value="New">New</option>
            <option value="Under Review">Under Review</option>
            <option value="Confirmed Malicious">Confirmed Malicious</option>
            <option value="Benign">Benign</option>
            <option value="Blocked">Blocked</option>
            <option value="Archived">Archived</option>
          </select>
          <button type="button" onClick={() => void load()} className="soc-button-ghost">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </FilterRow>

      {message ? (
        <div className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">{message}</div>
      ) : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {loading ? <SkeletonRows rows={6} /> : null}

      {!loading ? (
        <div className="soc-panel overflow-hidden">
          <BulkBar
            active={selectedKeys.length > 0}
            selectedCount={selectedKeys.length}
            actions={
              <>
                <button type="button" className="row-action danger" onClick={() => void blockSelectedIps()} disabled={!isAdmin}>Block Selected</button>
                <button type="button" className="row-action" onClick={exportSelectedIocs}>Export</button>
                <button type="button" className="row-action danger" disabled title="Delete bulk action unavailable">Delete</button>
                <button type="button" className="row-action" onClick={() => setSelectedKeys([])}>Clear</button>
              </>
            }
          />
          {filtered.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No IOCs found" description="No indicators match the current filters." icon={ShieldAlert} />
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="soc-table tbl">
                <thead>
                  <tr>
                    <th />
                    <th>IOC Value</th>
                    <th>Type</th>
                    <th>Reputation</th>
                    <th>Source</th>
                    <th>Last Seen</th>
                    <th>Status</th>
                    <th className="col-hide-mobile">Scope</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => (
                    <tr key={item.key} className="cursor-pointer" onClick={() => setSelectedKey(item.key)} style={rowTint(item)}>
                      <td onClick={event => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedKeys.includes(item.key)}
                          onChange={event => setSelectedKeys(prev => (event.target.checked ? [...prev, item.key] : prev.filter(x => x !== item.key)))}
                        />
                      </td>
                      <td>
                        <p className="max-w-[28rem] truncate font-mono text-sm text-white" title={item.value}>{item.value}</p>
                        <p className="mt-1 text-xs text-slate-500">First seen {new Date(item.firstSeen).toLocaleString()}</p>
                      </td>
                      <td>
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${typeClass(item.type)}`}>{item.type}</span>
                      </td>
                      <td><Chip tone={toneFromReputation(item.reputation)}>{item.reputation}</Chip></td>
                      <td>
                        <div className="flex max-w-[18rem] flex-wrap gap-1">
                          {Array.from(item.source).map(source => (
                            <span key={source} className="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                              {sourceLabel(source)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="text-sm text-slate-300">{new Date(item.lastSeen).toLocaleString()}</td>
                      <td>
                        <Chip tone={statusTone(item.status)}>{item.status}</Chip>
                      </td>
                      <td className="col-hide-mobile text-sm text-slate-300">
                        {item.relatedAlerts.size} alert(s) / {item.relatedIncidents.size} incident(s)
                      </td>
                      <td onClick={event => event.stopPropagation()}>
                        <RowActions items={buildIocActions(item)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {selected ? (
        <AppModal isOpen={Boolean(selected)} onClose={() => setSelectedKey(null)} size="xl" panelClassName="soc-panel-strong p-6">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${typeClass(selected.type)}`}>{selected.type}</span>
                  <VerdictBadge verdict={selected.reputation} />
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(selected.status)}`}>{selected.status}</span>
                </div>
                <h2 className="break-all font-mono text-xl font-black text-white">{selected.value}</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Observed across {selected.source.size} source(s), {selected.relatedAlerts.size} alert(s), and {selected.relatedIncidents.size} incident(s).
                </p>
              </div>
              <button type="button" onClick={() => setSelectedKey(null)} className="soc-button-ghost h-10 w-10 px-0">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">First Seen</p>
                <p className="mt-2 text-sm font-semibold text-slate-200">{new Date(selected.firstSeen).toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Last Seen</p>
                <p className="mt-2 text-sm font-semibold text-slate-200">{new Date(selected.lastSeen).toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Sources</p>
                <p className="mt-2 text-sm font-semibold text-slate-200">{Array.from(selected.source).map(sourceLabel).join(", ")}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <h3 className="text-sm font-bold text-white">Recommended Actions</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  <li>Validate reputation before taking response action.</li>
                  <li>Correlate source, user, and timestamp with related alerts.</li>
                  <li>Add the IOC to an incident if it supports the investigation.</li>
                  {selected.type === "IP Address" ? <li>Block only after confirming the source is malicious.</li> : null}
                  {selected.type === "URL" ? <li>Scan the URL before opening or sharing it.</li> : null}
                </ul>
              </section>
              <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <h3 className="text-sm font-bold text-white">Quick Actions</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void copyText(selected.value, "IOC")} className="soc-button-ghost">
                    <Copy className="h-4 w-4" />
                    Copy
                  </button>
                  <button type="button" onClick={() => void defangAndCopy(selected)} className="soc-button-ghost">
                    Defang
                  </button>
                  {selected.type === "URL" ? (
                    <Link to="/url-scanner" className="soc-button-ghost">
                      <ExternalLink className="h-4 w-4" />
                      URL Scanner
                    </Link>
                  ) : null}
                  {isAdmin && selected.type === "IP Address" && selected.status !== "Blocked" ? (
                    <button type="button" onClick={() => void blockIp(selected)} className="soc-button-ghost text-red-200">
                      <Ban className="h-4 w-4" />
                      Block IP
                    </button>
                  ) : null}
                </div>
              </section>
            </div>
          </div>
        </AppModal>
      ) : null}
    </div>
  );
}
