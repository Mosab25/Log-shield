import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle, ExternalLink, RefreshCw, Search, ShieldAlert, XCircle, Copy, History } from "lucide-react";
import { ApiError, apiClient } from "../api/client";
import { useAuthGate } from "../auth/useAuthGate";
import { InfoHint, RecommendedActions } from "../components/Guidance";
import { ErrorState, SectionHeader, SkeletonBlock } from "../components/UI";
import { Chip } from "../components/ui/Chip";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { RowActions } from "../components/ui/RowActions";

interface URLScanRequest {
  url: string;
}

interface URLScanResponse {
  url: string;
  normalized_url: string;
  status: "safe" | "suspicious" | "malicious" | "unknown";
  score: number;
  provider: string;
  summary: {
    malicious: number;
    suspicious: number;
    harmless: number;
    undetected: number;
  };
  categories: string[];
  last_analysis_date: string | null;
  recommendation: string;
  raw_reference: {
    provider_id: string;
    permalink: string;
  };
  scanned_at: string;
  scanned_by: string;
  mode?: "external_provider" | "local_fallback" | "provider" | "backend_unavailable" | string;
  severity?: string | null;
  summary_text?: string | null;
  confidence_note?: string | null;
  reasons?: string[];
  parsed_url?: {
    scheme: string;
    hostname: string;
    path: string;
  };
  recommended_actions?: string[];
  safety_model?: {
    visited_url: boolean;
    executed_content: boolean;
    note: string;
  };
}

interface URLScanHistoryItem {
  id: number;
  url: string;
  status: string;
  provider: string;
  score: number;
  scanned_at: string;
  scanned_by: string;
}

interface URLScanHistoryResponse {
  scans: URLScanHistoryItem[];
  total: number;
  page: number;
  per_page: number;
}

export function URLScannerPage() {
  const { requireAuth, loginRequiredModal, isAuthenticated, isAuthLoading } = useAuthGate();
  const [url, setUrl] = useState("");
  const [scanResult, setScanResult] = useState<URLScanResponse | null>(null);
  const [history, setHistory] = useState<URLScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    if (isAuthenticated) {
      void loadScanHistory();
      return;
    }

    setHistory([]);
    setHistoryLoading(false);
  }, [isAuthenticated, isAuthLoading]);

  async function loadScanHistory() {
    setHistoryLoading(true);
    try {
      const response = await apiClient.get<URLScanHistoryResponse>("/url-scanner/history?limit=20");
      setHistory(response.scans);
    } catch (err) {
      console.error("Failed to load scan history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }

  function validateUrl(url: string): boolean {
    if (!url || url.trim().length === 0) {
      setValidationError("Please enter a URL to scan.");
      return false;
    }

    if (url.length > 2048) {
      setValidationError("URL is too long (max 2048 characters)");
      return false;
    }

    // Basic URL format check
    try {
      const urlObj = new URL(url);
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        setValidationError("Please enter a valid URL including http:// or https://.");
        return false;
      }
    } catch {
      setValidationError("Please enter a valid URL including http:// or https://.");
      return false;
    }

    setValidationError(null);
    return true;
  }

  function handleScan() {
    requireAuth(() => void runScan());
  }

  async function runScan() {
    if (!validateUrl(url)) {
      return;
    }

    setLoading(true);
    setError(null);
    setScanResult(null);

    try {
      const response = await apiClient.post<URLScanResponse>("/url-scanner/scan", { url: url.trim() });
      setScanResult(response);
      setUrl(""); // Clear input after successful scan
      
      // Refresh history
      if (isAuthenticated) await loadScanHistory();
    } catch (err) {
      setError(scannerErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setUrl("");
    setValidationError(null);
    setError(null);
    setCopyMessage(null);
    setScanResult(null);
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleScan();
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "safe":
        return "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
      case "suspicious":
        return "text-amber-400 bg-amber-400/10 border-amber-400/30";
      case "malicious":
        return "text-red-400 bg-red-400/10 border-red-400/30";
      default:
        return "text-slate-400 bg-slate-400/10 border-slate-400/30";
    }
  }

  function isLocalFallback(result: URLScanResponse) {
    return result.mode === "local_fallback" || result.provider === "local_fallback";
  }

  function getDisplayStatus(result: URLScanResponse) {
    if (isLocalFallback(result) && result.status === "safe") return "unknown";
    return result.status;
  }

  function getDisplayVerdictLabel(result: URLScanResponse) {
    const status = getDisplayStatus(result);
    if (isLocalFallback(result) && status === "unknown") return "Unknown / Informational";
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  function getModeLabel(result: URLScanResponse) {
    if (result.mode === "backend_unavailable") return "Service Unavailable";
    if (isLocalFallback(result)) return "Local Fallback";
    return "External Provider";
  }

  function getModeTone(result: URLScanResponse) {
    if (result.mode === "backend_unavailable") return "warning" as const;
    if (isLocalFallback(result)) return "info" as const;
    return "neutral" as const;
  }

  function getResultStatusColor(result: URLScanResponse) {
    const status = getDisplayStatus(result);
    if (isLocalFallback(result) && status === "unknown") {
      return "text-cyan-300 bg-cyan-400/10 border-cyan-400/25";
    }
    return getStatusColor(status);
  }

  function getResultStatusIcon(result: URLScanResponse) {
    return getStatusIcon(getDisplayStatus(result));
  }

  function verdictTone(status: string) {
    if (status === "safe") return "safe" as const;
    if (status === "malicious") return "critical" as const;
    if (status === "suspicious") return "warning" as const;
    if (status === "unknown") return "neutral" as const;
    return "info" as const;
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "safe":
        return <CheckCircle className="h-5 w-5" />;
      case "suspicious":
        return <AlertCircle className="h-5 w-5" />;
      case "malicious":
        return <XCircle className="h-5 w-5" />;
      default:
        return <ShieldAlert className="h-5 w-5" />;
    }
  }

  function getScoreColor(score: number) {
    if (score <= 20) return "text-emerald-400";
    if (score <= 40) return "text-amber-400";
    if (score <= 60) return "text-amber-400";
    return "text-red-400";
  }

  function getResultScoreColor(result: URLScanResponse) {
    if (isLocalFallback(result) && getDisplayStatus(result) === "unknown") {
      return "text-cyan-300";
    }
    return getScoreColor(result.score);
  }

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString();
  }

  async function copyToClipboard(text: string, type: string) {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.setAttribute("readonly", "true");
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (!copied) {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(text);
      }
      setCopyMessage(`${type} copied.`);
    } catch {
      setCopyMessage("Copy failed. Please copy manually.");
    }
  }

  function defangUrl(url: string) {
    return url.replace(/[.]/g, "[.]").replace(/http/g, "hxxp");
  }

  function getResultSummary(result: URLScanResponse) {
    if (result.summary_text) return result.summary_text;

    const status = getDisplayStatus(result);
    if (isLocalFallback(result)) {
      if (status === "suspicious") return "Suspicious static URL indicators were found.";
      return "No obvious suspicious static indicators were found, but this does not prove the URL is safe.";
    }

    switch (status) {
      case "safe":
        return "No malicious reputation was found by the external provider.";
      case "suspicious":
        return "Some signals or vendors suggest risk. Review the detections and avoid opening the URL directly until evidence is understood.";
      case "malicious":
        return "The URL has malicious reputation. Do not open it; preserve evidence and investigate related IOCs.";
      default:
        return "There is not enough reputation data. Treat the URL with caution and continue analysis with domain, IP, and IOC extraction.";
    }
  }

  function getConfidenceNote(result: URLScanResponse) {
    if (result.confidence_note) return result.confidence_note;
    if (isLocalFallback(result)) {
      return "External reputation provider is unavailable. This result is based only on static URL indicators.";
    }
    if (getDisplayStatus(result) === "safe") {
      return "This does not prove the URL is harmless. Continue with normal caution.";
    }
    return "Use this result as one triage signal and correlate it with logs, alerts, and asset context.";
  }

  function getRecommendedActions(result: URLScanResponse) {
    if (result.recommended_actions?.length) return result.recommended_actions;
    if (isLocalFallback(result) && getDisplayStatus(result) === "unknown") {
      return [
        "Verify the domain carefully.",
        "Do not enter passwords or payment details unless you trust the site.",
        "Use external reputation checks if needed.",
      ];
    }
    return [
      "Defang the URL before sharing it.",
      "Extract the domain, IP, and related IOCs.",
      "Add suspicious or malicious results to incident evidence.",
      "Block related IPs or domains when policy allows.",
    ];
  }

  function scannerErrorMessage(err: unknown) {
    if (err instanceof TypeError || (err instanceof Error && /failed to fetch|networkerror/i.test(err.message))) {
      return "Scanner service is unavailable. Please check that the backend is running.";
    }
    if (err instanceof ApiError && err.status === 400) {
      return "Please enter a valid URL including http:// or https://.";
    }
    if (err instanceof ApiError && err.status >= 500) {
      return "Scanner service is unavailable. Please check that the backend is running.";
    }
    return err instanceof Error ? err.message : "Scanner service is unavailable. Please check that the backend is running.";
  }

  if (isAuthenticated && historyLoading && !scanResult) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="URL REPUTATION"
          title="URL Scanner"
          description="Analyze URLs safely and identify phishing, malicious, or suspicious indicators."
        />
        <SkeletonBlock className="h-32" />
        <SkeletonBlock className="h-64" />
        <SkeletonBlock className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="URL REPUTATION"
        title="URL Scanner"
        description="Analyze URLs safely and identify phishing, malicious, or suspicious indicators."
      />

      <InfoHint title="What the verdict means">
        This scanner summarizes reputation signals like a security operations triage view: verdict, detection counts, score, source, and what to do next. Unknown does not mean safe; it means there was not enough reputation evidence.
      </InfoHint>
      {!isAuthenticated ? (
        <InfoHint title="Public read-only mode">
          You can review how URL reputation triage works here. Scanning URLs and viewing scan history require a LogShield account.
        </InfoHint>
      ) : null}

      {/* Scan Form */}
      <div className="soc-panel p-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="url-input" className="block text-sm font-medium text-white mb-2">
              URL to Scan
            </label>
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  id="url-input"
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="https://example.com/suspicious"
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                  disabled={loading}
                />
              </div>
              <button
                type="button"
                onClick={handleScan}
                disabled={loading || !url.trim()}
                className="soc-button flex items-center gap-2 px-6 py-2"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {loading ? "Scanning..." : "Scan"}
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={loading}
                className="soc-button-ghost px-4 py-2"
              >
                Clear
              </button>
            </div>
          </div>

          {validationError && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-300/25 bg-amber-400/10">
              <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5" />
              <span className="text-sm text-amber-200">{validationError}</span>
            </div>
          )}

          {error && (
            <ErrorState message={error} onRetry={() => setError(null)} />
          )}
          {copyMessage ? (
            <div className="rounded-lg border border-cyan-300/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
              {copyMessage}
            </div>
          ) : null}
        </div>
      </div>

      {/* Scan Result */}
      {scanResult && (
        <div id="url-scan-details" className="space-y-6 scroll-mt-6">
          {/* Result Summary Card */}
          <div className="soc-panel p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl border ${getResultStatusColor(scanResult)}`}>
                  {getResultStatusIcon(scanResult)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    {getDisplayVerdictLabel(scanResult)}
                  </h3>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Chip tone={getModeTone(scanResult)}>{getModeLabel(scanResult)}</Chip>
                    {scanResult.severity ? <Chip tone={verdictTone(getDisplayStatus(scanResult))}>{scanResult.severity}</Chip> : null}
                  </div>
                  <div className="space-y-2 text-sm leading-6">
                    <p className="text-slate-300">
                      <span className="font-medium text-slate-100">Summary: </span>
                      {getResultSummary(scanResult)}
                    </p>
                    <p className="text-slate-400">
                      <span className="font-medium text-slate-200">Confidence note: </span>
                      {getConfidenceNote(scanResult)}
                    </p>
                  </div>
                  {scanResult.mode === "local_fallback" || scanResult.provider === "local_fallback" ? (
                    <p className="mt-3 rounded-lg border border-cyan-300/25 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">
                      External reputation provider is unavailable. Showing local fallback analysis based on static URL indicators only.
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${getResultScoreColor(scanResult)}`}>
                  {scanResult.score}/100
                </div>
                <div className="text-sm text-slate-400">Risk Score</div>
              </div>
            </div>

            {!isLocalFallback(scanResult) ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="text-center p-3 rounded-lg bg-slate-900/50">
                  <div className="text-lg font-bold text-red-400">{scanResult.summary.malicious}</div>
                  <div className="text-xs text-slate-400">Malicious</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-900/50">
                  <div className="text-lg font-bold text-amber-400">{scanResult.summary.suspicious}</div>
                  <div className="text-xs text-slate-400">Suspicious</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-900/50">
                  <div className="text-lg font-bold text-emerald-400">{scanResult.summary.harmless}</div>
                  <div className="text-xs text-slate-400">Harmless</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-slate-900/50">
                  <div className="text-lg font-bold text-slate-400">{scanResult.summary.undetected}</div>
                  <div className="text-xs text-slate-400">Undetected</div>
                </div>
              </div>
            ) : null}
          </div>

          <RecommendedActions
            title="What to do next"
            actions={getRecommendedActions(scanResult)}
          />

          {/* Technical Details */}
          <div className="soc-panel p-6">
            <SectionHeader title="Technical Details" />
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-sm text-slate-400 mb-1">Submitted URL</div>
                  <div className="text-white break-all">{scanResult.url}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">Normalized URL</div>
                  <div className="text-white break-all">{scanResult.normalized_url}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">Provider</div>
                  <div className="text-white">{isLocalFallback(scanResult) ? "Local fallback" : scanResult.provider}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">Last Analysis</div>
                  <div className="text-white">
                    {scanResult.last_analysis_date
                      ? formatDateTime(scanResult.last_analysis_date)
                      : "Not available"}
                  </div>
                </div>
              </div>

              {scanResult.categories.length > 0 && (
                <div>
                  <div className="text-sm text-slate-400 mb-2">Categories</div>
                  <div className="flex flex-wrap gap-2">
                    {scanResult.categories.map((category, index) => (
                      <Chip key={index} tone="info">{category}</Chip>
                    ))}
                  </div>
                </div>
              )}

              {scanResult.reasons && scanResult.reasons.length > 0 ? (
                <div>
                  <div className="text-sm text-slate-400 mb-2">Reasons</div>
                  <ul className="space-y-1 text-sm text-slate-300">
                    {scanResult.reasons.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {scanResult.parsed_url ? (
                <div>
                  <div className="text-sm text-slate-400 mb-2">Parsed URL</div>
                  <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-3">
                    <span>Scheme: {scanResult.parsed_url.scheme}</span>
                    <span>Host: {scanResult.parsed_url.hostname}</span>
                    <span>Path: {scanResult.parsed_url.path || "/"}</span>
                  </div>
                </div>
              ) : null}

              {scanResult.raw_reference.permalink && (
                <div>
                  <div className="text-sm text-slate-400 mb-2">Provider Analysis</div>
                  <a
                    href={scanResult.raw_reference.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View detailed analysis on {scanResult.provider}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Safety Actions */}
          <div className="soc-panel p-6">
            <SectionHeader title="Safety Actions" />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void copyToClipboard(scanResult.url, "URL")}
                className="soc-button-ghost flex items-center gap-2 px-4 py-2"
              >
                <Copy className="h-4 w-4" />
                Copy URL
              </button>
              <button
                type="button"
                onClick={() => void copyToClipboard(defangUrl(scanResult.url), "Defanged URL")}
                className="soc-button-ghost flex items-center gap-2 px-4 py-2"
              >
                <Copy className="h-4 w-4" />
                Copy Defanged URL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scan History */}
      <div className="soc-panel p-6">
        <SectionHeader title="Scan History" />
        {!isAuthenticated ? (
          <EmptyState
            title="Login to view scan history"
            description="Scan history is tied to authenticated LogShield users, so public visitors only see the scanner preview."
            icon={<History className="h-5 w-5" />}
            action={<button type="button" onClick={() => requireAuth(() => undefined)} className="soc-button-primary">Login Required</button>}
          />
        ) : history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="soc-table">
              <thead>
                <tr>
                  <th>URL</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Provider</th>
                  <th>Scanned At</th>
                  <th>Scanned By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((scan) => (
                  <tr key={scan.id}>
                    <td className="max-w-xs truncate" title={scan.url}>
                      <Link
                        to={`/url-scanner/${scan.id}`}
                        className="max-w-full truncate text-left text-slate-200 transition-colors hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                        aria-label={`Open scan details for ${scan.url}`}
                      >
                        {scan.url}
                      </Link>
                    </td>
                    <td>
                      <Chip tone={verdictTone(scan.status)}>{scan.status}</Chip>
                    </td>
                    <td className={getScoreColor(scan.score)}>{scan.score}/100</td>
                    <td className="text-slate-300">{scan.provider}</td>
                    <td className="text-slate-400">{formatDateTime(scan.scanned_at)}</td>
                    <td className="text-slate-300">{scan.scanned_by}</td>
                    <td>
                      <RowActions
                        items={[
                          { key: "view", label: <Link to={`/url-scanner/${scan.id}`}>View</Link>, variant: "primary" as const },
                          { key: "copy", label: "Copy URL", onClick: () => void copyToClipboard(scan.url, "URL") },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No scan history"
            description="URLs you scan will appear here for future reference."
            icon={<History className="h-5 w-5" />}
          />
        )}
      </div>
      {loginRequiredModal}
    </div>
  );
}
