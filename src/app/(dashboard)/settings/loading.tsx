import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <Skeleton className="h-7 w-24" />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-200">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Settings content */}
      <div className="space-y-6">
        {/* Section card */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-3">
            <div className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
          <Skeleton className="h-9 w-28" />
        </div>

        {/* Second section card */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-3">
            <div className="space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
    </div>
  );
}
