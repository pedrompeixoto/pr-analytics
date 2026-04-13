"use client";

import type { Session } from "@/types";

interface SessionHistoryProps {
  sessions: Session[];
  onDelete: (id: number) => void;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SessionHistory({ sessions, onDelete }: SessionHistoryProps) {
  const completed = sessions.filter((s) => s.stopped_at);

  if (completed.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
          Session History
        </h2>
        <p className="text-sm text-gray-400 dark:text-gray-500">No completed sessions yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6">
      <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
        Session History
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 dark:text-gray-500 border-b dark:border-gray-800">
              <th className="pb-2 pr-4 font-medium">Date</th>
              <th className="pb-2 pr-4 font-medium">PR</th>
              <th className="pb-2 pr-4 font-medium">Duration</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {completed.map((session) => (
              <tr key={session.id} className="group border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {formatDate(session.started_at)}
                </td>
                <td className="py-2 pr-4 max-w-xs truncate">
                  {session.pr_url ? (
                    <a
                      href={session.pr_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 dark:text-blue-400 hover:underline"
                    >
                      {session.pr_title ?? session.pr_url}
                    </a>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">{session.pr_title ?? "—"}</span>
                  )}
                </td>
                <td className="py-2 pr-4 font-mono text-gray-700 dark:text-gray-300">
                  {formatDuration(session.duration_ms)}
                </td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => onDelete(session.id)}
                    title="Delete session"
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-all p-1 rounded"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
