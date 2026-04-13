import { Octokit } from "@octokit/rest";
import type { ReviewStats, DailyReviewCount, WeeklyReviewCount, MonthlyReviewCount } from "@/types";

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
    console.log(`[github] returning cached stats (expires in ${Math.round((cacheExpiresAt - Date.now()) / 1000)}s)`);
    return cachedStats;
  }

  const username = process.env.GITHUB_USERNAME;
  if (!username) throw new Error("GITHUB_USERNAME is not set");

  // Fetch PRs reviewed in the last 12 weeks
  const since = new Date();
  since.setDate(since.getDate() - 84); // 12 weeks
  const sinceStr = since.toISOString().slice(0, 10);

  console.log(`[github] search query: type:pr reviewed-by:${username} updated:>=${sinceStr}`);
  const searchResponse = await octokit.search.issuesAndPullRequests({
    q: `type:pr reviewed-by:${username} updated:>=${sinceStr}`,
    sort: "updated",
    order: "desc",
    per_page: 100,
  });

  const items = searchResponse.data.items;
  console.log(`[github] search returned ${items.length} PRs (total_count=${searchResponse.data.total_count})`);

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

      const myReviews = reviews.data.filter(
        (r) =>
          r.user?.login === username &&
          r.state !== "PENDING" &&
          r.submitted_at
      );

      console.log(`[github] ${owner}/${repo}#${item.number}: ${reviews.data.length} total reviews, ${myReviews.length} by ${username}`);

      return myReviews.map((r) => ({
        submitted_at: r.submitted_at as string,
      }));
    } catch (err) {
      console.error(`[github] failed to fetch reviews for ${owner}/${repo}#${item.number}:`, err);
      return null;
    }
  });

  const reviewResults = await withConcurrencyLimit(reviewTasks, 5);

  const allReviewDates: Date[] = reviewResults
    .flat()
    .filter(Boolean)
    .map((r) => new Date((r as { submitted_at: string }).submitted_at));

  console.log(`[github] total review events collected: ${allReviewDates.length}`);

  // This week metrics
  const weekStart = getWeekStart(new Date());
  const reviewsThisWeek = allReviewDates.filter((d) => d >= weekStart).length;

  // Average per week over 12 weeks
  const averagePerWeek =
    Math.round((allReviewDates.length / 12) * 10) / 10;

  // Daily aggregates
  const dailyMap = new Map<string, number>();
  for (const d of allReviewDates) {
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
  }
  const dailyReviews: DailyReviewCount[] = Array.from(dailyMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);

  // Weekly aggregates — week key matches SQLite strftime('%Y-%W')
  function getWeekKey(d: Date): string {
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((d.getTime() - startOfYear.getTime()) / 86_400_000);
    const weekNum = Math.floor((dayOfYear + startOfYear.getDay()) / 7);
    return `${d.getFullYear()}-${String(weekNum).padStart(2, "0")}`;
  }
  const weeklyMap = new Map<string, number>();
  for (const d of allReviewDates) {
    const key = getWeekKey(d);
    weeklyMap.set(key, (weeklyMap.get(key) ?? 0) + 1);
  }
  const weeklyReviews: WeeklyReviewCount[] = Array.from(weeklyMap.entries())
    .map(([week, count]) => ({ week, count }))
    .sort((a, b) => b.week.localeCompare(a.week))
    .slice(0, 52);

  // Monthly aggregates
  const monthlyMap = new Map<string, number>();
  for (const d of allReviewDates) {
    const key = d.toISOString().slice(0, 7);
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + 1);
  }
  const monthlyReviews: MonthlyReviewCount[] = Array.from(monthlyMap.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 24);

  const stats: ReviewStats = {
    reviewsThisWeek,
    averagePerWeek,
    totalReviews: allReviewDates.length,
    oldestReviewDate: since.toISOString(),
    dailyReviews,
    weeklyReviews,
    monthlyReviews,
  };

  console.log(`[github] stats: reviewsThisWeek=${stats.reviewsThisWeek}, averagePerWeek=${stats.averagePerWeek}, total=${stats.totalReviews}`);

  cachedStats = stats;
  cacheExpiresAt = Date.now() + 5 * 60 * 1000;

  return stats;
}
