"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  ChevronUp,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmailComposer } from "./email-composer";

interface EmailMessage {
  id: string;
  direction: string;
  subject: string;
  body: string;
  status: string;
  openedAt: string | null;
  clickedAt: string | null;
  createdAt: string;
}

interface EmailListProps {
  emails: EmailMessage[];
  loading?: boolean;
  contactId: string;
  contactEmail: string | null;
  onRefresh: () => void;
}

const STATUS_BADGE: Record<string, { variant: "default" | "success" | "warning" | "danger"; label: string }> = {
  sent: { variant: "default", label: "Envoyé" },
  delivered: { variant: "success", label: "Livré" },
  opened: { variant: "success", label: "Ouvert" },
  clicked: { variant: "success", label: "Cliqué" },
  failed: { variant: "danger", label: "Échoué" },
};

function EmailList({
  emails,
  loading,
  contactId,
  contactEmail,
  onRefresh,
}: EmailListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Compose button */}
      <div className="border-b border-zinc-200 p-3">
        <Button size="sm" onClick={() => setComposerOpen(true)}>
          <Plus className="h-4 w-4" />
          Rédiger
        </Button>
      </div>

      {emails.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-12">
          <p className="text-sm text-zinc-400">Aucun email pour le moment.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-zinc-200">
          {emails.map((email) => {
            const isExpanded = expandedId === email.id;
            const isOutbound = email.direction === "outbound";
            const statusConfig = STATUS_BADGE[email.status] || STATUS_BADGE.sent;
            const bodyPreview =
              email.body.length > 120
                ? email.body.substring(0, 120) + "..."
                : email.body;

            return (
              <div key={email.id} className="flex flex-col">
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : email.id)
                  }
                  className="flex items-start gap-3 p-4 text-left hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  {/* Direction icon */}
                  <div
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                      isOutbound ? "bg-blue-50" : "bg-green-50"
                    )}
                  >
                    {isOutbound ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-blue-600" />
                    ) : (
                      <ArrowDownLeft className="h-3.5 w-3.5 text-green-600" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {email.subject}
                      </p>
                      <Badge variant={statusConfig.variant}>
                        {statusConfig.label}
                      </Badge>
                    </div>
                    {!isExpanded && (
                      <p className="mt-0.5 text-sm text-zinc-500">
                        {bodyPreview}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-zinc-400">
                      {formatDistanceToNow(new Date(email.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>

                  {/* Expand indicator */}
                  <div className="mt-0.5 shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-zinc-400" />
                    )}
                  </div>
                </button>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-3">
                    <p className="whitespace-pre-wrap text-sm text-zinc-700">
                      {email.body}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <EmailComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        contactId={contactId}
        contactEmail={contactEmail}
        onSent={onRefresh}
      />
    </div>
  );
}

export { EmailList };
export type { EmailMessage, EmailListProps };
