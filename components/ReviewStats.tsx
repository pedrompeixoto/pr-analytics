"use client";

import { useState } from "react";
import StatCard from "./StatCard";
import type { ReviewStats } from "@/types";

interface ReviewStatsProps {
  stats: ReviewStats & { error?: string };
  dateRange?: { start: string; end: string } | null;
}

type Period = "day" | "week" | "month";

function PeriodToggle({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  const options: { value: Period; label: string }[] = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
  ];
  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 transition-colors ${
            period === o.value
              ? "bg-blue-500 text-white"
              : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function ReviewStats({ stats, dateRange }: ReviewStatsProps) {
  const [period, setPeriod] = useState<Period>("week");

  if (stats.error) {
    return (
      <div className="col-span-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <p className="text-sm text-amber-800 dark:text-amber-300">
          <strong>GitHub not connected:</strong> {stats.error}
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          Edit <code>.env.local</code> with your GitHub token and username, then restart the server.
        </p>
      </div>
    );
  }

  // Date range mode: compute totals from the (already-filtered) arrays passed in
  if (dateRange) {
    const totalInRange = stats.dailyReviews.reduce((sum, d) => sum + d.count, 0);
    const start = new Date(dateRange.start + "T00:00:00");
    const end = new Date(dateRange.end + "T00:00:00");
    const daysInRange = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
    const avgPerDay = Math.round((totalInRange / daysInRange) * 10) / 10;

    return (
      <div className="col-span-1 sm:col-span-2">
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            title="PRs Reviewed"
            value={totalInRange}
            subtitle={`${dateRange.start} – ${dateRange.end}`}
            accent="blue"
          />
          <StatCard
            title="Avg Reviews / Day"
            value={avgPerDay}
            subtitle="In selected range"
            accent="purple"
          />
        </div>
      </div>
    );
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonth = new Date().toISOString().slice(0, 7);

  const reviewsToday = stats.dailyReviews.find((d) => d.date === todayStr)?.count ?? 0;
  const reviewsThisMonth = stats.monthlyReviews.find((m) => m.month === currentMonth)?.count ?? 0;

  const avgPerDay = Math.round((stats.totalReviews / 84) * 10) / 10;
  const avgPerMonth = Math.round((stats.totalReviews / (84 / 30.44)) * 10) / 10;

  const config = {
    day: {
      count: reviewsToday,
      countTitle: "PRs Reviewed Today",
      countSubtitle: "Reviews today",
      avg: avgPerDay,
      avgTitle: "Avg Reviews / Day",
      avgSubtitle: "Based on last 12 weeks",
    },
    week: {
      count: stats.reviewsThisWeek,
      countTitle: "PRs Reviewed This Week",
      countSubtitle: "Monday through today",
      avg: stats.averagePerWeek,
      avgTitle: "Avg Reviews / Week",
      avgSubtitle: "Based on last 12 weeks",
    },
    month: {
      count: reviewsThisMonth,
      countTitle: "PRs Reviewed This Month",
      countSubtitle: "This calendar month",
      avg: avgPerMonth,
      avgTitle: "Avg Reviews / Month",
      avgSubtitle: "Based on last 12 weeks",
    },
  }[period];

  return (
    <div className="col-span-1 sm:col-span-2 space-y-2">
      <div className="flex justify-end">
        <PeriodToggle period={period} onChange={setPeriod} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title={config.countTitle}
          value={config.count}
          subtitle={config.countSubtitle}
          accent="blue"
        />
        <StatCard
          title={config.avgTitle}
          value={config.avg}
          subtitle={config.avgSubtitle}
          accent="purple"
        />
      </div>
    </div>
  );
}
