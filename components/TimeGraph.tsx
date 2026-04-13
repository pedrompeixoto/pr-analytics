"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DailyAggregate } from "@/types";

interface TimeGraphProps {
  dailyAggregates: DailyAggregate[];
}

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fillDateRange(
  aggregates: DailyAggregate[],
  days: number
): { date: string; hours: number; label: string }[] {
  const map = new Map(aggregates.map((a) => [a.date, a.total_ms]));
  const result = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const ms = map.get(dateStr) ?? 0;
    result.push({ date: dateStr, hours: ms / 3_600_000, label });
  }

  return result;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const ms = payload[0].value * 3_600_000;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md px-3 py-2">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-green-600 dark:text-green-400">{formatDuration(ms)}</p>
    </div>
  );
}

export default function TimeGraph({ dailyAggregates }: TimeGraphProps) {
  const data = fillDateRange(dailyAggregates, 14);
  const hasData = data.some((d) => d.hours > 0);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Time Spent Reviewing
        </h2>
        <span className="text-xs text-gray-400 dark:text-gray-500">Last 14 days</span>
      </div>

      {!hasData ? (
        <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-sm">
          No sessions logged yet. Start a timer below to track your review time.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
              interval={1}
            />
            <YAxis
              tickFormatter={(v) => `${v.toFixed(1)}h`}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="hours" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
