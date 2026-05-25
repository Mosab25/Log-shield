import type { CSSProperties } from "react";
import { BellRing, BriefcaseBusiness, FileSearch, FileText, ScrollText } from "lucide-react";

const workflow = [
  { label: "Logs", detail: "Event evidence", icon: ScrollText },
  { label: "Alerts", detail: "Detection signal", icon: BellRing },
  { label: "Incidents", detail: "Case workflow", icon: BriefcaseBusiness },
  { label: "Evidence", detail: "Correlated facts", icon: FileSearch },
  { label: "Reports", detail: "Exportable record", icon: FileText },
];

export function WorkflowCards({ activeScene }: { activeScene: number }) {
  return (
    <div className={`ls-workflow ${activeScene === 3 ? "is-visible" : ""}`} aria-hidden={activeScene !== 3}>
      {workflow.map(({ label, detail, icon: Icon }, index) => (
        <div key={label} className="ls-workflow-card" style={{ "--delay": `${index * 0.1}s` } as CSSProperties}>
          <div className="ls-workflow-icon">
            <Icon className="h-5 w-5" />
          </div>
          <span>{label}</span>
          <p>{detail}</p>
          {index < workflow.length - 1 ? <i /> : null}
        </div>
      ))}
    </div>
  );
}
