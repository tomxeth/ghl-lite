"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import type { KanbanStage } from "./kanban-column";
import type { KanbanOpportunity } from "./kanban-card";

interface KanbanBoardProps {
  stages: KanbanStage[];
  onMoveOpportunity: (opportunityId: string, newStageId: string) => void;
}

function KanbanBoard({ stages, onMoveOpportunity }: KanbanBoardProps) {
  const [activeOpportunity, setActiveOpportunity] =
    useState<KanbanOpportunity | null>(null);
  const [activeStageColor, setActiveStageColor] = useState("#3B82F6");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  function handleDragStart(event: DragStartEvent) {
    const opportunity = event.active.data.current?.opportunity as
      | KanbanOpportunity
      | undefined;
    if (opportunity) {
      setActiveOpportunity(opportunity);
      const stage = stages.find((s) => s.id === opportunity.stageId);
      if (stage) setActiveStageColor(stage.color);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveOpportunity(null);

    const { active, over } = event;
    if (!over) return;

    const opportunityId = active.id as string;
    const newStageId = over.id as string;

    // Find current stage of the opportunity
    const currentStage = stages.find((s) =>
      s.opportunities.some((o) => o.id === opportunityId)
    );

    if (!currentStage || currentStage.id === newStageId) return;

    // Verify the target is a valid stage
    const targetStage = stages.find((s) => s.id === newStageId);
    if (!targetStage) return;

    onMoveOpportunity(opportunityId, newStageId);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <KanbanColumn key={stage.id} stage={stage} />
        ))}
      </div>

      <DragOverlay>
        {activeOpportunity && (
          <div className="w-72 rotate-2 opacity-90">
            <KanbanCard
              opportunity={activeOpportunity}
              stageColor={activeStageColor}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

export { KanbanBoard };
export type { KanbanBoardProps };
