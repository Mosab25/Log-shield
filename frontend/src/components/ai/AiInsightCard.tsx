import { useMemo } from "react";
import type { AiAnalysisResult } from "../../api/aiAnalysis";
import { AiMitreMapping } from "./AiMitreMapping";
import { AiRecommendationList } from "./AiRecommendationList";

interface AiInsightCardProps {
  result: AiAnalysisResult;
  title?: string;
}

function severityClass(severity: AiAnalysisResult["severity"]): string {
  if (severity === "critical" || severity === "high") return "chip-critical";
  if (severity === "medium") return "chip-warning";
  if (severity === "low") return "chip-info";
  return "chip-neutral";
}

export function AiInsightCard({ result, title = "AI-Assisted Analysis" }: AiInsightCardProps) {
  const iocItems = useMemo(
    () => [
      ...result.extracted_iocs.ips,
      ...result.extracted_iocs.domains,
      ...result.extracted_iocs.urls,
      ...result.extracted_iocs.hashes,
    ],
    [result.extracted_iocs],
  );

  return (
    <section className="soc-panel p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{title}</p>
          <p className="mt-1 text-sm text-slate-300">{result.summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip chip-info">{result.mode === "ai_provider" ? "AI Provider" : "Local Fallback"}</span>
          <span className={`chip ${severityClass(result.severity)}`}>{result.severity}</span>
          <span className="chip chip-neutral">Confidence {Math.round(result.confidence * 100)}%</span>
          <span className="chip chip-neutral">Risk {result.risk_score}</span>
        </div>
      </div>

      {result.mode === "local_fallback" ? (
        <p className="text-xs text-amber-200">AI-assisted analysis is using local fallback mode</p>
      ) : null}

      {result.risk_reasons.length ? (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Risk Reasons</p>
          <ul className="space-y-1 text-sm text-slate-300">
            {result.risk_reasons.map((reason) => (
              <li key={reason} className="flex gap-2">
                <span className="text-cyan-300">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <AiMitreMapping mappings={result.mitre_mappings} />
      <AiRecommendationList actions={result.recommended_actions} />

      {iocItems.length ? (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Extracted IOCs</p>
          <div className="flex flex-wrap gap-2">
            {iocItems.slice(0, 14).map((ioc) => (
              <span key={ioc} className="chip chip-neutral">{ioc}</span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
