import { useMemo } from "react";

type TimelinePoint = {
  date: string;
  total: number;
};

function compactLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function TimelineChart({ data }: { data: TimelinePoint[] }) {
  const chart = useMemo(() => {
    const width = 640;
    const height = 220;
    const padding = { top: 24, right: 18, bottom: 34, left: 42 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const maxTotal = Math.max(1, ...data.map(item => Number(item.total) || 0));
    const baseline = padding.top + innerHeight;
    const points = data.map((item, index) => {
      const x = padding.left + (data.length === 1 ? innerWidth / 2 : (index / (data.length - 1)) * innerWidth);
      const y = padding.top + (1 - (Number(item.total) || 0) / maxTotal) * innerHeight;
      return { ...item, x, y };
    });
    const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
    const areaPath = points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${baseline} L ${points[0].x.toFixed(2)} ${baseline} Z`
      : "";
    const ticks = [0, Math.ceil(maxTotal / 2), maxTotal];

    return { width, height, padding, innerWidth, innerHeight, maxTotal, baseline, points, linePath, areaPath, ticks };
  }, [data]);

  const xLabels = chart.points.length > 0
    ? [chart.points[0], chart.points[Math.floor(chart.points.length / 2)], chart.points[chart.points.length - 1]]
    : [];

  return (
    <div className="h-[15rem] w-full">
      <svg className="h-full w-full overflow-visible" viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label="Alerts timeline chart">
        <defs>
          <linearGradient id="timelineFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {chart.ticks.map(tick => {
          const y = chart.padding.top + (1 - tick / chart.maxTotal) * chart.innerHeight;
          return (
            <g key={tick}>
              <line x1={chart.padding.left} x2={chart.padding.left + chart.innerWidth} y1={y} y2={y} stroke="var(--border)" strokeDasharray="4 5" />
              <text x={chart.padding.left - 10} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize="12">{tick}</text>
            </g>
          );
        })}
        {chart.areaPath ? <path d={chart.areaPath} fill="url(#timelineFill)" /> : null}
        {chart.linePath ? <path d={chart.linePath} fill="none" stroke="var(--brand)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" /> : null}
        {chart.points.map(point => (
          <circle key={`${point.date}-${point.x}`} cx={point.x} cy={point.y} r="3.5" fill="var(--bg-base)" stroke="var(--brand)" strokeWidth="2">
            <title>{`${compactLabel(point.date)}: ${point.total}`}</title>
          </circle>
        ))}
        {xLabels.map((point, index) => (
          <text key={`${point.date}-${index}`} x={point.x} y={chart.height - 9} textAnchor={index === 0 ? "start" : index === xLabels.length - 1 ? "end" : "middle"} fill="var(--text-muted)" fontSize="12">
            {compactLabel(point.date)}
          </text>
        ))}
      </svg>
    </div>
  );
}
