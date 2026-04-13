"use client";

import { useState } from "react";
import type { Session } from "@/types";

interface TimerControlsProps {
  activeSession: Session | null;
  elapsedMs: number;
  onStart: (prUrl?: string, prTitle?: string) => void;
  onStop: () => void;
  isLoading: boolean;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function TimerControls({
  activeSession,
  elapsedMs,
  onStart,
  onStop,
  isLoading,
}: TimerControlsProps) {
  const [prUrl, setPrUrl] = useState("");
  const [prTitle, setPrTitle] = useState("");

  function handleStart() {
    onStart(prUrl.trim() || undefined, prTitle.trim() || undefined);
    setPrUrl("");
    setPrTitle("");
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6">
      <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
        Review Timer
      </h2>

      {activeSession ? (
        <div className="flex flex-col items-center gap-4">
          <div className="text-5xl font-mono font-bold text-green-600 dark:text-green-400 tabular-nums">
            {formatElapsed(elapsedMs)}
          </div>
          {activeSession.pr_title && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Reviewing: <span className="font-medium text-gray-700 dark:text-gray-200">{activeSession.pr_title}</span>
            </p>
          )}
          {activeSession.pr_url && (
            <a
              href={activeSession.pr_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 dark:text-blue-400 hover:underline truncate max-w-xs"
            >
              {activeSession.pr_url}
            </a>
          )}
          <button
            onClick={onStop}
            disabled={isLoading}
            className="mt-2 px-8 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
          >
            {isLoading ? "Stopping..." : "Stop"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="PR title (optional)"
            value={prTitle}
            onChange={(e) => setPrTitle(e.target.value)}
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <input
            type="url"
            placeholder="PR URL (optional)"
            value={prUrl}
            onChange={(e) => setPrUrl(e.target.value)}
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <button
            onClick={handleStart}
            disabled={isLoading}
            className="px-8 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
          >
            {isLoading ? "Starting..." : "Start Review"}
          </button>
        </div>
      )}
    </div>
  );
}
