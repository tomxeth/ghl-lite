"use client";

import { useState, useEffect, useRef } from "react";
import { X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const TRIGGER_OPTIONS = [
  { value: "contact_created", label: "Quand un contact est cree" },
  { value: "deal_stage_change", label: "Quand un deal change d'etape" },
  { value: "tag_added", label: "Quand un tag est ajoute" },
  { value: "appointment_created", label: "Quand un rendez-vous est cree" },
];

interface TriggerConfigPanelProps {
  open: boolean;
  trigger: string;
  triggerConfig: Record<string, unknown>;
  pipelines: {
    id: string;
    name: string;
    stages: { id: string; name: string; color: string; position: number }[];
  }[];
  tags: { id: string; name: string }[];
  onSave: (trigger: string, config: Record<string, unknown>) => void;
  onClose: () => void;
}

export function TriggerConfigPanel({
  open,
  trigger,
  triggerConfig,
  pipelines,
  tags,
  onSave,
  onClose,
}: TriggerConfigPanelProps) {
  const [localTrigger, setLocalTrigger] = useState(trigger);
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>(
    triggerConfig
  );
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setLocalTrigger(trigger);
      setLocalConfig({ ...triggerConfig });
    }
  }, [open, trigger, triggerConfig]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  function handleTriggerChange(value: string) {
    setLocalTrigger(value);
    setLocalConfig({});
  }

  function handleSave() {
    const cleanConfig: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(localConfig)) {
      if (value !== undefined && value !== "") {
        cleanConfig[key] = value;
      }
    }
    onSave(localTrigger, cleanConfig);
  }

  const selectedPipeline = pipelines.find(
    (p) => p.id === localConfig.pipelineId
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full max-w-[400px]",
          "bg-white border-l border-zinc-200 shadow-2xl",
          "flex flex-col",
          "animate-panel-slide-in"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
              <Zap className="h-4 w-4 text-amber-600" />
            </div>
            <h2 className="text-base font-semibold text-zinc-900">
              Declencheur
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <Select
              label="Type de declencheur"
              options={TRIGGER_OPTIONS}
              value={localTrigger}
              onChange={(e) => handleTriggerChange(e.target.value)}
            />

            {localTrigger === "deal_stage_change" && (
              <div className="space-y-4">
                <Select
                  label="Pipeline (optionnel)"
                  placeholder="N'importe quel pipeline"
                  options={pipelines.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                  value={(localConfig.pipelineId as string) || ""}
                  onChange={(e) => {
                    setLocalConfig((prev) => ({
                      ...prev,
                      pipelineId: e.target.value || undefined,
                      stageId: undefined,
                    }));
                  }}
                />
                <Select
                  label="Etape (optionnelle)"
                  placeholder="N'importe quelle etape"
                  options={
                    selectedPipeline
                      ? selectedPipeline.stages.map((s) => ({
                          value: s.id,
                          label: s.name,
                        }))
                      : []
                  }
                  value={(localConfig.stageId as string) || ""}
                  onChange={(e) => {
                    setLocalConfig((prev) => ({
                      ...prev,
                      stageId: e.target.value || undefined,
                    }));
                  }}
                  disabled={!localConfig.pipelineId}
                />
              </div>
            )}

            {localTrigger === "tag_added" && (
              <Select
                label="Tag (optionnel)"
                placeholder="N'importe quel tag"
                options={tags.map((t) => ({ value: t.id, label: t.name }))}
                value={(localConfig.tagId as string) || ""}
                onChange={(e) => {
                  setLocalConfig((prev) => ({
                    ...prev,
                    tagId: e.target.value || undefined,
                  }));
                }}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 px-6 py-4 flex items-center gap-3">
          <Button onClick={handleSave} className="flex-1">
            Enregistrer
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
        </div>
      </div>
    </>
  );
}
