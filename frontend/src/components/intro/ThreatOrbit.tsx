import type { CSSProperties } from "react";
import { Activity, Check, Globe, KeyRound, LockKeyhole, UserCheck, Binary } from "lucide-react";

const threats = [
  { label: "Brute Force Attempt", icon: KeyRound },
  { label: "SQL Injection Pattern", icon: Binary },
  { label: "Suspicious Login", icon: UserCheck },
  { label: "Malicious URL", icon: Globe },
  { label: "Privilege Escalation", icon: LockKeyhole },
  { label: "Abnormal Traffic Spike", icon: Activity },
];

export function ThreatOrbit({ activeScene }: { activeScene: number }) {
  const visible = activeScene === 1 || activeScene === 2;
  const blocked = activeScene >= 2;

  if (!visible) {
    return null;
  }

  return (
    <div className={`ls-threat-orbit ${visible ? "is-visible" : ""} ${blocked ? "is-blocked" : ""}`} aria-hidden="true">
      {threats.map(({ label, icon: Icon }, index) => (
        <div
          key={label}
          className={`ls-threat-node ls-threat-node-${index + 1}`}
          style={{ "--delay": `${index * 0.12}s` } as CSSProperties}
        >
          <span className="ls-threat-line" />
          <div className="ls-threat-badge">
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            <b>{blocked ? <Check className="h-3 w-3" /> : null}{blocked ? "Blocked" : "Detected"}</b>
          </div>
        </div>
      ))}
    </div>
  );
}
