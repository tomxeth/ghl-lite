import { Skeleton } from "@/components/ui/skeleton";

export default function ConversationsLoading() {
  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4 lg:gap-0">
      <div className="flex items-center justify-between lg:hidden">
        <Skeleton className="h-7 w-36" />
      </div>

      <div className="flex flex-1 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {/* Left panel - Contact list */}
        <div className="flex w-full flex-col border-r border-zinc-200 lg:w-1/3">
          {/* Search */}
          <div className="border-b border-zinc-200 p-3">
            <Skeleton className="h-9 w-full" />
          </div>

          {/* Contact list skeleton */}
          <div className="flex flex-col">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3"
              >
                <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel - Conversation placeholder */}
        <div className="hidden flex-1 flex-col items-center justify-center gap-2 lg:flex">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
    </div>
  );
}
