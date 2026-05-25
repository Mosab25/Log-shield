import { useMemo } from "react";

const COLORS: Record<string, string> = {
  low: "var(--brand)",
  medium: "var(--status-warning)",
  high: "var(--status-critical)",
  critical: "var(--status-critical)",
};

type RiskBucket = {
  level: string;
  count: number;
};

export function RiskDistributionChart({ data }: { data: RiskBucket[] }) {
  const chart = useMemo(() => {
    const radius = 72;
    const circumference = 2 * Math.PI * radius;
    const total = Math.max(0, data.reduce((sum, item) => sum + (Number(item.count) || 0), 0));
    let offset = 0;
    const segments = data
      .filter(item => Number(item.count) > 0)
      .map(item => {
        const value = Number(item.count) || 0;
        const length = total > 0 ? (value / total) * circumference : 0;
        const segment = { ...item, value, length, offset };
        offset += length;
        return segment;
      });

    return { radius, circumference, total, segments };
  }, [data]);

  return (
    <div className="grid h-[15rem] grid-cols-[minmax(10rem,1fr)_minmax(8rem,0.85fr)] items-center gap-5">
      <svg className="mx-auto h-full max-h-52 w-full max-w-52" viewBox="0 0 200 200" role="img" aria-label="Risk distribution chart">
        <circle cx="100" cy="100" r={chart.radius} fill="none" stroke="var(--border)" strokeWidth="24" />
        {chart.segments.map(segment => (
          <circle
            key={segment.level}
            cx="100"
            cy="100"
            r={chart.radius}
            fill="none"
            stroke={COLORS[segment.level] ?? "var(--text-muted)"}
            strokeDasharray={`${segment.length} ${chart.circumference - segment.length}`}
            strokeDashoffset={-segment.offset}
            strokeLinecap="butt"
            strokeWidth="24"
            transform="rotate(-90 100 100)"
          >
            <title>{`${segment.level}: ${segment.value}`}</title>
          </circle>
        ))}
        <text x="100" y="94" textAnchor="middle" fill="var(--text-primary)" fontSize="30" fontWeight="900">{chart.total}</text>
        <text x="100" y="116" textAnchor="middle" fill="var(--text-muted)" fontSize="12" fontWeight="700">events</text>
      </svg>
      <div className="space-y-2">
        {data.map(item => (
          <div key={item.level} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]/40 px-3 py-2 text-sm">
            <span className="flex items-center gap-2 font-semibold capitalize text-[var(--text-primary)]">
              <i className={`h-2.5 w-2.5 rounded-full ${item.level === "low" ? "bg-[var(--brand)]" : item.level === "medium" ? "bg-[var(--status-warning)]" : "bg-[var(--status-critical)]"}`} />
              {item.level}
            </span>
            <b className="text-[var(--text-primary)]">{item.count}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
