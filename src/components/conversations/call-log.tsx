"use client";

import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight, ArrowDownLeft, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CallControls } from "./call-controls";

interface CallRecord {
  id: string;
  direction: string;
  status: string;
  duration: number | null;
  notes: string | null;
  createdAt: string;
}

interface CallLogProps {
  calls: CallRecord[];
  loading?: boolean;
  contactId: string;
  hasPhone: boolean;
  onRefresh: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

const STATUS_BADGE: Record<
  string,
  { variant: "default" | "success" | "warning" | "danger"; label: string }
> = {
  initiated: { variant: "warning", label: "Initié" },
  ringing: { variant: "warning", label: "Sonnerie" },
  "in-progress": { variant: "success", label: "En cours" },
  answered: { variant: "success", label: "Répondu" },
  completed: { variant: "default", label: "Terminé" },
  busy: { variant: "danger", label: "Occupé" },
  "no-answer": { variant: "danger", label: "Sans réponse" },
  failed: { variant: "danger", label: "Échoué" },
  canceled: { variant: "danger", label: "Annulé" },
};

function CallLog({
  calls,
  loading,
  contactId,
  hasPhone,
  onRefresh,
}: CallLogProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-14 w-full rounded-lg" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4"
          >
            <Skeleton className="h-6 w-6 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Call controls */}
      <div className="border-b border-zinc-200 p-3">
        <CallControls
          contactId={contactId}
          hasPhone={hasPhone}
          onCallInitiated={onRefresh}
        />
      </div>

      {calls.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-12">
          <p className="text-sm text-zinc-400">Aucun appel pour le moment.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-zinc-200">
          {calls.map((call) => {
            const isOutbound = call.direction === "outbound";
            const statusConfig =
              STATUS_BADGE[call.status] || STATUS_BADGE.completed;

            return (
              <div
                key={call.id}
                className="flex items-start gap-3 p-4"
              >
                {/* Direction icon */}
                <div
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    isOutbound ? "bg-violet-50" : "bg-green-50"
                  )}
                >
                  {isOutbound ? (
                    <ArrowUpRight className="h-3.5 w-3.5 text-violet-600" />
                  ) : (
                    <ArrowDownLeft className="h-3.5 w-3.5 text-green-600" />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-zinc-500" />
                      <span className="text-sm font-medium text-zinc-900">
                        {isOutbound ? "Appel sortant" : "Appel entrant"}
                      </span>
                    </div>
                    <Badge variant={statusConfig.variant}>
                      {statusConfig.label}
                    </Badge>
                  </div>

                  <div className="mt-1 flex items-center gap-3 text-xs text-zinc-400">
                    {call.duration != null && (
                      <span>Durée : {formatDuration(call.duration)}</span>
                    )}
                    <span>
                      {formatDistanceToNow(new Date(call.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>

                  {call.notes && (
                    <p className="mt-1.5 text-sm text-zinc-600">
                      {call.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { CallLog };
export type { CallRecord, CallLogProps };
