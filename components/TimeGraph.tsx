"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DailyAggregate, WeeklyAggregate, MonthlyAggregate } from "@/types";

interface TimeGraphProps {
  dailyAggregates: DailyAggregate[];
  weeklyAggregates: WeeklyAggregate[];
  monthlyAggregates: MonthlyAggregate[];
  dateRange?: { start: string; end: string } | null;
}

type View = "daily" | "weekly" | "monthly";
type Metric = "time" | "sessions";

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fillDateRange(
  aggregates: DailyAggregate[],
  days: number
): { hours: number; sessions: number; label: string }[] {
  const msMap = new Map(aggregates.map((a) => [a.date, a.total_ms]));
  const countMap = new Map(aggregates.map((a) => [a.date, a.session_count]));
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    result.push({
      label,
      hours: (msMap.get(dateStr) ?? 0) / 3_600_000,
      sessions: countMap.get(dateStr) ?? 0,
    });
  }
  return result;
}

function fillSpecificRange(
  aggregates: DailyAggregate[],
  start: string,
  end: string
): { hours: number; sessions: number; label: string }[] {
  const msMap = new Map(aggregates.map((a) => [a.date, a.total_ms]));
  const countMap = new Map(aggregates.map((a) => [a.date, a.session_count]));
  const result = [];
  const current = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");
  while (current <= endDate) {
    const dateStr = current.toISOString().slice(0, 10);
    const label = current.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    result.push({
      label,
      hours: (msMap.get(dateStr) ?? 0) / 3_600_000,
      sessions: countMap.get(dateStr) ?? 0,
    });
    current.setDate(current.getDate() + 1);
  }
  return result;
}

function buildWeeklyData(
  aggregates: WeeklyAggregate[]
): { hours: number; sessions: number; label: string }[] {
  return [...aggregates].reverse().map((a) => {
    const [year, week] = a.week.split("-");
    return {
      label: `W${week} '${year.slice(2)}`,
      hours: a.total_ms / 3_600_000,
      sessions: a.session_count,
    };
  });
}

function buildMonthlyData(
  aggregates: MonthlyAggregate[]
): { hours: number; sessions: number; label: string }[] {
  return [...aggregates].reverse().map((a) => {
    const [year, mon] = a.month.split("-");
    const label = new Date(Number(year), Number(mon) - 1, 1).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    return { label, hours: a.total_ms / 3_600_000, sessions: a.session_count };
  });
}

interface TimeTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

function TimeTooltip({ active, payload, label }: TimeTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md px-3 py-2">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-green-600 dark:text-green-400">
        {formatDuration(payload[0].value * 3_600_000)}
      </p>
    </div>
  );
}

function SessionTooltip({ active, payload, label }: TimeTooltipProps) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md px-3 py-2">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
        {v} {v === 1 ? "session" : "sessions"}
      </p>
    </div>
  );
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  activeColor,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  activeColor: string;
}) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 transition-colors ${
            value === o.value
              ? `${activeColor} text-white`
              : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function TimeGraph({ dailyAggregates, weeklyAggregates, monthlyAggregates, dateRange }: TimeGraphProps) {
  const [view, setView] = useState<View>("daily");
  const [metric, setMetric] = useState<Metric>("time");

  const data =
    view === "daily"
      ? (dateRange ? fillSpecificRange(dailyAggregates, dateRange.start, dateRange.end) : fillDateRange(dailyAggregates, 14))
      : view === "weekly"
      ? buildWeeklyData(weeklyAggregates)
      : buildMonthlyData(monthlyAggregates);

  const hasData = metric === "time" ? data.some((d) => d.hours > 0) : data.some((d) => d.sessions > 0);
  const emptyMsg = "No sessions logged yet. Start a timer to track your review time.";

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Review Activity
          </h2>
          <SegmentedControl
            value={metric}
            onChange={setMetric}
            options={[
              { value: "time", label: "Time" },
              { value: "sessions", label: "Sessions" },
            ]}
            activeColor="bg-green-500"
          />
        </div>
        <SegmentedControl
          value={view}
          onChange={setView}
          options={[
            { value: "daily", label: "D" },
            { value: "weekly", label: "W" },
            { value: "monthly", label: "M" },
          ]}
          activeColor="bg-green-500"
        />
      </div>

      {!hasData ? (
        <div className="flex items-center justify-center h-40 text-gray-400 dark:text-gray-500 text-sm">
          {emptyMsg}
        </div>
      ) : metric === "time" ? (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(v) => `${v.toFixed(1)}h`} tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
            <Tooltip content={<TimeTooltip />} />
            <Bar dataKey="hours" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} />
            <Tooltip content={<SessionTooltip />} />
            <Bar dataKey="sessions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
