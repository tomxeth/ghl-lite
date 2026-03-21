import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-7 w-24" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-16" />
        <div className="flex items-center gap-1">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="h-5 w-40" />
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-zinc-200">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="px-2 py-2 text-center">
              <Skeleton className="mx-auto h-4 w-8" />
            </div>
          ))}
        </div>

        {/* Calendar cells - 5 weeks */}
        {Array.from({ length: 5 }).map((_, week) => (
          <div key={week} className="grid grid-cols-7 border-b border-zinc-200 last:border-b-0">
            {Array.from({ length: 7 }).map((_, day) => (
              <div
                key={day}
                className="min-h-24 border-r border-zinc-100 p-2 last:border-r-0"
              >
                <Skeleton className="h-4 w-6" />
                {week < 3 && day % 3 === 0 && (
                  <Skeleton className="mt-1 h-5 w-full rounded" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
