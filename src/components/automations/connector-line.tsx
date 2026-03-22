"use client";

import { cn } from "@/lib/utils";

interface ConnectorLineProps {
  isDragging?: boolean;
}

export function ConnectorLine({ isDragging }: ConnectorLineProps) {
  return (
    <div className="flex justify-center">
      <div
        className={cn(
          "w-0.5 h-10 bg-zinc-300 transition-colors duration-200",
          isDragging && "bg-blue-300 animate-pulse"
        )}
      />
    </div>
  );
}
