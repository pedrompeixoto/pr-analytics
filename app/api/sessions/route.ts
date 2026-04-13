import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Session, DailyAggregate, MonthlyAggregate, WeeklyAggregate } from "@/types";

export async function GET() {
  const db = getDb();

  const sessions = db
    .prepare(
      `SELECT * FROM sessions ORDER BY started_at DESC`
    )
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

  return NextResponse.json({ sessions, dailyAggregates, weeklyAggregates, monthlyAggregates });
}

export async function POST(request: Request) {
  const db = getDb();
  const body = await request.json().catch(() => ({}));

  const stmt = db.prepare(
    `INSERT INTO sessions (pr_url, pr_title, started_at)
     VALUES (?, ?, ?)
     RETURNING *`
  );

  const session = stmt.get(
    body.pr_url ?? null,
    body.pr_title ?? null,
    new Date().toISOString()
  ) as Session;

  return NextResponse.json(session, { status: 201 });
}
