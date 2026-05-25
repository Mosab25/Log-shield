import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

type TimelinePoint = {
  date: string;
  total?: number;
  count?: number;
};

function compactLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function TimelineChart({ data }: { data?: TimelinePoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const labels = data.map(item => compactLabel(item.date));
    const values = data.map(item => Number(item.total ?? item.count ?? 0));
    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, "rgba(55, 138, 221, 0.22)");
    gradient.addColorStop(1, "rgba(55, 138, 221, 0)");

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            data: values,
            borderColor: "#378ADD",
            backgroundColor: gradient,
            fill: true,
            tension: 0.38,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointBackgroundColor: "#378ADD",
            pointBorderColor: "#05070D",
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        onHover: (_event, elements) => {
          const tooltipEl = tooltipRef.current;
          if (!tooltipEl) return;
          if (elements.length) {
            const index = elements[0].index;
            tooltipEl.textContent = `${labels[index]} - ${values[index]} alerts`;
            tooltipEl.style.opacity = "1";
          } else {
            tooltipEl.style.opacity = "0";
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: {
              color: "rgba(255,255,255,0.35)",
              font: { size: 10 },
              maxTicksLimit: 6,
              maxRotation: 0,
            },
            border: { display: false },
          },
          y: {
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: {
              color: "rgba(255,255,255,0.35)",
              font: { size: 10 },
              maxTicksLimit: 5,
            },
            border: { display: false },
            min: 0,
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#8FA3B8",
          fontSize: 12,
        }}
      >
        No data available
      </div>
    );
  }

  return (
    <>
      <div
        ref={tooltipRef}
        style={{
          fontSize: 11,
          color: "#8FA3B8",
          minHeight: 16,
          marginBottom: 6,
          opacity: 0,
          transition: "opacity 150ms",
        }}
      />
      <div style={{ position: "relative", width: "100%", height: "180px" }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Alerts timeline line chart"
          onMouseLeave={() => {
            if (tooltipRef.current) tooltipRef.current.style.opacity = "0";
          }}
        />
      </div>
    </>
  );
}
