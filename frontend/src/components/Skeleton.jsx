/**
 * Skeleton loading primitives.
 * Usage:
 *   <Skeleton className="h-4 w-1/2" />      // single line
 *   <Skeleton lines={3} />                  // multi-line block
 *   <Skeleton className="h-32 w-full" />    // big card placeholder
 */
export function Skeleton({ className = '', lines = 1 }) {
  if (lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`skeleton h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'} ${className}`}
          />
        ))}
      </div>
    );
  }
  return <div className={`skeleton ${className}`} />;
}

/** Card-shaped skeleton for dashboard widgets */
export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="card p-4 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton lines={lines} />
    </div>
  );
}

/** Table row skeleton */
export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="card overflow-hidden">
      <div className="table-head px-4 py-3">
        <Skeleton className="h-4 w-1/4" />
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-3 flex gap-3 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
