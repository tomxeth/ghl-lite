"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Mail,
  MessageSquare,
  Phone,
  StickyNote,
  Target,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface Activity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

interface ActivityTimelineProps {
  activities: Activity[];
  loading?: boolean;
}

const ACTIVITY_CONFIG: Record<
  string,
  { icon: typeof Mail; color: string; bgColor: string }
> = {
  email: {
    icon: Mail,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  sms: {
    icon: MessageSquare,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  call: {
    icon: Phone,
    color: "text-violet-600",
    bgColor: "bg-violet-50",
  },
  note: {
    icon: StickyNote,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  deal: {
    icon: Target,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
  },
};

function getConfig(type: string) {
  return (
    ACTIVITY_CONFIG[type] || {
      icon: Clock,
      color: "text-zinc-600",
      bgColor: "bg-zinc-100",
    }
  );
}

function SkeletonActivity() {
  return (
    <div className="flex gap-3">
      <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

function ActivityTimeline({ activities, loading }: ActivityTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonActivity key={i} />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-zinc-400">
        No activity yet.
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-4 top-4 bottom-4 w-px bg-zinc-200" />

      {activities.map((activity, index) => {
        const config = getConfig(activity.type);
        const Icon = config.icon;

        return (
          <div
            key={activity.id}
            className={cn(
              "relative flex gap-3 py-3",
              index === 0 && "pt-0"
            )}
          >
            {/* Icon */}
            <div
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                config.bgColor
              )}
            >
              <Icon className={cn("h-4 w-4", config.color)} />
            </div>

            {/* Content */}
            <div className="flex-1 pt-0.5">
              <p className="text-sm text-zinc-700">{activity.description}</p>
              <p className="mt-0.5 text-xs text-zinc-400">
                {formatDistanceToNow(new Date(activity.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { ActivityTimeline };
export type { Activity, ActivityTimelineProps };
