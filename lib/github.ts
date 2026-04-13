import { Octokit } from "@octokit/rest";
import type { ReviewStats } from "@/types";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Simple in-process cache: 5-minute TTL
let cachedStats: ReviewStats | null = null;
let cacheExpiresAt = 0;

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function withConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

export async function fetchReviewStats(): Promise<ReviewStats> {
  if (cachedStats && Date.now() < cacheExpiresAt) {
    return cachedStats;
  }

  const username = process.env.GITHUB_USERNAME;
  if (!username) throw new Error("GITHUB_USERNAME is not set");

  // Fetch PRs reviewed in the last 12 weeks
  const since = new Date();
  since.setDate(since.getDate() - 84); // 12 weeks
  const sinceStr = since.toISOString().slice(0, 10);

  const searchResponse = await octokit.search.issuesAndPullRequests({
    q: `type:pr reviewed-by:${username} updated:>=${sinceStr}`,
    sort: "updated",
    order: "desc",
    per_page: 100,
  });

  const items = searchResponse.data.items;

  // For each PR, fetch reviews by this user to get exact timestamps
  const reviewTasks = items.map((item) => async () => {
    const match = item.repository_url.match(/repos\/([^/]+)\/([^/]+)$/);
    if (!match) return null;
    const [, owner, repo] = match;

    try {
      const reviews = await octokit.pulls.listReviews({
        owner,
        repo,
        pull_number: item.number,
      });

      return reviews.data
        .filter(
          (r) =>
            r.user?.login === username &&
            r.state !== "PENDING" &&
            r.submitted_at
        )
        .map((r) => ({
          submitted_at: r.submitted_at as string,
        }));
    } catch {
      return null;
    }
  });

  const reviewResults = await withConcurrencyLimit(reviewTasks, 5);

  const allReviewDates: Date[] = reviewResults
    .flat()
    .filter(Boolean)
    .map((r) => new Date((r as { submitted_at: string }).submitted_at));

  // This week metrics
  const weekStart = getWeekStart(new Date());
  const reviewsThisWeek = allReviewDates.filter((d) => d >= weekStart).length;

  // Average per week over 12 weeks
  const averagePerWeek =
    Math.round((allReviewDates.length / 12) * 10) / 10;

  const stats: ReviewStats = {
    reviewsThisWeek,
    averagePerWeek,
    totalReviews: allReviewDates.length,
    oldestReviewDate: since.toISOString(),
  };

  cachedStats = stats;
  cacheExpiresAt = Date.now() + 5 * 60 * 1000;

  return stats;
}
