import { Database, ShieldCheck, Server } from "lucide-react";

export function SecurityCore({ activeScene }: { activeScene: number }) {
  const defending = activeScene >= 2;
  const threatened = activeScene === 1;
  const final = activeScene === 4;
  const showInfrastructureLabels = activeScene === 0;

  return (
    <div className={`ls-core-stage ${defending ? "is-defending" : ""} ${threatened ? "is-threatened" : ""} ${final ? "is-final" : ""}`} aria-hidden="true">
      <div className="ls-core-grid" />
      <div className="ls-core-ring ls-core-ring-one" />
      <div className="ls-core-ring ls-core-ring-two" />
      <div className="ls-core-shield-shell">
        <span className="ls-core-shield-pulse" />
        <div className="ls-core-object">
          <ShieldCheck className="ls-core-shield-icon" />
          <div className="ls-core-server-lines">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
      {showInfrastructureLabels ? (
        <>
          <div className="ls-core-side ls-core-side-left">
            <Server className="h-5 w-5" />
            <span>LOG</span>
          </div>
          <div className="ls-core-side ls-core-side-right">
            <Database className="h-5 w-5" />
            <span>SIEM</span>
          </div>
        </>
      ) : null}
    </div>
  );
}
