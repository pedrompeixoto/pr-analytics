import StatCard from "./StatCard";
import type { ReviewStats } from "@/types";

interface ReviewStatsProps {
  stats: ReviewStats & { error?: string };
}

export default function ReviewStats({ stats }: ReviewStatsProps) {
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

  return (
    <>
      <StatCard
        title="PRs Reviewed This Week"
        value={stats.reviewsThisWeek}
        subtitle="Monday through today"
        accent="blue"
      />
      <StatCard
        title="Avg Reviews / Week"
        value={stats.averagePerWeek}
        subtitle="Based on last 12 weeks"
        accent="purple"
      />
    </>
  );
}
