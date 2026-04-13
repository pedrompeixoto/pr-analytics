import { NextResponse } from "next/server";
import { fetchReviewStats } from "@/lib/github";

export async function GET() {
  if (!process.env.GITHUB_TOKEN || process.env.GITHUB_TOKEN === "your_github_personal_access_token_here") {
    return NextResponse.json(
      {
        reviewsThisWeek: 0,
        averagePerWeek: 0,
        totalReviews: 0,
        oldestReviewDate: null,
        error: "GitHub token not configured. Add GITHUB_TOKEN and GITHUB_USERNAME to .env.local",
      },
      { status: 200 }
    );
  }

  try {
    const stats = await fetchReviewStats();
    return NextResponse.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
