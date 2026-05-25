import type { CSSProperties } from "react";
import { FileCode2, Network, RadioTower } from "lucide-react";

const packets = [
  { label: "185.44.21.9", icon: Network, className: "packet-one" },
  { label: "91.203.15.44", icon: Network, className: "packet-two" },
  { label: "203.0.113.17", icon: Network, className: "packet-three" },
  { label: "POST /login", icon: RadioTower, className: "packet-four" },
  { label: "GET /admin", icon: RadioTower, className: "packet-five" },
  { label: "payload.js", icon: FileCode2, className: "packet-six" },
];

export function CinematicEffects({ activeScene }: { activeScene: number }) {
  const detecting = activeScene === 1;
  const defending = activeScene === 2;

  if (!detecting && !defending) {
    return null;
  }

  return (
    <div className={`ls-cinematic-effects ${detecting ? "is-detecting" : ""} ${defending ? "is-defending" : ""}`} aria-hidden="true">
      <div className="ls-ken-burns-layer" />

      {detecting ? (
        <>
          <div className="ls-scan-beams">
            <span />
            <span />
          </div>
          <div className="ls-floating-packets">
            {packets.map(({ label, icon: Icon, className }, index) => (
              <div key={label} className={`ls-floating-packet ${className}`} style={{ "--delay": `${0.4 + index * 0.22}s` } as CSSProperties}>
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="ls-alert-pulses">
            <span />
            <span />
            <span />
          </div>
          <div className="ls-particle-burst ls-particle-burst-detect">
            {Array.from({ length: 10 }).map((_, index) => (
              <i key={index} style={{ "--angle": `${index * 36}deg`, "--delay": `${1.15 + index * 0.03}s` } as CSSProperties} />
            ))}
          </div>
          <div className="ls-vignette-pulse ls-vignette-threat" />
        </>
      ) : null}

      {defending ? (
        <>
          <div className="ls-shield-rings">
            <span />
            <span />
            <span />
          </div>
          <div className="ls-data-streams">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="ls-particle-burst ls-particle-burst-block">
            {Array.from({ length: 12 }).map((_, index) => (
              <i key={index} style={{ "--angle": `${index * 30}deg`, "--delay": `${0.5 + index * 0.035}s` } as CSSProperties} />
            ))}
          </div>
          <div className="ls-vignette-pulse ls-vignette-defense" />
        </>
      ) : null}
    </div>
  );
}
