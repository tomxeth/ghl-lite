import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="mt-4 h-4 w-32" />
    </div>
  );
}
