"use client";

import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const TRIGGER_LABELS: Record<string, string> = {
  contact_created: "Quand un contact est cree",
  deal_stage_change: "Quand un deal change d'etape",
  tag_added: "Quand un tag est ajoute",
  appointment_created: "Quand un rendez-vous est cree",
};

interface TriggerNodeProps {
  trigger: string;
  triggerConfig: Record<string, unknown>;
  onClick: () => void;
  pipelines?: { id: string; name: string; stages: { id: string; name: string }[] }[];
  tags?: { id: string; name: string }[];
}

export function TriggerNode({
  trigger,
  triggerConfig,
  onClick,
  pipelines,
  tags,
}: TriggerNodeProps) {
  function getSummary(): string | null {
    if (trigger === "deal_stage_change" && triggerConfig.pipelineId) {
      const pipeline = pipelines?.find((p) => p.id === triggerConfig.pipelineId);
      if (pipeline) {
        const stage = pipeline.stages.find(
          (s) => s.id === triggerConfig.stageId
        );
        if (stage) {
          return `Pipeline: ${pipeline.name} → Etape: ${stage.name}`;
        }
        return `Pipeline: ${pipeline.name}`;
      }
    }
    if (trigger === "tag_added" && triggerConfig.tagId) {
      const tag = tags?.find((t) => t.id === triggerConfig.tagId);
      if (tag) return `Tag: ${tag.name}`;
    }
    return null;
  }

  const summary = getSummary();

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full max-w-[420px] mx-auto rounded-xl border border-zinc-200 bg-white",
        "shadow-sm transition-all duration-200 cursor-pointer text-left",
        "hover:shadow-md hover:border-amber-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
      )}
    >
      {/* Colored top border */}
      <div className="h-1 rounded-t-xl bg-gradient-to-r from-amber-400 to-orange-400" />

      <div className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50">
            <Zap className="h-4.5 w-4.5 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Declencheur
            </div>
            <div className="mt-0.5 text-sm font-medium text-zinc-900">
              {TRIGGER_LABELS[trigger] || trigger}
            </div>
            {summary && (
              <div className="mt-1 text-xs text-zinc-500 truncate">
                {summary}
              </div>
            )}
          </div>
          <div className="shrink-0 text-xs text-zinc-400">
            Cliquer pour modifier
          </div>
        </div>
      </div>
    </button>
  );
}
