"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  LEAD: "#94a3b8",
  QUALIFIED: "#f59e0b",
  CUSTOMER: "#10b981",
  CHURNED: "#ef4444",
};

const STAGE_COLORS = [
  "#94a3b8",
  "#0ea5e9",
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
];

function formatUSDCompact(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export default function AnalyticsCharts({
  statusData,
  stageData,
  industryData,
  monthlyContacts,
}: {
  statusData: { name: string; value: number }[];
  stageData: { stage: string; count: number; value: number }[];
  industryData: { industry: string; revenue: number }[];
  monthlyContacts: { month: string; contacts: number }[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          Pipeline Value by Stage
        </h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="stage"
                tick={{ fontSize: 11, fill: "#64748b" }}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickFormatter={formatUSDCompact}
              />
              <Tooltip
                formatter={(v: number) => formatUSDCompact(v)}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {stageData.map((_, i) => (
                  <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          Contacts by Status
        </h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {statusData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={STATUS_COLORS[entry.name] ?? "#94a3b8"}
                  />
                ))}
              </Pie>
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          New Contacts (Last 6 Months)
        </h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyContacts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#64748b" }}
              />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="contacts"
                stroke="#3b62ff"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#3b62ff" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">
          Revenue by Industry
        </h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={industryData} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickFormatter={formatUSDCompact}
              />
              <YAxis
                type="category"
                dataKey="industry"
                tick={{ fontSize: 11, fill: "#64748b" }}
                width={110}
              />
              <Tooltip
                formatter={(v: number) => formatUSDCompact(v)}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="revenue"
                fill="#3b62ff"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
