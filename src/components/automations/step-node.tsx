"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Mail,
  MessageSquare,
  Tag,
  ArrowRight,
  Clock,
  GripVertical,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ACTION_CONFIG: Record<
  string,
  {
    label: string;
    icon: typeof Mail;
    borderColor: string;
    bgColor: string;
    iconColor: string;
  }
> = {
  send_email: {
    label: "Envoyer un email",
    icon: Mail,
    borderColor: "border-l-blue-500",
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  send_sms: {
    label: "Envoyer un SMS",
    icon: MessageSquare,
    borderColor: "border-l-green-500",
    bgColor: "bg-green-50",
    iconColor: "text-green-600",
  },
  add_tag: {
    label: "Ajouter un tag",
    icon: Tag,
    borderColor: "border-l-purple-500",
    bgColor: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  remove_tag: {
    label: "Retirer un tag",
    icon: Tag,
    borderColor: "border-l-orange-500",
    bgColor: "bg-orange-50",
    iconColor: "text-orange-600",
  },
  move_stage: {
    label: "Changer d'etape",
    icon: ArrowRight,
    borderColor: "border-l-indigo-500",
    bgColor: "bg-indigo-50",
    iconColor: "text-indigo-600",
  },
  wait: {
    label: "Attendre",
    icon: Clock,
    borderColor: "border-l-zinc-500",
    bgColor: "bg-zinc-100",
    iconColor: "text-zinc-600",
  },
};

interface StepNodeProps {
  id: string;
  action: string;
  config: Record<string, unknown>;
  onClick: () => void;
  onDelete: () => void;
  tags?: { id: string; name: string }[];
  pipelines?: {
    id: string;
    name: string;
    stages: { id: string; name: string }[];
  }[];
}

export function StepNode({
  id,
  action,
  config,
  onClick,
  onDelete,
  tags,
  pipelines,
}: StepNodeProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const actionConfig = ACTION_CONFIG[action] || ACTION_CONFIG.send_email;
  const Icon = actionConfig.icon;

  function getSummary(): string | null {
    switch (action) {
      case "send_email":
        if (config.subject) return `Objet: ${config.subject as string}`;
        return null;
      case "send_sms":
        if (config.body) {
          const body = config.body as string;
          return body.length > 50 ? body.slice(0, 50) + "..." : body;
        }
        return null;
      case "add_tag":
      case "remove_tag":
        if (config.tagId && tags) {
          const tag = tags.find((t) => t.id === config.tagId);
          if (tag) return `Tag: ${tag.name}`;
        }
        if (config.tagName) return `Tag: ${config.tagName as string}`;
        return null;
      case "move_stage":
        if (config.pipelineId && pipelines) {
          const pipeline = pipelines.find((p) => p.id === config.pipelineId);
          if (pipeline) {
            const stage = pipeline.stages.find(
              (s) => s.id === config.stageId
            );
            if (stage) return `${pipeline.name} → ${stage.name}`;
            return pipeline.name;
          }
        }
        return null;
      case "wait": {
        const duration = config.duration as number | undefined;
        const unit = (config.unit as string) || "minutes";
        if (duration) {
          const unitLabels: Record<string, string> = {
            minutes: "minute(s)",
            hours: "heure(s)",
            days: "jour(s)",
          };
          return `${duration} ${unitLabels[unit] || unit}`;
        }
        if (config.minutes) return `${config.minutes} minute(s)`;
        return null;
      }
      default:
        return null;
    }
  }

  const summary = getSummary();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "w-full max-w-[420px] mx-auto group",
        isDragging && "z-50"
      )}
    >
      <div
        className={cn(
          "rounded-xl border border-zinc-200 bg-white shadow-sm",
          "border-l-4 transition-all duration-200",
          actionConfig.borderColor,
          isDragging
            ? "shadow-xl scale-[1.02] opacity-90 ring-2 ring-blue-200"
            : "hover:shadow-md"
        )}
      >
        <div className="flex items-center gap-2 px-2 py-3.5">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className={cn(
              "flex items-center justify-center w-7 h-7 rounded-md shrink-0",
              "text-zinc-300 transition-colors cursor-grab active:cursor-grabbing",
              "hover:text-zinc-500 hover:bg-zinc-50"
            )}
            title="Glisser pour reordonner"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Main content - clickable */}
          <button
            onClick={onClick}
            className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer rounded-lg p-1 -m-1 transition-colors hover:bg-zinc-50/50"
          >
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                actionConfig.bgColor
              )}
            >
              <Icon className={cn("h-4 w-4", actionConfig.iconColor)} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-zinc-900">
                {actionConfig.label}
              </div>
              {summary && (
                <div className="mt-0.5 text-xs text-zinc-500 truncate">
                  {summary}
                </div>
              )}
            </div>
          </button>

          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={cn(
              "flex items-center justify-center w-7 h-7 rounded-md shrink-0",
              "text-zinc-300 transition-all cursor-pointer",
              "opacity-0 group-hover:opacity-100",
              "hover:text-red-500 hover:bg-red-50"
            )}
            title="Supprimer l'etape"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
