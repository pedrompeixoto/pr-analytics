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

export interface MonthlyAggregate {
  month: string; // "YYYY-MM"
  total_ms: number;
  session_count: number;
}

export interface WeeklyAggregate {
  week: string; // "YYYY-WW" (ISO week)
  total_ms: number;
  session_count: number;
}

export interface DailyReviewCount {
  date: string; // "YYYY-MM-DD"
  count: number;
}

export interface WeeklyReviewCount {
  week: string; // "YYYY-WW"
  count: number;
}

export interface MonthlyReviewCount {
  month: string; // "YYYY-MM"
  count: number;
}

export interface ReviewStats {
  reviewsThisWeek: number;
  averagePerWeek: number;
  totalReviews: number;
  oldestReviewDate: string | null;
  dailyReviews: DailyReviewCount[];
  weeklyReviews: WeeklyReviewCount[];
  monthlyReviews: MonthlyReviewCount[];
}
