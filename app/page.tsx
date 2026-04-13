import { getDb } from "@/lib/db";
import type { Session, DailyAggregate, ReviewStats } from "@/types";
import Dashboard from "@/components/Dashboard";

async function getSessions(): Promise<{ sessions: Session[]; dailyAggregates: DailyAggregate[] }> {
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
  return { sessions, dailyAggregates };
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
      error: "Failed to fetch GitHub stats",
    };
  }
}

export default async function Home() {
  const [{ sessions, dailyAggregates }, reviewStats] = await Promise.all([
    getSessions(),
    getReviewStats(),
  ]);

  return (
    <Dashboard
      initialSessions={sessions}
      initialDailyAggregates={dailyAggregates}
      initialReviewStats={reviewStats}
    />
  );
}
