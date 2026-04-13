"use client";

interface DateRangeFilterProps {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  onClear: () => void;
}

export default function DateRangeFilter({ start, end, onChange, onClear }: DateRangeFilterProps) {
  const hasRange = start || end;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Date Range
      </span>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={start}
          max={end || undefined}
          onChange={(e) => onChange(e.target.value, end)}
          className="text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
        <span className="text-xs text-gray-400">–</span>
        <input
          type="date"
          value={end}
          min={start || undefined}
          onChange={(e) => onChange(start, e.target.value)}
          className="text-xs border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>
      {hasRange && (
        <button
          onClick={onClear}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors px-1"
        >
          Clear
        </button>
      )}
    </div>
  );
}
