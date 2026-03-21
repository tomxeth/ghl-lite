"use client";

import { useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface SmsMessage {
  id: string;
  direction: string;
  body: string;
  status: string;
  createdAt: string;
}

interface MessageThreadProps {
  messages: SmsMessage[];
  loading?: boolean;
}

function MessageThread({ messages, loading }: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              i % 2 === 0 ? "justify-end" : "justify-start"
            )}
          >
            <Skeleton className="h-12 w-48 rounded-2xl" />
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-zinc-400">Aucun message pour le moment.</p>
      </div>
    );
  }

  // Display in chronological order (oldest first)
  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
      {sorted.map((msg) => {
        const isOutbound = msg.direction === "outbound";
        return (
          <div
            key={msg.id}
            className={cn(
              "flex flex-col gap-0.5",
              isOutbound ? "items-end" : "items-start"
            )}
          >
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                isOutbound
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-900"
              )}
            >
              {msg.body}
            </div>
            <span className="px-1 text-[11px] text-zinc-400">
              {formatDistanceToNow(new Date(msg.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

export { MessageThread };
export type { SmsMessage, MessageThreadProps };
