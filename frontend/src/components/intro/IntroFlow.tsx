import { ArrowRight, Database, FileSearch, Fingerprint, ShieldAlert } from "lucide-react";

const flowItems = [
  { label: "Raw Logs", icon: Database },
  { label: "Detection Engine", icon: ShieldAlert },
  { label: "Threat Classification", icon: Fingerprint },
  { label: "Incident Report", icon: FileSearch },
];

export function IntroFlow() {
  return (
    <div className="intro-flow" aria-label="Raw Logs to Incident Report workflow">
      {flowItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="intro-flow-step">
            <div className="intro-flow-node">
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </div>
            {index < flowItems.length - 1 ? (
              <div className="intro-flow-connector" aria-hidden="true">
                <span />
                <ArrowRight className="h-4 w-4" />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
