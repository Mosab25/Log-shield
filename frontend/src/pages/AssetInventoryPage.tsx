import { useEffect, useMemo, useState } from "react";
import { Search, ShieldAlert, X } from "lucide-react";

import { apiClient } from "../api/client";
import { InfoHint, RecommendedActions } from "../components/Guidance";
import { AppModal } from "../components/ui/AppModal";
import { BulkBar } from "../components/ui/BulkBar";
import { Chip } from "../components/ui/Chip";
import { EmptyState } from "../components/ui/EmptyState";
import { FilterRow } from "../components/ui/FilterRow";
import { PageHeader } from "../components/ui/PageHeader";
import { RowActions } from "../components/ui/RowActions";
import { StatCard } from "../components/ui/StatCard";
import { ErrorState, SkeletonRows } from "../components/UI";

type AssetType =
  | "Server"
  | "Workstation"
  | "User Account"
  | "Network Device"
  | "Web Application"
  | "Cloud Asset"
  | "Unknown";

type AssetStatus = "Active" | "At Risk" | "Critical" | "Inactive" | "Unknown";

interface NormalizedLogItem {
  id: number;
  timestamp?: string;
  event_time?: string;
  created_at?: string;
  source?: string;
  event_type?: string;
  message?: string;
  severity?: string;
  risk_score?: number;
  ip_address?: string | null;
  src_ip?: string | null;
  username?: string | null;
  hostname?: string | null;
}

interface AlertItem {
  id: number;
  title: string;
  description?: string | null;
  severity: string;
  status: string;
  risk_score?: number;
  source_ip?: string | null;
  username?: string | null;
  created_at?: string;
}

interface IncidentListItem {
  id: number;
  title: string;
  description?: string | null;
  status: string;
  severity: string;
  owner?: {
    id: number;
    full_name: string;
    email: string;
  } | null;
  created_at?: string;
  updated_at?: string;
}

interface DerivedAsset {
  key: string;
  assetName: string;
  assetType: AssetType;
  ipAddress: string | null;
  owner: string | null;
  riskScore: number;
  openAlerts: number;
  relatedIncidents: number;
  vulnerabilities: number;
  lastSeen: string | null;
  status: AssetStatus;
  sources: Set<string>;
  recentEvents: string[];
  relatedAlertIds: Set<number>;
  relatedIncidentIds: Set<number>;
}

type AssetActionPanel = {
  mode: "scan" | "vulns";
  assets: DerivedAsset[];
};

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

function nowMinus(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function normalizeDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function inferAssetTypeFromHost(host: string): AssetType {
  const value = host.toLowerCase();
  if (value.includes("web") || value.includes("api") || value.includes("portal")) return "Web Application";
  if (value.includes("fw") || value.includes("router") || value.includes("switch")) return "Network Device";
  if (value.includes("cloud") || value.includes("aws") || value.includes("gcp") || value.includes("azure")) return "Cloud Asset";
  if (value.includes("desktop") || value.includes("ws-") || value.includes("laptop")) return "Workstation";
  return "Server";
}

function riskLevelFromScore(score: number): "low" | "medium" | "high" | "critical" {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function statusBadgeClass(status: AssetStatus): string {
  if (status === "Critical") return "border-red-300/30 bg-red-500/10 text-red-200";
  if (status === "At Risk") return "border-amber-300/30 bg-amber-500/10 text-amber-200";
  if (status === "Active") return "border-emerald-300/30 bg-emerald-500/10 text-emerald-200";
  if (status === "Inactive") return "border-slate-500/30 bg-slate-600/20 text-slate-200";
  return "border-slate-600/30 bg-slate-700/25 text-slate-300";
}

function riskTextClass(score: number): string {
  const level = riskLevelFromScore(score);
  if (level === "critical") return "text-red-200";
  if (level === "high") return "text-red-200";
  if (level === "medium") return "text-amber-200";
  return "text-emerald-200";
}

function computeAssetStatus(asset: DerivedAsset): AssetStatus {
  const lastSeenTs = getTimestamp(asset.lastSeen);
  if (!lastSeenTs) return "Unknown";
  if (lastSeenTs < nowMinus(14)) return "Inactive";
  if (asset.riskScore >= 80 || asset.openAlerts >= 3) return "Critical";
  if (asset.riskScore >= 45 || asset.openAlerts > 0 || asset.relatedIncidents > 0) return "At Risk";
  return "Active";
}

function pushRecentEvent(asset: DerivedAsset, message: string | undefined, when: string | null) {
  if (!message) return;
  const time = when ? new Date(when).toLocaleString() : "Unknown time";
  asset.recentEvents.unshift(`${time} - ${message}`);
  if (asset.recentEvents.length > 6) asset.recentEvents = asset.recentEvents.slice(0, 6);
}

function buildAssets(
  logs: NormalizedLogItem[],
  alerts: AlertItem[],
  incidents: IncidentListItem[],
  fileFindings: FileAnalyzerFinding[],
): DerivedAsset[] {
  const map = new Map<string, DerivedAsset>();

  function upsert(key: string, seed: Omit<DerivedAsset, "status"> & { status?: AssetStatus }): DerivedAsset {
    const existing = map.get(key);
    if (existing) return existing;
    const next: DerivedAsset = {
      ...seed,
      status: seed.status || "Unknown",
    };
    map.set(key, next);
    return next;
  }

  function fromLogIdentity(log: NormalizedLogItem) {
    const eventTime = normalizeDate(log.timestamp || log.event_time || log.created_at);
    const risk = typeof log.risk_score === "number" ? log.risk_score : 0;
    const ip = log.ip_address ?? log.src_ip ?? null;
    const host = log.hostname ?? null;
    const username = log.username ?? null;

    if (ip) {
      const key = `ip:${ip}`;
      const asset = upsert(key, {
        key,
        assetName: host || ip,
        assetType: host ? inferAssetTypeFromHost(host) : "Server",
        ipAddress: ip,
        owner: username,
        riskScore: risk,
        openAlerts: 0,
        relatedIncidents: 0,
        vulnerabilities: 0,
        lastSeen: eventTime,
        sources: new Set(["logs"]),
        recentEvents: [],
        relatedAlertIds: new Set(),
        relatedIncidentIds: new Set(),
      });
      asset.sources.add("logs");
      asset.riskScore = Math.max(asset.riskScore, risk);
      if (eventTime && getTimestamp(eventTime) > getTimestamp(asset.lastSeen)) asset.lastSeen = eventTime;
      if (username && !asset.owner) asset.owner = username;
      pushRecentEvent(asset, log.message, eventTime);
    }

    if (host) {
      const key = `host:${host.toLowerCase()}`;
      const asset = upsert(key, {
        key,
        assetName: host,
        assetType: inferAssetTypeFromHost(host),
        ipAddress: ip,
        owner: username,
        riskScore: risk,
        openAlerts: 0,
        relatedIncidents: 0,
        vulnerabilities: 0,
        lastSeen: eventTime,
        sources: new Set(["logs"]),
        recentEvents: [],
        relatedAlertIds: new Set(),
        relatedIncidentIds: new Set(),
      });
      asset.sources.add("logs");
      asset.riskScore = Math.max(asset.riskScore, risk);
      if (eventTime && getTimestamp(eventTime) > getTimestamp(asset.lastSeen)) asset.lastSeen = eventTime;
      pushRecentEvent(asset, log.message, eventTime);
    }

    if (username) {
      const key = `user:${username.toLowerCase()}`;
      const asset = upsert(key, {
        key,
        assetName: username,
        assetType: "User Account",
        ipAddress: ip,
        owner: username,
        riskScore: risk,
        openAlerts: 0,
        relatedIncidents: 0,
        vulnerabilities: 0,
        lastSeen: eventTime,
        sources: new Set(["logs"]),
        recentEvents: [],
        relatedAlertIds: new Set(),
        relatedIncidentIds: new Set(),
      });
      asset.sources.add("logs");
      asset.riskScore = Math.max(asset.riskScore, risk);
      if (eventTime && getTimestamp(eventTime) > getTimestamp(asset.lastSeen)) asset.lastSeen = eventTime;
      pushRecentEvent(asset, log.message, eventTime);
    }
  }

  logs.forEach(fromLogIdentity);

  alerts.forEach(alert => {
    const alertTime = normalizeDate(alert.created_at);
    const risk = typeof alert.risk_score === "number" ? alert.risk_score : alert.severity === "critical" ? 90 : alert.severity === "high" ? 75 : alert.severity === "medium" ? 55 : 30;
    const openLike = ["open", "investigating", "escalated"].includes((alert.status || "").toLowerCase());
    const sourceIp = alert.source_ip ?? null;
    const username = alert.username ?? null;

    if (sourceIp) {
      const key = `ip:${sourceIp}`;
      const asset = upsert(key, {
        key,
        assetName: sourceIp,
        assetType: "Server",
        ipAddress: sourceIp,
        owner: username,
        riskScore: risk,
        openAlerts: openLike ? 1 : 0,
        relatedIncidents: 0,
        vulnerabilities: 0,
        lastSeen: alertTime,
        sources: new Set(["alerts"]),
        recentEvents: [],
        relatedAlertIds: new Set(),
        relatedIncidentIds: new Set(),
      });
      asset.sources.add("alerts");
      asset.riskScore = Math.max(asset.riskScore, risk);
      if (openLike) asset.openAlerts += 1;
      if (alertTime && getTimestamp(alertTime) > getTimestamp(asset.lastSeen)) asset.lastSeen = alertTime;
      asset.relatedAlertIds.add(alert.id);
      pushRecentEvent(asset, alert.title, alertTime);
    }

    if (username) {
      const key = `user:${username.toLowerCase()}`;
      const asset = upsert(key, {
        key,
        assetName: username,
        assetType: "User Account",
        ipAddress: sourceIp,
        owner: username,
        riskScore: risk,
        openAlerts: openLike ? 1 : 0,
        relatedIncidents: 0,
        vulnerabilities: 0,
        lastSeen: alertTime,
        sources: new Set(["alerts"]),
        recentEvents: [],
        relatedAlertIds: new Set(),
        relatedIncidentIds: new Set(),
      });
      asset.sources.add("alerts");
      asset.riskScore = Math.max(asset.riskScore, risk);
      if (openLike) asset.openAlerts += 1;
      if (alertTime && getTimestamp(alertTime) > getTimestamp(asset.lastSeen)) asset.lastSeen = alertTime;
      asset.relatedAlertIds.add(alert.id);
      pushRecentEvent(asset, alert.title, alertTime);
    }

  });

  incidents.forEach(incident => {
    const text = `${incident.title} ${incident.description || ""}`;
    const incidentId = incident.id;
    const incidentTime = normalizeDate(incident.updated_at || incident.created_at);

    map.forEach(asset => {
      const namesToMatch = [asset.assetName, asset.ipAddress, asset.owner].filter(Boolean) as string[];
      if (!namesToMatch.length) return;
      const matched = namesToMatch.some(value => text.toLowerCase().includes(String(value).toLowerCase()));
      const ownerMatched = incident.owner?.email && asset.assetType === "User Account" && incident.owner.email.toLowerCase().includes(asset.assetName.toLowerCase());
      if (!matched && !ownerMatched) return;
      if (!asset.relatedIncidentIds.has(incidentId)) {
        asset.relatedIncidentIds.add(incidentId);
        asset.relatedIncidents += 1;
      }
      asset.sources.add("incidents");
      if (incidentTime && getTimestamp(incidentTime) > getTimestamp(asset.lastSeen)) asset.lastSeen = incidentTime;
      pushRecentEvent(asset, `Incident #${incident.id}: ${incident.title}`, incidentTime);
    });
  });

  fileFindings.forEach(finding => {
    const eventTime = normalizeDate(finding.analyzed_at);
    const risk = typeof finding.risk_score === "number" ? finding.risk_score : 0;
    const ip = finding.ip_address || finding.iocs?.["IPv4 Addresses"]?.[0] || null;
    const username = finding.username || null;
    const eventMessage = `File Analyzer: ${finding.attack_name} (${finding.classification}) from ${finding.file_name}`;

    if (ip) {
      const key = `ip:${ip}`;
      const asset = upsert(key, {
        key,
        assetName: ip,
        assetType: "Server",
        ipAddress: ip,
        owner: username,
        riskScore: risk,
        openAlerts: finding.verdict === "attack_detected" ? 1 : 0,
        relatedIncidents: 0,
        vulnerabilities: 0,
        lastSeen: eventTime,
        sources: new Set(["file_analyzer"]),
        recentEvents: [],
        relatedAlertIds: new Set(),
        relatedIncidentIds: new Set(),
      });
      asset.sources.add("file_analyzer");
      asset.riskScore = Math.max(asset.riskScore, risk);
      if (finding.verdict === "attack_detected") asset.openAlerts = Math.max(asset.openAlerts, 1);
      if (username && !asset.owner) asset.owner = username;
      if (eventTime && getTimestamp(eventTime) > getTimestamp(asset.lastSeen)) asset.lastSeen = eventTime;
      pushRecentEvent(asset, eventMessage, eventTime);
    }

    if (username) {
      const key = `user:${username.toLowerCase()}`;
      const asset = upsert(key, {
        key,
        assetName: username,
        assetType: "User Account",
        ipAddress: ip,
        owner: username,
        riskScore: risk,
        openAlerts: finding.verdict === "attack_detected" ? 1 : 0,
        relatedIncidents: 0,
        vulnerabilities: 0,
        lastSeen: eventTime,
        sources: new Set(["file_analyzer"]),
        recentEvents: [],
        relatedAlertIds: new Set(),
        relatedIncidentIds: new Set(),
      });
      asset.sources.add("file_analyzer");
      asset.riskScore = Math.max(asset.riskScore, risk);
      if (finding.verdict === "attack_detected") asset.openAlerts = Math.max(asset.openAlerts, 1);
      if (ip && !asset.ipAddress) asset.ipAddress = ip;
      if (eventTime && getTimestamp(eventTime) > getTimestamp(asset.lastSeen)) asset.lastSeen = eventTime;
      pushRecentEvent(asset, eventMessage, eventTime);
    }
  });

  const items = Array.from(map.values()).map(asset => {
    const next = { ...asset };
    next.status = computeAssetStatus(next);
    return next;
  });

  return items.sort((a, b) => b.riskScore - a.riskScore || getTimestamp(b.lastSeen) - getTimestamp(a.lastSeen));
}

export function AssetInventoryPage() {
  const [assets, setAssets] = useState<DerivedAsset[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [incidents, setIncidents] = useState<IncidentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [assetType, setAssetType] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [status, setStatus] = useState("");
  const [hasOpenAlerts, setHasOpenAlerts] = useState(false);
  const [ipFilter, setIpFilter] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [assetActionPanel, setAssetActionPanel] = useState<AssetActionPanel | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [logsResponse, alertsResponse, incidentsResponse] = await Promise.all([
        apiClient.get<{ items: NormalizedLogItem[] }>("/logs/normalized?skip=0&limit=100"),
        apiClient.get<{ items: AlertItem[] }>("/alerts?skip=0&limit=100"),
        apiClient.get<{ items: IncidentListItem[] }>("/incidents?skip=0&limit=100"),
      ]);
      const logs = Array.isArray(logsResponse.items) ? logsResponse.items : [];
      const alertItems = Array.isArray(alertsResponse.items) ? alertsResponse.items : [];
      const incidentItems = Array.isArray(incidentsResponse.items) ? incidentsResponse.items : [];
      setAlerts(alertItems);
      setIncidents(incidentItems);
      setAssets(buildAssets(logs, alertItems, incidentItems, loadFileAnalyzerFindings()));
    } catch (err: any) {
      setError(err?.message || "Failed to load asset inventory.");
      setAssets([]);
      setAlerts([]);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return assets.filter(asset => {
      if (needle) {
        const haystack = [
          asset.assetName,
          asset.assetType,
          asset.ipAddress,
          asset.owner,
          asset.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (assetType && asset.assetType !== assetType) return false;
      if (riskLevel && riskLevelFromScore(asset.riskScore) !== riskLevel) return false;
      if (status && asset.status !== status) return false;
      if (hasOpenAlerts && asset.openAlerts === 0) return false;
      if (ipFilter.trim() && !(asset.ipAddress || "").includes(ipFilter.trim())) return false;
      return true;
    });
  }, [assets, search, assetType, riskLevel, status, hasOpenAlerts, ipFilter]);

  const selected = filtered.find(asset => asset.key === selectedKey) ?? assets.find(asset => asset.key === selectedKey) ?? null;
  const selectedAssets = assets.filter(asset => selectedKeys.includes(asset.key));

  const summary = useMemo(() => {
    const total = assets.length;
    const atRisk = assets.filter(asset => asset.status === "At Risk" || asset.status === "Critical").length;
    const critical = assets.filter(asset => asset.status === "Critical").length;
    const recentlySeen = assets.filter(asset => getTimestamp(asset.lastSeen) >= nowMinus(1)).length;
    const withOpenAlerts = assets.filter(asset => asset.openAlerts > 0).length;
    return { total, atRisk, critical, recentlySeen, withOpenAlerts };
  }, [assets]);

  function openScanPreview(asset: DerivedAsset) {
    setActionMessage(null);
    setAssetActionPanel({ mode: "scan", assets: [asset] });
  }

  function openSelectedScanPreview() {
    if (selectedAssets.length === 0) return;
    setActionMessage(null);
    setAssetActionPanel({ mode: "scan", assets: selectedAssets });
  }

  function openVulnerabilityPanel(asset: DerivedAsset) {
    setActionMessage(null);
    setAssetActionPanel({ mode: "vulns", assets: [asset] });
  }

  function exportSelectedAssets() {
    if (selectedAssets.length === 0) return;
    const payload = selectedAssets.map(asset => ({
      asset: asset.assetName,
      type: asset.assetType,
      ip_address: asset.ipAddress,
      owner: asset.owner,
      risk_score: asset.riskScore,
      open_alerts: asset.openAlerts,
      related_incidents: asset.relatedIncidents,
      status: asset.status,
      last_seen: asset.lastSeen,
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `logshield-assets-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setActionMessage(`Exported ${selectedAssets.length} selected asset${selectedAssets.length === 1 ? "" : "s"}.`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ASSET VISIBILITY"
        title="Asset Inventory"
        description="Track monitored assets, exposure, risk levels, and related security activity."
      />

      <InfoHint title="What is this page?">
        Asset inventory builds investigation context by correlating where suspicious events happened, who was affected, and which assets need remediation or containment first.
      </InfoHint>

      <RecommendedActions
        title="Recommended next steps"
        actions={[
          "Review critical assets first and validate containment status.",
          "Check assets with open alerts and link them to active incidents.",
          "Use related alerts and incidents to understand investigation priority.",
          "Add asset context to incident evidence before closing a case.",
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Assets" value={summary.total} />
        <StatCard label="Assets At Risk" value={<span className="text-[var(--status-warning)]">{summary.atRisk}</span>} />
        <StatCard label="Critical Assets" value={<span className="text-[var(--status-critical)]">{summary.critical}</span>} />
        <StatCard label="Recently Seen" value={<span className="text-[var(--brand)]">{summary.recentlySeen}</span>} />
        <StatCard label="With Open Alerts" value={<span className="text-[var(--status-warning)]">{summary.withOpenAlerts}</span>} />
      </div>

      <FilterRow>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search asset, owner, type..." className="soc-input w-full pl-10" />
          </div>
          <select value={assetType} onChange={event => setAssetType(event.target.value)} className="soc-input">
            <option value="">All asset types</option>
            {["Server", "Workstation", "User Account", "Network Device", "Web Application", "Cloud Asset", "Unknown"].map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select value={riskLevel} onChange={event => setRiskLevel(event.target.value)} className="soc-input">
            <option value="">All risk levels</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <select value={status} onChange={event => setStatus(event.target.value)} className="soc-input">
            <option value="">All status values</option>
            <option value="Active">Active</option>
            <option value="At Risk">At Risk</option>
            <option value="Critical">Critical</option>
            <option value="Inactive">Inactive</option>
            <option value="Unknown">Unknown</option>
          </select>
          <input value={ipFilter} onChange={event => setIpFilter(event.target.value)} placeholder="IP filter" className="soc-input" />
        </div>
        <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={hasOpenAlerts} onChange={event => setHasOpenAlerts(event.target.checked)} className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-400" />
          Has open alerts only
        </label>
      </FilterRow>

      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {loading ? <SkeletonRows rows={6} /> : null}

      {!loading ? (
        <div className="soc-panel overflow-hidden">
          <BulkBar
            active={selectedKeys.length > 0}
            selectedCount={selectedKeys.length}
            actions={
              <>
                <button type="button" className="row-action primary" onClick={openSelectedScanPreview}>Scan Selected</button>
                <button type="button" className="row-action" onClick={exportSelectedAssets}>Export</button>
                <button type="button" className="row-action" onClick={() => setSelectedKeys([])}>Clear</button>
              </>
            }
          />
          {filtered.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No assets found" description="No assets match the current filters." icon={<ShieldAlert className="h-5 w-5" />} />
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="soc-table tbl">
                <thead>
                  <tr>
                    <th />
                    <th>Asset Name</th>
                    <th>Type</th>
                    <th>IP Address</th>
                    <th className="col-hide-mobile">OS</th>
                    <th>Risk Score</th>
                    <th className="col-hide-mobile">Vulnerabilities</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(asset => {
                    const riskTone = asset.riskScore > 70 ? "critical" : asset.riskScore > 40 ? "warning" : "safe";
                    const statusTone = asset.status === "Active" ? "safe" : asset.status === "Inactive" ? "neutral" : asset.status === "Unknown" ? "neutral" : "warning";
                    const rowStyle = asset.riskScore > 70
                      ? { backgroundColor: "rgba(255,59,59,0.03)" }
                      : asset.riskScore > 40
                        ? { backgroundColor: "rgba(245,158,11,0.03)" }
                        : undefined;
                    return (
                    <tr key={asset.key} className="cursor-pointer" onClick={() => setSelectedKey(asset.key)} style={rowStyle}>
                      <td onClick={event => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedKeys.includes(asset.key)}
                          onChange={event => setSelectedKeys(prev => event.target.checked ? [...prev, asset.key] : prev.filter(key => key !== asset.key))}
                        />
                      </td>
                      <td>
                        <p className="font-semibold text-white">{asset.assetName}</p>
                        <p className="text-xs text-slate-500">{asset.sources.size} data source(s)</p>
                      </td>
                      <td><Chip tone="info">{asset.assetType}</Chip></td>
                      <td className="font-mono text-sm text-slate-300">{asset.ipAddress || "-"}</td>
                      <td className="col-hide-mobile">{asset.owner || "-"}</td>
                      <td className={`font-bold ${riskTextClass(asset.riskScore)}`}>
                        <div className="flex items-center gap-2">
                          <span>{asset.riskScore}</span>
                          <div className="h-1 w-16 rounded bg-white/10">
                            <div className={`h-1 rounded ${asset.riskScore > 70 ? "bg-[var(--status-critical)]" : asset.riskScore > 40 ? "bg-[var(--status-warning)]" : "bg-[var(--status-safe)]"}`} style={{ width: `${Math.min(100, asset.riskScore)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="col-hide-mobile">{asset.vulnerabilities}</td>
                      <td>
                        <Chip tone={statusTone}>{asset.status}</Chip>
                      </td>
                      <td onClick={event => event.stopPropagation()}>
                        <RowActions
                          items={[
                            { key: "scan", label: "Scan", variant: "primary" as const, onClick: () => openScanPreview(asset) },
                            { key: "view", label: "View Details", onClick: () => setSelectedKey(asset.key) },
                            ...(riskTone !== "safe" ? [{ key: "vulns", label: "View Vulns", variant: "danger" as const, onClick: () => openVulnerabilityPanel(asset) }] : []),
                          ].slice(0, 3)}
                        />
                      </td>
                    </tr>
                  )})}
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
              <div>
                <h2 className="text-2xl font-black text-white">{selected.assetName}</h2>
                <p className="mt-1 text-sm text-slate-400">{selected.assetType} • Last seen {selected.lastSeen ? new Date(selected.lastSeen).toLocaleString() : "Unknown"}</p>
              </div>
              <button type="button" onClick={() => setSelectedKey(null)} className="soc-button-ghost h-10 w-10 px-0">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"><p className="text-xs font-bold uppercase text-slate-500">Risk Score</p><p className={`mt-2 text-2xl font-black ${riskTextClass(selected.riskScore)}`}>{selected.riskScore}</p></div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"><p className="text-xs font-bold uppercase text-slate-500">Open Alerts</p><p className="mt-2 text-2xl font-black text-amber-200">{selected.openAlerts}</p></div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"><p className="text-xs font-bold uppercase text-slate-500">Related Incidents</p><p className="mt-2 text-2xl font-black text-cyan-200">{selected.relatedIncidents}</p></div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <h3 className="text-sm font-bold text-white">Recent Events</h3>
                <div className="mt-3 space-y-2">
                  {selected.recentEvents.length === 0 ? (
                    <p className="text-sm text-slate-500">No recent event context.</p>
                  ) : (
                    selected.recentEvents.map(item => (
                      <p key={item} className="text-sm text-slate-300">{item}</p>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <h3 className="text-sm font-bold text-white">Recommended Actions</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  <li>Review related alerts and confirm triage status.</li>
                  <li>Check if this asset appears in active incidents.</li>
                  <li>Correlate this asset with related alerts, logs, and incidents.</li>
                  <li>Add asset context to incident evidence and report notes.</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <h3 className="text-sm font-bold text-white">Related Alerts</h3>
                <div className="mt-3 space-y-2">
                  {Array.from(selected.relatedAlertIds).slice(0, 6).map(alertId => {
                    const alert = alerts.find(item => item.id === alertId);
                    if (!alert) return null;
                    return (
                      <p key={alertId} className="text-sm text-slate-300">
                        #{alert.id} • {alert.title}
                      </p>
                    );
                  })}
                  {selected.relatedAlertIds.size === 0 ? <p className="text-sm text-slate-500">No linked alerts in current view.</p> : null}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <h3 className="text-sm font-bold text-white">Related Incidents</h3>
                <div className="mt-3 space-y-2">
                  {Array.from(selected.relatedIncidentIds).slice(0, 6).map(incidentId => {
                    const incident = incidents.find(item => item.id === incidentId);
                    if (!incident) return null;
                    return (
                      <p key={incidentId} className="text-sm text-slate-300">
                        #{incident.id} • {incident.title}
                      </p>
                    );
                  })}
                  {selected.relatedIncidentIds.size === 0 ? <p className="text-sm text-slate-500">No linked incidents in current view.</p> : null}
                </div>
              </div>
            </div>
          </div>
        </AppModal>
      ) : null}

      {actionMessage ? (
        <div className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {actionMessage}
        </div>
      ) : null}

      {assetActionPanel ? (
        <AppModal isOpen={Boolean(assetActionPanel)} onClose={() => setAssetActionPanel(null)} size="lg" panelClassName="soc-panel-strong p-6">
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white">
                  {assetActionPanel.mode === "scan" ? "Scan Preview" : "Vulnerability Context"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {assetActionPanel.mode === "scan"
                    ? "Live scan endpoint is not configured yet. This preview uses current LogShield telemetry only."
                    : "Vulnerability records are derived from available alerts, incidents, and recent events."}
                </p>
              </div>
              <button type="button" onClick={() => setAssetActionPanel(null)} className="soc-button-ghost h-10 w-10 px-0">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {assetActionPanel.assets.map(asset => (
                <div key={asset.key} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{asset.assetName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {asset.assetType} - IP {asset.ipAddress || "N/A"} - Last seen {asset.lastSeen ? new Date(asset.lastSeen).toLocaleString() : "Unknown"}
                      </p>
                    </div>
                    <Chip tone={asset.riskScore > 70 ? "critical" : asset.riskScore > 40 ? "warning" : "safe"}>
                      Risk {asset.riskScore}
                    </Chip>
                  </div>

                  {assetActionPanel.mode === "scan" ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-300">
                        Open alerts: <b className="text-white">{asset.openAlerts}</b>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-300">
                        Related incidents: <b className="text-white">{asset.relatedIncidents}</b>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-300">
                        Data sources: <b className="text-white">{asset.sources.size}</b>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3 text-sm text-slate-300">
                      {asset.vulnerabilities > 0 ? (
                        <p>{asset.vulnerabilities} vulnerability signal(s) are associated with this asset in the current dataset.</p>
                      ) : (
                        <p>No vulnerability records are available for this asset.</p>
                      )}
                      <p>Related alerts: {asset.relatedAlertIds.size}</p>
                      <p>Related incidents: {asset.relatedIncidentIds.size}</p>
                    </div>
                  )}

                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent context</p>
                    {asset.recentEvents.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">No recent event context.</p>
                    ) : (
                      <ul className="mt-2 space-y-1 text-sm text-slate-300">
                        {asset.recentEvents.slice(0, 4).map(event => <li key={event}>{event}</li>)}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AppModal>
      ) : null}
    </div>
  );
}
