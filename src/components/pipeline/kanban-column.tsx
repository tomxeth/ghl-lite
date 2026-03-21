"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { KanbanCard } from "./kanban-card";
import type { KanbanOpportunity } from "./kanban-card";

export interface KanbanStage {
  id: string;
  name: string;
  color: string;
  position: number;
  opportunities: KanbanOpportunity[];
}

interface KanbanColumnProps {
  stage: KanbanStage;
}

function KanbanColumn({ stage }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { stage },
  });

  const totalValue = stage.opportunities.reduce(
    (sum, opp) => sum + opp.value,
    0
  );

  return (
    <div className="flex w-72 shrink-0 flex-col">
      {/* Column header */}
      <div className="mb-2 rounded-lg bg-zinc-50 px-3 py-2.5 border border-zinc-200">
        <div className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="text-sm font-semibold text-zinc-900 truncate">
            {stage.name}
          </h3>
          <span className="ml-auto shrink-0 rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600">
            {stage.opportunities.length}
          </span>
        </div>
        {totalValue > 0 && (
          <p className="mt-1 text-xs text-zinc-500">
            {formatCurrency(totalValue)}
          </p>
        )}
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-2 rounded-lg p-1.5 transition-colors min-h-[120px]",
          isOver && "bg-blue-50 ring-2 ring-blue-200 ring-inset"
        )}
      >
        {stage.opportunities.map((opportunity) => (
          <KanbanCard
            key={opportunity.id}
            opportunity={opportunity}
            stageColor={stage.color}
          />
        ))}

        {stage.opportunities.length === 0 && (
          <div
            className={cn(
              "flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 p-4 text-xs text-zinc-400",
              isOver && "border-blue-300 text-blue-500"
            )}
          >
            {isOver ? "Déposer ici" : "Aucune affaire"}
          </div>
        )}
      </div>
    </div>
  );
}

export { KanbanColumn };
