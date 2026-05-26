import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Copy,
  ExternalLink,
  FileSearch,
  Gauge,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { apiClient, toUserErrorMessage } from "../api/client";
import { InfoHint, RecommendedActions, VerdictBadge } from "../components/Guidance";
import { EmptyState, ErrorState, SectionHeader, SkeletonBlock } from "../components/UI";
import { scoreToRiskLevel } from "../utils/riskModel";

interface URLScanEngineResult {
  engine: string;
  category: string;
  result: string;
  method: string | null;
}

interface URLScanResponse {
  id: number | null;
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
  score_breakdown: {
    formula: string;
    explanation: string;
    engine_total: number;
    provider_error: string | null;
    engine_results: URLScanEngineResult[];
  } | null;
  raw_reference: {
    provider_id: string;
    permalink: string;
  };
  scanned_at: string;
  scanned_by: string;
}

const STATUS_STYLES: Record<string, string> = {
  safe: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  suspicious: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  malicious: "border-red-400/30 bg-red-400/10 text-red-300",
  unknown: "border-slate-400/30 bg-slate-400/10 text-slate-300",
};

function statusIcon(status: string) {
  if (status === "safe") return <CheckCircle className="h-5 w-5" />;
  if (status === "malicious") return <XCircle className="h-5 w-5" />;
  if (status === "suspicious") return <AlertCircle className="h-5 w-5" />;
  return <ShieldAlert className="h-5 w-5" />;
}

function scoreColor(score: number) {
  const level = scoreToRiskLevel(score);
  if (level === "low") return "text-emerald-300";
  if (level === "medium" || level === "high") return "text-amber-300";
  return "text-red-300";
}

function formatDateTime(value: string | null) {
  if (!value) return "Not available";
  return new Date(value).toLocaleString();
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function explainScan(status: string) {
  if (status === "safe") return "No malicious provider reputation was found. Still avoid assuming trust if the URL was delivered through phishing, chat, or unexpected email.";
  if (status === "suspicious") return "One or more signals suggest risk. Review the engine detections, categories, and normalized URL before any user opens it.";
  if (status === "malicious") return "Treat this URL as dangerous. Do not open it; preserve evidence, add it to an incident, and consider blocking related infrastructure.";
  return "The provider did not return enough evidence. Continue with IOC extraction, domain review, and manual context checks.";
}

export function URLScanDetailsPage() {
  const { id } = useParams();
  const [scan, setScan] = useState<URLScanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<URLScanResponse>(`/url-scanner/result/${id}`);
      setScan(response);
    } catch (err) {
      setScan(null);
      setError(toUserErrorMessage(err, "Failed to load URL scan report."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function copyUrl() {
    if (!scan) return;
    await navigator.clipboard.writeText(scan.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonBlock className="h-40" />
        <SkeletonBlock className="h-72" />
        <SkeletonBlock className="h-64" />
      </div>
    );
  }

  if (!scan) {
    return <ErrorState message={error ?? "URL scan report not found."} onRetry={() => void load()} />;
  }

  const statusStyle = STATUS_STYLES[scan.status] ?? STATUS_STYLES.unknown;
  const providerLink = scan.raw_reference.permalink && scan.raw_reference.permalink !== "#";
  const engineResults = scan.score_breakdown?.engine_results ?? [];

  return (
    <div className="space-y-6">
      <Link to="/url-scanner" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-white">
        <ArrowLeft className="h-4 w-4" />
        Back to URL Scanner
      </Link>

      <section className="soc-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold capitalize ${statusStyle}`}>
                {statusIcon(scan.status)}
                {scan.status}
              </span>
              <VerdictBadge verdict={scan.status} />
              <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-sm font-bold text-cyan-200">
                {scan.provider}
              </span>
              <span className="rounded-full border border-slate-600 bg-slate-900/80 px-3 py-1 text-sm font-bold text-slate-300">
                Report #{scan.id ?? id}
              </span>
            </div>
            <h1 className="mt-5 break-words text-2xl font-black text-white">URL Scan Report</h1>
            <p className="mt-3 max-w-4xl break-all font-mono text-sm text-cyan-100">{scan.normalized_url}</p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{scan.recommendation}</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{explainScan(scan.status)}</p>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-950/70 px-6 py-5 text-center">
            <Gauge className="mx-auto h-6 w-6 text-cyan-300" />
            <p className={`mt-3 text-4xl font-black ${scoreColor(scan.score)}`}>{scan.score}</p>
            <p className="text-xs font-bold uppercase text-slate-500">Risk Score / 100</p>
          </div>
        </div>
      </section>

      <InfoHint title="How to read this report">
        Start with the verdict and detection ratio, then review the scoring formula and engine detections. A low score means fewer reputation hits, not a guarantee that the site is safe in your environment.
      </InfoHint>

      <RecommendedActions
        title="Continue investigation"
        actions={[
          "Copy a defanged URL before sharing evidence.",
          "Extract domain and path indicators in the Security Operations Toolkit.",
          "Add the URL report to an incident if it relates to an alert.",
          "Open the provider report only if you need raw external context.",
        ]}
      />

      {scan.score_breakdown?.provider_error ? (
        <section className="rounded-lg border border-amber-300/30 bg-amber-400/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <p className="font-bold text-amber-100">Provider fallback used</p>
              <p className="mt-1 text-sm text-amber-100/80">
                This report may show `unknown 50/100` because the provider response failed or was unavailable for that scan.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="soc-panel p-6">
        <SectionHeader title="What Was Scanned" icon={FileSearch} />
        <div className="grid gap-4 md:grid-cols-2">
          <DetailTile label="Submitted URL" value={scan.url} />
          <DetailTile label="Normalized URL" value={scan.normalized_url} />
          <DetailTile label="Provider Reference" value={scan.raw_reference.provider_id || "Not available"} />
          <DetailTile label="Last Provider Analysis" value={formatDateTime(scan.last_analysis_date)} />
          <DetailTile label="Scanned By" value={scan.scanned_by} />
          <DetailTile label="LogShield Scan Time" value={formatDateTime(scan.scanned_at)} />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={() => void copyUrl()} className="soc-button-ghost">
            <Copy className="h-4 w-4" />
            {copied ? "Copied" : "Copy URL"}
          </button>
          {providerLink ? (
            <a href={scan.raw_reference.permalink} target="_blank" rel="noopener noreferrer" className="soc-button">
              <ExternalLink className="h-4 w-4" />
              Open in {scan.provider}
            </a>
          ) : null}
        </div>
      </section>

      <section className="soc-panel p-6">
        <SectionHeader title="Score Breakdown" icon={Gauge} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DetectionCount label="Malicious" value={scan.summary.malicious} tone="text-red-300" />
          <DetectionCount label="Suspicious" value={scan.summary.suspicious} tone="text-amber-300" />
          <DetectionCount label="Harmless" value={scan.summary.harmless} tone="text-emerald-300" />
          <DetectionCount label="Undetected" value={scan.summary.undetected} tone="text-slate-300" />
        </div>

        <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs font-bold uppercase text-slate-500">LogShield scoring formula</p>
          <p className="mt-2 font-mono text-sm text-cyan-100">{scan.score_breakdown?.formula ?? "Not available"}</p>
          <p className="mt-3 text-sm leading-6 text-slate-300">{scan.score_breakdown?.explanation ?? "No score explanation is available for this scan."}</p>
          <p className="mt-2 text-xs text-slate-500">
            Provider engines represented: {scan.score_breakdown?.engine_total ?? 0}
          </p>
        </div>
      </section>

      <section className="soc-panel p-6">
        <SectionHeader title="Engine Detections" icon={ShieldAlert} />
        {engineResults.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="soc-table">
              <thead>
                <tr>
                  <th>Engine</th>
                  <th>Category</th>
                  <th>Result</th>
                  <th>Method</th>
                </tr>
              </thead>
              <tbody>
                {engineResults.map((item) => (
                  <tr key={`${item.engine}-${item.result}`}>
                    <td className="font-semibold text-white">{item.engine}</td>
                    <td>
                      <span className={`rounded-full border px-2 py-1 text-xs font-bold capitalize ${STATUS_STYLES[item.category] ?? STATUS_STYLES.unknown}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="text-slate-300">{item.result}</td>
                    <td className="text-slate-400">{item.method ?? "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No engine-level detections stored"
            description="Older reports may only include summary counts. New scans store compact malicious/suspicious engine details when the provider returns them."
            icon={ShieldAlert}
          />
        )}
      </section>

      {scan.categories.length > 0 ? (
        <section className="soc-panel p-6">
          <SectionHeader title="Categories" />
          <div className="flex flex-wrap gap-2">
            {scan.categories.map((category) => (
              <span key={category} className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-sm font-semibold text-cyan-200">
                {category}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function DetectionCount({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 text-center">
      <p className={`text-2xl font-black ${tone}`}>{value}</p>
      <p className="mt-1 text-xs font-bold uppercase text-slate-500">{label}</p>
    </div>
  );
}
