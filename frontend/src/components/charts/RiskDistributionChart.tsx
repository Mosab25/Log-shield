import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";

type RiskBucket = {
  level: string;
  count: number;
};

type RiskItem = {
  label: string;
  value: number;
  color: string;
};

const colors = ["#E24B4A", "#EF9F27", "#378ADD", "#1D9E75"];
const labels = ["Critical", "High", "Medium", "Low"];

function normalizeRiskItems(data?: RiskBucket[]): RiskItem[] {
  const values = new Map((data ?? []).map(item => [String(item.level).toLowerCase(), Number(item.count) || 0]));
  return labels.map((label, index) => ({
    label,
    value: values.get(label.toLowerCase()) ?? 0,
    color: colors[index],
  }));
}

export function RiskDistributionChart({ data }: { data?: RiskBucket[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const riskItems = useMemo(() => normalizeRiskItems(data), [data]);
  const total = riskItems.reduce((sum, item) => sum + item.value, 0);
  const [centerState, setCenterState] = useState({
    value: total,
    label: "events",
    color: "#EAF6FF",
  });

  useEffect(() => {
    setCenterState({ value: total, label: "events", color: "#EAF6FF" });
  }, [total]);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const values = riskItems.map(item => item.value);

    chartRef.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            hoverBackgroundColor: colors,
            borderWidth: 2,
            borderColor: "#05070D",
            hoverBorderColor: "#05070D",
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        onHover: (_event, elements) => {
          if (elements.length) {
            const index = elements[0].index;
            setCenterState({
              value: riskItems[index].value,
              label: riskItems[index].label.toLowerCase(),
              color: riskItems[index].color,
            });
          } else {
            setCenterState({ value: total, label: "events", color: "#EAF6FF" });
          }
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
  }, [riskItems, total]);

  function highlightSegment(index: number) {
    if (!chartRef.current) return;
    const meta = chartRef.current.getDatasetMeta(0);
    meta.data.forEach((arc, currentIndex) => {
      arc.options.offset = currentIndex === index ? 8 : 0;
    });
    chartRef.current.update("none");
    setCenterState({
      value: riskItems[index].value,
      label: riskItems[index].label.toLowerCase(),
      color: riskItems[index].color,
    });
  }

  function resetHighlight() {
    if (!chartRef.current) return;
    const meta = chartRef.current.getDatasetMeta(0);
    meta.data.forEach(arc => {
      arc.options.offset = 0;
    });
    chartRef.current.update("none");
    setCenterState({ value: total, label: "events", color: "#EAF6FF" });
  }

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <div style={{ position: "relative", width: 130, height: 130, flexShrink: 0 }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Risk distribution doughnut chart"
          onMouseLeave={resetHighlight}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 500, color: centerState.color }}>{centerState.value}</span>
          <span style={{ fontSize: 10, color: "#8FA3B8" }}>{centerState.label}</span>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        {riskItems.map((item, index) => (
          <div
            key={item.label}
            onMouseEnter={() => highlightSegment(index)}
            onMouseLeave={resetHighlight}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              padding: "3px 6px",
              borderRadius: 5,
              transition: "background 150ms",
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: item.color,
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, fontSize: 12 }}>{item.label}</span>
            <span style={{ fontSize: 11, color: "#8FA3B8" }}>
              {total > 0 ? Math.round((item.value / total) * 100) : 0}%
            </span>
            <span style={{ fontWeight: 500, minWidth: 18, textAlign: "right" }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
