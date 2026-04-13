import { getDb } from "@/lib/db";
import type { Session, DailyAggregate, MonthlyAggregate, WeeklyAggregate, ReviewStats } from "@/types";
import Dashboard from "@/components/Dashboard";

async function getSessions(): Promise<{ sessions: Session[]; dailyAggregates: DailyAggregate[]; weeklyAggregates: WeeklyAggregate[]; monthlyAggregates: MonthlyAggregate[] }> {
  const db = getDb();
  const sessions = db
    .prepare(`SELECT * FROM sessions ORDER BY started_at DESC`)
    .all() as Session[];
  const dailyAggregates = db
    .prepare(
      `SELECT
        DATE(started_at) as date,
        SUM(duration_ms) as total_ms,
        COUNT(*) as session_count
       FROM sessions
       WHERE stopped_at IS NOT NULL
       GROUP BY DATE(started_at)
       ORDER BY date DESC
       LIMIT 30`
    )
    .all() as DailyAggregate[];
  const monthlyAggregates = db
    .prepare(
      `SELECT
        strftime('%Y-%m', started_at) as month,
        SUM(duration_ms) as total_ms,
        COUNT(*) as session_count
       FROM sessions
       WHERE stopped_at IS NOT NULL
       GROUP BY strftime('%Y-%m', started_at)
       ORDER BY month DESC
       LIMIT 24`
    )
    .all() as MonthlyAggregate[];
  const weeklyAggregates = db
    .prepare(
      `SELECT
        strftime('%Y-%W', started_at) as week,
        SUM(duration_ms) as total_ms,
        COUNT(*) as session_count
       FROM sessions
       WHERE stopped_at IS NOT NULL
       GROUP BY strftime('%Y-%W', started_at)
       ORDER BY week DESC
       LIMIT 52`
    )
    .all() as WeeklyAggregate[];
  return { sessions, dailyAggregates, weeklyAggregates, monthlyAggregates };
}

async function getReviewStats(): Promise<ReviewStats & { error?: string }> {
  try {
    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    const res = await fetch(`${base}/api/github/reviews`, {
      next: { revalidate: 300 },
    });
    return res.json();
  } catch {
    return {
      reviewsThisWeek: 0,
      averagePerWeek: 0,
      totalReviews: 0,
      oldestReviewDate: null,
      dailyReviews: [],
      weeklyReviews: [],
      monthlyReviews: [],
      error: "Failed to fetch GitHub stats",
    };
  }
}

export default async function Home() {
  const [{ sessions, dailyAggregates, weeklyAggregates, monthlyAggregates }, reviewStats] = await Promise.all([
    getSessions(),
    getReviewStats(),
  ]);

  return (
    <Dashboard
      initialSessions={sessions}
      initialDailyAggregates={dailyAggregates}
      initialWeeklyAggregates={weeklyAggregates}
      initialMonthlyAggregates={monthlyAggregates}
      initialReviewStats={reviewStats}
    />
  );
}
