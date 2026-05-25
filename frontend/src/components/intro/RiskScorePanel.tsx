import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

export function RiskScorePanel({ activeScene }: { activeScene: number }) {
  const visible = activeScene === 2;
  const [score, setScore] = useState(visible ? 86 : 0);

  useEffect(() => {
    if (!visible) {
      setScore(0);
      return undefined;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setScore(86);
      return undefined;
    }

    setScore(0);
    const startedAt = window.performance.now();
    const duration = 1500;
    let frameId = 0;
    const animate = () => {
      const elapsed = window.performance.now() - startedAt;
      const progress = Math.min(1, elapsed / duration);
      setScore(Math.round(progress * 86));
      if (progress >= 1) {
        return;
      }
      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frameId);
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <div className={`ls-risk-panel ${visible ? "is-visible" : ""}`} aria-hidden={!visible}>
      <div className="ls-risk-panel-top">
        <span>Risk Score</span>
        <b>{score}</b>
      </div>
      <div className="ls-risk-track">
        <i style={{ transform: `scaleX(${Math.max(0.04, score / 100)})` }} />
      </div>
      <div className="ls-risk-status">
        <ShieldCheck className="h-4 w-4" />
        <span>{score >= 86 ? "MITIGATED" : "CLASSIFYING"}</span>
      </div>
    </div>
  );
}
