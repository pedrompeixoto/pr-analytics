export interface Session {
  id: number;
  pr_url: string | null;
  pr_title: string | null;
  started_at: string;
  stopped_at: string | null;
  duration_ms: number | null;
}

export interface DailyAggregate {
  date: string; // "YYYY-MM-DD"
  total_ms: number;
  session_count: number;
}

export interface ReviewStats {
  reviewsThisWeek: number;
  averagePerWeek: number;
  totalReviews: number;
  oldestReviewDate: string | null;
}
