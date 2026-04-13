interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: "blue" | "green" | "purple" | "orange";
  error?: string;
}

const accentClasses = {
  blue: "border-blue-500 text-blue-600 dark:text-blue-400",
  green: "border-green-500 text-green-600 dark:text-green-400",
  purple: "border-purple-500 text-purple-600 dark:text-purple-400",
  orange: "border-orange-500 text-orange-600 dark:text-orange-400",
};

export default function StatCard({
  title,
  value,
  subtitle,
  accent = "blue",
  error,
}: StatCardProps) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border-l-4 ${accentClasses[accent]} shadow-sm p-6`}>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {title}
      </p>
      {error ? (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      ) : (
        <>
          <p className={`mt-2 text-4xl font-bold ${accentClasses[accent]}`}>
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">{subtitle}</p>
          )}
        </>
      )}
    </div>
  );
}
