import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS: Record<string, string> = { low: "#34d399", medium: "#f59e0b", high: "#fb923c", critical: "#f87171" };

export function RiskDistributionChart({ data }: { data: Array<{ level: string; count: number }> }) {
  return (
    <div className="soc-panel h-80 p-5">
      <h2 className="text-lg font-bold text-white">Risk Distribution</h2>
      <ResponsiveContainer width="100%" height="75%">
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="level" innerRadius={55} outerRadius={95} paddingAngle={4}>
            {data.map(item => <Cell key={item.level} fill={COLORS[item.level] ?? "#94a3b8"} />)}
          </Pie>
          <Tooltip contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: "16px" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
