"use client";

import { useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

import { TriggerNode } from "./trigger-node";
import { StepNode } from "./step-node";
import { ConnectorLine } from "./connector-line";
import { AddStepButton } from "./add-step-button";

interface StepData {
  id: string;
  action: string;
  config: Record<string, unknown>;
}

interface FlowCanvasProps {
  trigger: string;
  triggerConfig: Record<string, unknown>;
  steps: StepData[];
  onTriggerClick: () => void;
  onStepAdd: (action: string, atIndex?: number) => void;
  onStepClick: (index: number) => void;
  onStepDelete: (index: number) => void;
  onStepReorder: (steps: StepData[]) => void;
  pipelines?: {
    id: string;
    name: string;
    stages: { id: string; name: string }[];
  }[];
  tags?: { id: string; name: string }[];
}

export function FlowCanvas({
  trigger,
  triggerConfig,
  steps,
  onTriggerClick,
  onStepAdd,
  onStepClick,
  onStepDelete,
  onStepReorder,
  pipelines,
  tags,
}: FlowCanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = steps.findIndex((s) => s.id === active.id);
      const newIndex = steps.findIndex((s) => s.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        onStepReorder(arrayMove(steps, oldIndex, newIndex));
      }
    },
    [steps, onStepReorder]
  );

  return (
    <div className="flex flex-col items-center py-8 px-4">
      {/* Trigger Node */}
      <TriggerNode
        trigger={trigger}
        triggerConfig={triggerConfig}
        onClick={onTriggerClick}
        pipelines={pipelines}
        tags={tags}
      />

      {/* Steps with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={steps.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center w-full">
              <ConnectorLine />
              <AddStepButton
                onAdd={(action) => onStepAdd(action, index)}
              />
              <ConnectorLine />
              <StepNode
                id={step.id}
                action={step.action}
                config={step.config}
                onClick={() => onStepClick(index)}
                onDelete={() => onStepDelete(index)}
                tags={tags}
                pipelines={pipelines}
              />
            </div>
          ))}
        </SortableContext>
      </DndContext>

      {/* Final add button */}
      <ConnectorLine />
      <AddStepButton onAdd={(action) => onStepAdd(action)} />

      {/* Bottom spacer */}
      <div className="h-20" />
    </div>
  );
}
