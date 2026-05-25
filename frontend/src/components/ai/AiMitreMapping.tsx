import type { AiMitreMapping } from "../../api/aiAnalysis";

interface AiMitreMappingProps {
  mappings: AiMitreMapping[];
}

export function AiMitreMapping({ mappings }: AiMitreMappingProps) {
  if (!mappings.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">MITRE ATT&CK Mapping</p>
      <div className="flex flex-wrap gap-2">
        {mappings.map((mapping) => (
          <span key={`${mapping.technique_id}-${mapping.technique_name}`} className="chip chip-violet">
            {mapping.technique_id} - {mapping.technique_name}
          </span>
        ))}
      </div>
      <div className="space-y-2">
        {mappings.map((mapping) => (
          <p key={`${mapping.technique_id}-${mapping.reason}`} className="text-xs text-slate-400">
            <span className="font-semibold text-slate-300">{mapping.tactic}:</span> {mapping.reason}
          </p>
        ))}
      </div>
    </div>
  );
}
