import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, ExternalLink, RefreshCw, Search, Shield, ShieldAlert, ShieldX, XCircle, Clock, Copy, Eye, History } from "lucide-react";
import { apiClient } from "../api/client";
import { EmptyState, ErrorState, PageHeader, SectionHeader, SkeletonBlock } from "../components/UI";

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
  const [url, setUrl] = useState("");
  const [scanResult, setScanResult] = useState<URLScanResponse | null>(null);
  const [history, setHistory] = useState<URLScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load scan history on component mount
  useEffect(() => {
    loadScanHistory();
  }, []);

  async function loadScanHistory() {
    setHistoryLoading(true);
    try {
      const response = await apiClient.get<URLScanHistoryResponse>("/url-scanner/history");
      setHistory(response.scans);
    } catch (err) {
      console.error("Failed to load scan history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }

  function validateUrl(url: string): boolean {
    if (!url || url.trim().length === 0) {
      setValidationError("URL is required");
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
        setValidationError("Only HTTP and HTTPS URLs are allowed");
        return false;
      }
    } catch {
      setValidationError("Invalid URL format");
      return false;
    }

    setValidationError(null);
    return true;
  }

  async function handleScan() {
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
      await loadScanHistory();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to scan URL";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setUrl("");
    setValidationError(null);
    setError(null);
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
    if (score <= 60) return "text-orange-400";
    return "text-red-400";
  }

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString();
  }

  function copyToClipboard(text: string, type: string) {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  }

  function defangUrl(url: string) {
    return url.replace(/[.]/g, "[.]").replace(/http/g, "hxxp");
  }

  if (historyLoading && !scanResult) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Security"
          title="URL Reputation Scanner"
          description="Analyze suspicious URLs using external reputation intelligence before opening or sharing them."
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
        eyebrow="Security"
        title="URL Reputation Scanner"
        description="Analyze suspicious URLs using external reputation intelligence before opening or sharing them."
      />

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
        </div>
      </div>

      {/* Scan Result */}
      {scanResult && (
        <div className="space-y-6">
          {/* Result Summary Card */}
          <div className="soc-panel p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl border ${getStatusColor(scanResult.status)}`}>
                  {getStatusIcon(scanResult.status)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    {scanResult.status.charAt(0).toUpperCase() + scanResult.status.slice(1)}
                  </h3>
                  <p className="text-slate-300">{scanResult.recommendation}</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${getScoreColor(scanResult.score)}`}>
                  {scanResult.score}/100
                </div>
                <div className="text-sm text-slate-400">Risk Score</div>
              </div>
            </div>

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
          </div>

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
                  <div className="text-white">{scanResult.provider}</div>
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
                      <span
                        key={index}
                        className="px-2 py-1 text-xs rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-400/30"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              )}

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
                onClick={() => copyToClipboard(scanResult.url, "url")}
                className="soc-button-ghost flex items-center gap-2 px-4 py-2"
              >
                <Copy className="h-4 w-4" />
                Copy URL
              </button>
              <button
                onClick={() => copyToClipboard(defangUrl(scanResult.url), "defanged")}
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
        {history.length > 0 ? (
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
                    <td className="text-slate-300 max-w-xs truncate" title={scan.url}>
                      {scan.url}
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${getStatusColor(scan.status)}`}>
                        {getStatusIcon(scan.status)}
                        {scan.status}
                      </span>
                    </td>
                    <td className={getScoreColor(scan.score)}>{scan.score}/100</td>
                    <td className="text-slate-300">{scan.provider}</td>
                    <td className="text-slate-400">{formatDateTime(scan.scanned_at)}</td>
                    <td className="text-slate-300">{scan.scanned_by}</td>
                    <td>
                      <button
                        onClick={() => copyToClipboard(scan.url, "history")}
                        className="text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
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
            icon={History}
          />
        )}
      </div>
    </div>
  );
}
