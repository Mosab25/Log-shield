import type { CSSProperties } from "react";
import {
  BellRing,
  BookOpenCheck,
  Fingerprint,
  LayoutDashboard,
  ScanSearch,
  ScrollText,
  ShieldCheck,
  Siren,
  Wrench,
  BriefcaseBusiness,
} from "lucide-react";

const services = [
  { label: "Dashboard", detail: "Unified visibility", icon: LayoutDashboard },
  { label: "Logs", detail: "Structured monitoring", icon: ScrollText },
  { label: "Alerts", detail: "Smart detection", icon: BellRing },
  { label: "Incidents", detail: "Guided response", icon: BriefcaseBusiness },
  { label: "SOC Toolkit", detail: "Analyst utilities", icon: Wrench },
  { label: "URL Scanner", detail: "Reputation checks", icon: ScanSearch },
  { label: "Threat Intel", detail: "CVE research", icon: Siren },
  { label: "Awareness", detail: "Training paths", icon: BookOpenCheck },
  { label: "Security Center", detail: "Protection status", icon: ShieldCheck },
  { label: "Audit Logs", detail: "Action traceability", icon: Fingerprint },
];

export function ServiceShowcase({ activeScene }: { activeScene: number }) {
  return (
    <div className={`ls-services ${activeScene === 4 ? "is-visible" : ""}`} aria-hidden={activeScene !== 4}>
      {services.map(({ label, detail, icon: Icon }, index) => (
        <div key={label} className="ls-service-card" style={{ "--delay": `${index * 0.06}s` } as CSSProperties}>
          <Icon className="h-5 w-5" />
          <span>{label}</span>
          <p>{detail}</p>
        </div>
      ))}
    </div>
  );
}
