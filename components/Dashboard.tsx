"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Session, DailyAggregate, MonthlyAggregate, WeeklyAggregate, ReviewStats as ReviewStatsType } from "@/types";
import ReviewStats from "./ReviewStats";
import TimeGraph from "./TimeGraph";
import PRReviewGraph from "./PRReviewGraph";
import TimerControls from "./TimerControls";
import SessionHistory from "./SessionHistory";
import StatCard from "./StatCard";
import DateRangeFilter from "./DateRangeFilter";

interface DashboardProps {
  initialSessions: Session[];
  initialDailyAggregates: DailyAggregate[];
  initialWeeklyAggregates: WeeklyAggregate[];
  initialMonthlyAggregates: MonthlyAggregate[];
  initialReviewStats: ReviewStatsType & { error?: string };
}

function weekKey(d: Date): string {
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((d.getTime() - startOfYear.getTime()) / 86_400_000);
  const weekNum = Math.floor((dayOfYear + startOfYear.getDay()) / 7);
  return `${d.getFullYear()}-${String(weekNum).padStart(2, "0")}`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
      {children}
    </p>
  );
}

export default function Dashboard({
  initialSessions,
  initialDailyAggregates,
  initialWeeklyAggregates,
  initialMonthlyAggregates,
  initialReviewStats,
}: DashboardProps) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [dailyAggregates, setDailyAggregates] = useState<DailyAggregate[]>(initialDailyAggregates);
  const [weeklyAggregates, setWeeklyAggregates] = useState<WeeklyAggregate[]>(initialWeeklyAggregates);
  const [monthlyAggregates, setMonthlyAggregates] = useState<MonthlyAggregate[]>(initialMonthlyAggregates);
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeSession = sessions.find((s) => !s.stopped_at) ?? null;

  useEffect(() => {
    if (activeSession) {
      const updateElapsed = () => {
        setElapsedMs(Date.now() - new Date(activeSession.started_at).getTime());
      };
      updateElapsed();
      intervalRef.current = setInterval(updateElapsed, 1000);
    } else {
      setElapsedMs(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeSession?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshSessions = useCallback(async () => {
    const res = await fetch("/api/sessions");
    const data = await res.json();
    setSessions(data.sessions);
    setDailyAggregates(data.dailyAggregates);
    setWeeklyAggregates(data.weeklyAggregates);
    setMonthlyAggregates(data.monthlyAggregates);
  }, []);

  const handleStart = useCallback(async (prUrl?: string, prTitle?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pr_url: prUrl, pr_title: prTitle }),
      });
      const session: Session = await res.json();
      setSessions((prev) => [session, ...prev]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleStop = useCallback(async () => {
    if (!activeSession) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sessions/${activeSession.id}`, { method: "PATCH" });
      const updated: Session = await res.json();
      setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      await refreshSessions();
    } finally {
      setIsLoading(false);
    }
  }, [activeSession, refreshSessions]);

  const handleDelete = useCallback(async (id: number) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    await refreshSessions();
  }, [refreshSessions]);

  // Active date range
  const dr =
    rangeStart && rangeEnd && rangeStart <= rangeEnd
      ? { start: rangeStart, end: rangeEnd }
      : null;

  // Filtered data
  const filteredSessions = dr
    ? sessions.filter((s) => {
        const d = s.started_at.slice(0, 10);
        return d >= dr.start && d <= dr.end;
      })
    : sessions;

  const filteredDailyAgg = dr
    ? dailyAggregates.filter((d) => d.date >= dr.start && d.date <= dr.end)
    : dailyAggregates;

  const filteredWeeklyAgg = dr
    ? (() => {
        const startWk = weekKey(new Date(dr.start + "T00:00:00"));
        const endWk = weekKey(new Date(dr.end + "T00:00:00"));
        return weeklyAggregates.filter((w) => w.week >= startWk && w.week <= endWk);
      })()
    : weeklyAggregates;

  const filteredMonthlyAgg = dr
    ? monthlyAggregates.filter(
        (m) => m.month >= dr.start.slice(0, 7) && m.month <= dr.end.slice(0, 7)
      )
    : monthlyAggregates;

  const filteredDailyReviews = dr
    ? (initialReviewStats.dailyReviews ?? []).filter((r) => r.date >= dr.start && r.date <= dr.end)
    : (initialReviewStats.dailyReviews ?? []);

  const filteredWeeklyReviews = dr
    ? (() => {
        const startWk = weekKey(new Date(dr.start + "T00:00:00"));
        const endWk = weekKey(new Date(dr.end + "T00:00:00"));
        return (initialReviewStats.weeklyReviews ?? []).filter(
          (w) => w.week >= startWk && w.week <= endWk
        );
      })()
    : (initialReviewStats.weeklyReviews ?? []);

  const filteredMonthlyReviews = dr
    ? (initialReviewStats.monthlyReviews ?? []).filter(
        (m) => m.month >= dr.start.slice(0, 7) && m.month <= dr.end.slice(0, 7)
      )
    : (initialReviewStats.monthlyReviews ?? []);

  const filteredReviewStats = {
    ...initialReviewStats,
    dailyReviews: filteredDailyReviews,
    weeklyReviews: filteredWeeklyReviews,
    monthlyReviews: filteredMonthlyReviews,
  };

  // Stat card values
  const todayStr = new Date().toISOString().slice(0, 10);
  const timeMs = dr
    ? filteredDailyAgg.reduce((sum, d) => sum + d.total_ms, 0)
    : (dailyAggregates.find((d) => d.date === todayStr)?.total_ms ?? 0);
  const timeLabel = dr ? "Time in Range" : "Time Today";
  const timeSubtitle = dr ? `${dr.start} – ${dr.end}` : "Total logged today";
  const sessionCount = filteredSessions.filter((s) => s.stopped_at).length;
  const sessionSubtitle = dr ? "In selected range" : "All time";

  function formatDuration(ms: number): string {
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">PR Review Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track your code review activity</p>
        </div>

        {/* Date filter */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm px-5 py-3.5 flex items-center gap-3">
          <DateRangeFilter
            start={rangeStart}
            end={rangeEnd}
            onChange={(s, e) => { setRangeStart(s); setRangeEnd(e); }}
            onClear={() => { setRangeStart(""); setRangeEnd(""); }}
          />
          {!dr && (
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
              Showing all-time data — set a range to filter
            </span>
          )}
        </div>

        {/* Overview */}
        <div className="space-y-3">
          <SectionLabel>Overview</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReviewStats stats={filteredReviewStats} dateRange={dr} />
            <StatCard
              title={timeLabel}
              value={timeMs > 0 ? formatDuration(timeMs) : "0m"}
              subtitle={timeSubtitle}
              accent="green"
            />
            <StatCard
              title="Total Sessions"
              value={sessionCount}
              subtitle={sessionSubtitle}
              accent="orange"
            />
          </div>
        </div>

        {/* Activity */}
        <div className="space-y-3">
          <SectionLabel>Activity</SectionLabel>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timer */}
            <TimerControls
              activeSession={activeSession}
              elapsedMs={elapsedMs}
              onStart={handleStart}
              onStop={handleStop}
              isLoading={isLoading}
            />
            {/* Charts */}
            <div className="lg:col-span-2 space-y-6">
              <TimeGraph
                dailyAggregates={filteredDailyAgg}
                weeklyAggregates={filteredWeeklyAgg}
                monthlyAggregates={filteredMonthlyAgg}
                dateRange={dr}
              />
              <PRReviewGraph
                dailyReviews={filteredDailyReviews}
                weeklyReviews={filteredWeeklyReviews}
                monthlyReviews={filteredMonthlyReviews}
                dateRange={dr}
              />
            </div>
          </div>
        </div>

        {/* History */}
        <div className="space-y-3">
          <SectionLabel>History</SectionLabel>
          <SessionHistory sessions={filteredSessions} onDelete={handleDelete} />
        </div>

      </div>
    </main>
  );
}
