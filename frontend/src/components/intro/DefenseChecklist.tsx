import type { CSSProperties } from "react";
import { Check } from "lucide-react";

const checklist = [
  "Detection Rules Activated",
  "Threats Classified",
  "Evidence Captured",
  "Response Workflow Engaged",
];

export function DefenseChecklist({ activeScene }: { activeScene: number }) {
  const visible = activeScene === 2;

  if (!visible) {
    return null;
  }

  return (
    <div className={`ls-defense-checklist ${visible ? "is-visible" : ""}`} aria-hidden={!visible}>
      {checklist.map((item, index) => (
        <div key={item} className="ls-defense-check" style={{ "--delay": `${1.5 + index * 0.3}s` } as CSSProperties}>
          <span>
            <Check className="h-3.5 w-3.5" />
          </span>
          <b>{item}</b>
        </div>
      ))}
    </div>
  );
}
