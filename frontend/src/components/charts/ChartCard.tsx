import type { ReactNode } from "react";

export function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`chart-card ${className}`.trim()}
      style={{
        background: "#101826",
        border: "1px solid rgba(143,163,184,0.10)",
        borderRadius: 10,
        padding: "16px",
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "#EAF6FF",
            margin: 0,
          }}
        >
          {title}
        </p>
        {subtitle ? (
          <p
            className="chart-subtitle"
            style={{
              fontSize: 11,
              color: "#8FA3B8",
              margin: "2px 0 0",
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
