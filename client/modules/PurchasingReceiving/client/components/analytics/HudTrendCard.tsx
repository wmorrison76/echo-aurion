import { HudCard } from "@/components/analytics/HudCard";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
type TrendPoint = {
  day: string;
  avgConfidence?: number;
  glCoverage?: number;
  lowRate?: number;
  approvals?: number;
};
interface HudTrendCardProps {
  data: TrendPoint[];
  title: string;
  description: string;
  className?: string;
}
const LEGEND_ITEMS = [
  { key: "avgConfidence", label: "Avg Confidence", color: "rgb(56 189 248)" },
  { key: "glCoverage", label: "GL Coverage", color: "rgb(14 165 233)" },
  { key: "lowRate", label: "Low Rate", color: "rgb(248 113 113)" },
  {
    key: "approvals",
    label: "Approvals",
    color:
      "linear-gradient(90deg, rgba(203,213,225,0.75), rgba(94,234,212,0.75))",
  },
] as const;
export function HudTrendCard({
  data,
  title,
  description,
  className,
}: HudTrendCardProps) {
  const chartData = data ?? [];
  const hasData = chartData.length > 0;
  return (
    <HudCard
      title={title}
      description={description}
      className={className}
      bodyClassName="space-y-4 pb-6"
      footerClassName="bg-card"
      footer={
        <div className="flex flex-wrap gap-4 text-xs font-medium uppercase tracking-[0.25em] text-cyan-100/80">
          {" "}
          {LEGEND_ITEMS.map((item) => (
            <div key={item.key} className="flex items-center gap-2">
              {" "}
              <span
                className="h-1.5 w-8 rounded-full"
                style={{ background: item.color }}
              />{" "}
              <span className="tracking-[0.2em] text-cyan-100/70">
                {" "}
                {item.label}{" "}
              </span>{" "}
            </div>
          ))}{" "}
        </div>
      }
    >
      {" "}
      <div className="h-80 overflow-hidden rounded-xl border border-cyan-400/10 bg-card p-3">
        {" "}
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            {" "}
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
            >
              {" "}
              <defs>
                {" "}
                <linearGradient
                  id="approvalsGradient"
                  x1="0"
                  x2="1"
                  y1="0"
                  y2="0"
                >
                  {" "}
                  <stop offset="0%" stopColor="rgba(203,213,225,0.65)" />{" "}
                  <stop offset="100%" stopColor="rgba(94,234,212,0.65)" />{" "}
                </linearGradient>{" "}
              </defs>{" "}
              <CartesianGrid
                stroke="rgba(56,189,248,0.18)"
                strokeDasharray="2 6"
              />{" "}
              <XAxis
                dataKey="day"
                tick={{ fill: "rgba(148, 163, 184, 0.9)", fontSize: 11 }}
                axisLine={{ stroke: "rgba(56,189,248,0.25)" }}
                tickLine={false}
                height={24}
              />{" "}
              <YAxis
                yAxisId="left"
                domain={[0, 1]}
                tickFormatter={(v) => `${Math.round(v * 100)}%`}
                tick={{ fill: "rgba(148, 163, 184, 0.9)", fontSize: 11 }}
                axisLine={{ stroke: "rgba(56,189,248,0.25)" }}
                tickLine={false}
              />{" "}
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: "rgba(148, 163, 184, 0.9)", fontSize: 11 }}
                axisLine={{ stroke: "rgba(56,189,248,0.25)" }}
                tickLine={false}
              />{" "}
              <Tooltip
                cursor={{ stroke: "rgba(34,211,238,0.4)", strokeWidth: 1 }}
                contentStyle={{
                  background: "rgba(2, 6, 23, 0.95)",
                  border: "1px solid rgba(34,211,238,0.4)",
                  borderRadius: "0.75rem",
                  boxShadow: "0 0 25px rgba(8,145,178,0.15)",
                }}
                labelStyle={{
                  color: "rgba(94, 234, 212, 0.9)",
                  fontSize: "0.7rem",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
                itemStyle={{ color: "rgb(226, 232, 240)", fontSize: "0.75rem" }}
                formatter={(value: any, name) => {
                  if (name === "approvals") {
                    return [value, "Approvals"];
                  }
                  const numeric = Number(value);
                  return [
                    `${(numeric * 100).toFixed(1)}%`,
                    LEGEND_ITEMS.find((item) => item.key === name)?.label ??
                      name,
                  ];
                }}
              />{" "}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="avgConfidence"
                stroke="rgb(56 189 248)"
                strokeWidth={2.5}
                dot={false}
                name="avgConfidence"
              />{" "}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="glCoverage"
                stroke="rgb(14 165 233)"
                strokeWidth={2}
                strokeDasharray="6 6"
                dot={false}
                name="glCoverage"
              />{" "}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="lowRate"
                stroke="rgb(248 113 113)"
                strokeWidth={2}
                dot={false}
                name="lowRate"
              />{" "}
              <Bar
                yAxisId="right"
                dataKey="approvals"
                fill="url(#approvalsGradient)"
                radius={[4, 4, 0, 0]}
                maxBarSize={20}
                name="approvals"
              />{" "}
            </ComposedChart>{" "}
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-cyan-100/60">
            {" "}
            No telemetry captured yet.{" "}
          </div>
        )}{" "}
      </div>{" "}
    </HudCard>
  );
}
