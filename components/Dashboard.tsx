"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Session, DailyAggregate, ReviewStats as ReviewStatsType } from "@/types";
import ReviewStats from "./ReviewStats";
import TimeGraph from "./TimeGraph";
import TimerControls from "./TimerControls";
import SessionHistory from "./SessionHistory";
import StatCard from "./StatCard";

interface DashboardProps {
  initialSessions: Session[];
  initialDailyAggregates: DailyAggregate[];
  initialReviewStats: ReviewStatsType & { error?: string };
}

export default function Dashboard({
  initialSessions,
  initialDailyAggregates,
  initialReviewStats,
}: DashboardProps) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [dailyAggregates, setDailyAggregates] = useState<DailyAggregate[]>(initialDailyAggregates);
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeSession = sessions.find((s) => !s.stopped_at) ?? null;

  // Tick the elapsed timer
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
  }, []);

  const handleStart = useCallback(
    async (prUrl?: string, prTitle?: string) => {
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
    },
    []
  );

  const handleStop = useCallback(async () => {
    if (!activeSession) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sessions/${activeSession.id}`, {
        method: "PATCH",
      });
      const updated: Session = await res.json();
      setSessions((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
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

  // Today's total time
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayMs =
    dailyAggregates.find((d) => d.date === todayStr)?.total_ms ?? 0;

  function formatDuration(ms: number): string {
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">PR Review Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track your code review activity</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ReviewStats stats={initialReviewStats} />
          <StatCard
            title="Time Today"
            value={todayMs > 0 ? formatDuration(todayMs) : "0m"}
            subtitle="Total logged today"
            accent="green"
          />
          <StatCard
            title="Total Sessions"
            value={sessions.filter((s) => s.stopped_at).length}
            subtitle="All time"
            accent="orange"
          />
        </div>

        {/* Timer + Graph */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <TimerControls
              activeSession={activeSession}
              elapsedMs={elapsedMs}
              onStart={handleStart}
              onStop={handleStop}
              isLoading={isLoading}
            />
          </div>
          <div className="lg:col-span-2">
            <TimeGraph dailyAggregates={dailyAggregates} />
          </div>
        </div>

        {/* Session History */}
        <SessionHistory sessions={sessions} onDelete={handleDelete} />
      </div>
    </main>
  );
}
