import type { AiAnalysisResult } from "../../api/aiAnalysis";

interface AiReportDraftProps {
  result: AiAnalysisResult;
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{title}</p>
      <ul className="space-y-1 text-sm text-slate-300">
        {items.map((item) => (
          <li key={`${title}-${item}`} className="flex gap-2">
            <span className="text-cyan-300">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AiReportDraft({ result }: AiReportDraftProps) {
  const draft = result.report_draft;
  if (!draft.executive_summary && !draft.technical_summary) return null;
  return (
    <div className="space-y-3 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Investigation Report Draft</p>
      <p className="text-sm text-slate-200">{draft.executive_summary}</p>
      <p className="text-sm text-slate-300">{draft.technical_summary}</p>
      <Section title="Timeline" items={draft.timeline} />
      <Section title="IOCs" items={draft.iocs} />
      <Section title="MITRE" items={draft.mitre} />
      <Section title="Recommendations" items={draft.recommendations} />
      <p className="text-sm text-slate-300">{draft.conclusion}</p>
    </div>
  );
}
