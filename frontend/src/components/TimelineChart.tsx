import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function TimelineChart({ data }: { data: Array<{ date: string; total: number }> }) {
  return (
    <div className="soc-panel h-80 p-5">
      <h2 className="text-lg font-bold text-white">Alerts Timeline</h2>
      <ResponsiveContainer width="100%" height="85%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="timelineFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#67e8f9" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.12)" />
          <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
          <Tooltip contentStyle={{ background: "#020617", border: "1px solid #1e293b", borderRadius: "16px" }} />
          <Area type="monotone" dataKey="total" stroke="#67e8f9" fill="url(#timelineFill)" strokeWidth={2.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
