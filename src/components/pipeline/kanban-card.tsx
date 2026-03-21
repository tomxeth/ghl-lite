"use client";

import { useDraggable } from "@dnd-kit/core";
import { differenceInDays } from "date-fns";
import { GripVertical, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

export interface KanbanOpportunity {
  id: string;
  title: string;
  value: number;
  currency: string;
  status: string;
  stageId: string;
  createdAt: string;
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface KanbanCardProps {
  opportunity: KanbanOpportunity;
  stageColor: string;
}

function KanbanCard({ opportunity, stageColor }: KanbanCardProps) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: opportunity.id,
      data: {
        opportunity,
      },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const daysInStage = differenceInDays(new Date(), new Date(opportunity.createdAt));

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition-shadow",
        "hover:shadow-md cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50 shadow-lg z-50"
      )}
      onClick={() => router.push(`/opportunities/${opportunity.id}`)}
    >
      {/* Color indicator */}
      <div
        className="absolute left-0 top-2 bottom-2 w-1 rounded-full"
        style={{ backgroundColor: stageColor }}
      />

      {/* Drag handle */}
      <div
        {...listeners}
        {...attributes}
        className="absolute right-1 top-1 rounded p-0.5 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity hover:text-zinc-500 cursor-grab"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      <div className="pl-2.5">
        {/* Title */}
        <p className="text-sm font-medium text-zinc-900 pr-4 line-clamp-2">
          {opportunity.title}
        </p>

        {/* Contact */}
        {opportunity.contact && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-500">
            <User className="h-3 w-3" />
            <span>
              {opportunity.contact.firstName} {opportunity.contact.lastName}
            </span>
          </div>
        )}

        {/* Bottom row */}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-900">
            {formatCurrency(opportunity.value, opportunity.currency)}
          </span>
          <span className="text-xs text-zinc-400">
            {daysInStage === 0
              ? "Aujourd'hui"
              : `${daysInStage}j`}
          </span>
        </div>
      </div>
    </div>
  );
}

export { KanbanCard };
