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
import type { DailyReviewCount, WeeklyReviewCount, MonthlyReviewCount } from "@/types";

interface PRReviewGraphProps {
  dailyReviews: DailyReviewCount[];
  weeklyReviews: WeeklyReviewCount[];
  monthlyReviews: MonthlyReviewCount[];
  dateRange?: { start: string; end: string } | null;
}

type View = "daily" | "weekly" | "monthly";

interface ChartPoint {
  label: string;
  count: number;
}

function fillDailyRange(reviews: DailyReviewCount[], days: number): ChartPoint[] {
  const countMap = new Map(reviews.map((r) => [r.date, r.count]));
  const result: ChartPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    result.push({ label, count: countMap.get(dateStr) ?? 0 });
  }
  return result;
}

function fillSpecificRange(reviews: DailyReviewCount[], start: string, end: string): ChartPoint[] {
  const countMap = new Map(reviews.map((r) => [r.date, r.count]));
  const result: ChartPoint[] = [];
  const current = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");
  while (current <= endDate) {
    const dateStr = current.toISOString().slice(0, 10);
    const label = current.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    result.push({ label, count: countMap.get(dateStr) ?? 0 });
    current.setDate(current.getDate() + 1);
  }
  return result;
}

function buildWeeklyData(reviews: WeeklyReviewCount[]): ChartPoint[] {
  return [...reviews].reverse().map((r) => {
    const [year, week] = r.week.split("-");
    return { label: `W${week} '${year.slice(2)}`, count: r.count };
  });
}

function buildMonthlyData(reviews: MonthlyReviewCount[]): ChartPoint[] {
  return [...reviews].reverse().map((r) => {
    const [year, mon] = r.month.split("-");
    const label = new Date(Number(year), Number(mon) - 1, 1).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    return { label, count: r.count };
  });
}

interface ReviewTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

function ReviewTooltip({ active, payload, label }: ReviewTooltipProps) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md px-3 py-2">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
        {v} {v === 1 ? "PR reviewed" : "PRs reviewed"}
      </p>
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const options: { value: View; label: string }[] = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
  ];
  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 transition-colors ${
            view === o.value
              ? "bg-purple-500 text-white"
              : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function PRReviewGraph({ dailyReviews, weeklyReviews, monthlyReviews, dateRange }: PRReviewGraphProps) {
  const [view, setView] = useState<View>("daily");

  const data: ChartPoint[] =
    view === "daily"
      ? (dateRange ? fillSpecificRange(dailyReviews, dateRange.start, dateRange.end) : fillDailyRange(dailyReviews, 14))
      : view === "weekly"
      ? buildWeeklyData(weeklyReviews)
      : buildMonthlyData(monthlyReviews);

  const hasData = data.some((d) => d.count > 0);
  const xInterval = view === "daily" ? 1 : 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          PRs Reviewed
        </h2>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {!hasData ? (
        <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-sm">
          No GitHub reviews found. Configure GITHUB_TOKEN to see your PR review activity.
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
              interval={xInterval}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ReviewTooltip />} />
            <Bar dataKey="count" fill="#a855f7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
