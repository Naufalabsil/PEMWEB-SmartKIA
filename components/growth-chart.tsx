"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { GrowthMode, GrowthPoint } from "@/lib/types";

interface GrowthChartProps {
  data: GrowthPoint[];
  mode: GrowthMode;
}

export function GrowthChart({ data, mode }: GrowthChartProps) {
  const axisLabel = mode === "bbu" ? "Usia bulan" : "Panjang/Tinggi cm";

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="#edf2ef" strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="x"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#94a59d", fontSize: 11, fontWeight: 700 }}
            label={{
              value: axisLabel,
              position: "insideBottom",
              offset: -2,
              fill: "#94a59d",
              fontSize: 11,
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#94a59d", fontSize: 11, fontWeight: 700 }}
            width={42}
          />
          <Tooltip content={<GrowthTooltip mode={mode} />} cursor={{ stroke: "#bfe8d7" }} />
          <Legend
            verticalAlign="bottom"
            height={30}
            iconType="plainline"
            wrapperStyle={{ color: "#6b8077", fontSize: 11, fontWeight: 800 }}
          />
          <Line
            type="monotone"
            name="P3/P97"
            dataKey="p3"
            stroke="#8edbc0"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
          />
          <Line
            type="monotone"
            name="Median P50"
            dataKey="p50"
            stroke="#34b889"
            strokeWidth={3}
            dot={false}
          />
          <Line
            type="monotone"
            name="P97"
            dataKey="p97"
            stroke="#8edbc0"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            legendType="none"
          />
          <Line
            type="monotone"
            name="Data anak"
            dataKey="anak"
            stroke="#ff865e"
            strokeWidth={2}
            dot={{ r: 4, fill: "#ff865e", stroke: "#fff", strokeWidth: 2 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function GrowthTooltip({
  active,
  payload,
  label,
  mode,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; payload: GrowthPoint }>;
  label?: string | number;
  mode: GrowthMode;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0].payload;
  const anak = payload.find((item) => item.dataKey === "anak")?.value;

  return (
    <div
      style={{
        minWidth: 150,
        border: "1px solid #dcebe4",
        borderRadius: 12,
        padding: 10,
        background: "#fff",
        boxShadow: "0 12px 28px rgba(33, 65, 52, 0.14)",
      }}
    >
      <strong style={{ display: "block", marginBottom: 5 }}>
        {mode === "bbu" ? "Usia" : "PB/TB"} {label}
        {mode === "bbu" ? " bulan" : " cm"}
      </strong>
      <small style={{ display: "block", color: "#6f8179" }}>Median WHO: {point.p50} kg</small>
      {anak ? <small style={{ display: "block", color: "#ff7654" }}>Anak: {anak} kg</small> : null}
      {point.zscore !== undefined ? (
        <small style={{ display: "block", color: "#06a66a" }}>Z-score: {point.zscore}</small>
      ) : null}
    </div>
  );
}
