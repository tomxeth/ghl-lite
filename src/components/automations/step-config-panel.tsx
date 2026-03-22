"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Mail,
  MessageSquare,
  Tag,
  ArrowRight,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ACTION_META: Record<
  string,
  { label: string; icon: typeof Mail; bgColor: string; iconColor: string }
> = {
  send_email: {
    label: "Envoyer un email",
    icon: Mail,
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  send_sms: {
    label: "Envoyer un SMS",
    icon: MessageSquare,
    bgColor: "bg-green-50",
    iconColor: "text-green-600",
  },
  add_tag: {
    label: "Ajouter un tag",
    icon: Tag,
    bgColor: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  remove_tag: {
    label: "Retirer un tag",
    icon: Tag,
    bgColor: "bg-orange-50",
    iconColor: "text-orange-600",
  },
  move_stage: {
    label: "Changer d'etape",
    icon: ArrowRight,
    bgColor: "bg-indigo-50",
    iconColor: "text-indigo-600",
  },
  wait: {
    label: "Attendre",
    icon: Clock,
    bgColor: "bg-zinc-100",
    iconColor: "text-zinc-600",
  },
};

interface StepConfigPanelProps {
  open: boolean;
  action: string;
  config: Record<string, unknown>;
  pipelines: {
    id: string;
    name: string;
    stages: { id: string; name: string; color: string; position: number }[];
  }[];
  tags: { id: string; name: string }[];
  onSave: (config: Record<string, unknown>) => void;
  onClose: () => void;
}

export function StepConfigPanel({
  open,
  action,
  config,
  pipelines,
  tags,
  onSave,
  onClose,
}: StepConfigPanelProps) {
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>(config);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setLocalConfig({ ...config });
    }
  }, [open, config]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  function updateConfig(key: string, value: unknown) {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    onSave(localConfig);
  }

  const meta = ACTION_META[action] || ACTION_META.send_email;
  const Icon = meta.icon;

  const selectedPipeline = pipelines.find(
    (p) => p.id === localConfig.pipelineId
  );

  function renderFields() {
    switch (action) {
      case "send_email":
        return (
          <div className="space-y-4">
            <Input
              label="Objet"
              placeholder="Bienvenue, {{firstName}} !"
              value={(localConfig.subject as string) || ""}
              onChange={(e) => updateConfig("subject", e.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">
                Corps du message
              </label>
              <textarea
                className={cn(
                  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900",
                  "placeholder:text-zinc-400 resize-none",
                  "transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1"
                )}
                rows={6}
                placeholder="Bonjour {{firstName}}, bienvenue dans notre service..."
                value={(localConfig.body as string) || ""}
                onChange={(e) => updateConfig("body", e.target.value)}
              />
              <div className="flex flex-wrap gap-1.5 mt-1">
                <span className="text-xs text-zinc-400">Variables :</span>
                {["{{firstName}}", "{{lastName}}", "{{email}}"].map((v) => (
                  <Badge key={v} variant="default" className="text-[10px] font-mono cursor-default">
                    {v}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        );

      case "send_sms":
        return (
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">
                Message
              </label>
              <textarea
                className={cn(
                  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900",
                  "placeholder:text-zinc-400 resize-none",
                  "transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1"
                )}
                rows={4}
                placeholder="Bonjour {{firstName}}, merci pour votre inscription !"
                value={(localConfig.body as string) || ""}
                onChange={(e) => updateConfig("body", e.target.value)}
              />
              <div className="flex flex-wrap gap-1.5 mt-1">
                <span className="text-xs text-zinc-400">Variables :</span>
                {["{{firstName}}", "{{lastName}}", "{{email}}"].map((v) => (
                  <Badge key={v} variant="default" className="text-[10px] font-mono cursor-default">
                    {v}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        );

      case "add_tag":
      case "remove_tag":
        return (
          <div className="space-y-3">
            <label className="text-sm font-medium text-zinc-700">
              Selectionner un tag
            </label>
            {tags.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Aucun tag disponible. Creez un tag d&apos;abord.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const isSelected = localConfig.tagId === tag.id;
                  return (
                    <button
                      key={tag.id}
                      onClick={() => {
                        updateConfig("tagId", tag.id);
                        updateConfig("tagName", tag.name);
                      }}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm",
                        "border transition-all cursor-pointer",
                        isSelected
                          ? "border-purple-300 bg-purple-50 text-purple-700 ring-1 ring-purple-200"
                          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                      )}
                    >
                      <Tag className="h-3 w-3" />
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );

      case "move_stage":
        return (
          <div className="space-y-4">
            <Select
              label="Pipeline"
              placeholder="Selectionner un pipeline"
              options={pipelines.map((p) => ({ value: p.id, label: p.name }))}
              value={(localConfig.pipelineId as string) || ""}
              onChange={(e) => {
                updateConfig("pipelineId", e.target.value);
                updateConfig("stageId", "");
              }}
            />
            <Select
              label="Etape"
              placeholder="Selectionner une etape"
              options={
                selectedPipeline
                  ? selectedPipeline.stages.map((s) => ({
                      value: s.id,
                      label: s.name,
                    }))
                  : []
              }
              value={(localConfig.stageId as string) || ""}
              onChange={(e) => updateConfig("stageId", e.target.value)}
              disabled={!localConfig.pipelineId}
            />
          </div>
        );

      case "wait":
        return (
          <div className="space-y-4">
            <Input
              label="Duree"
              type="number"
              min={1}
              placeholder="30"
              value={
                localConfig.duration !== undefined
                  ? String(localConfig.duration)
                  : (localConfig.minutes as string) || ""
              }
              onChange={(e) =>
                updateConfig("duration", parseInt(e.target.value) || 0)
              }
            />
            <Select
              label="Unite"
              options={[
                { value: "minutes", label: "Minutes" },
                { value: "hours", label: "Heures" },
                { value: "days", label: "Jours" },
              ]}
              value={(localConfig.unit as string) || "minutes"}
              onChange={(e) => updateConfig("unit", e.target.value)}
            />
          </div>
        );

      default:
        return null;
    }
  }

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
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg",
                meta.bgColor
              )}
            >
              <Icon className={cn("h-4 w-4", meta.iconColor)} />
            </div>
            <h2 className="text-base font-semibold text-zinc-900">
              {meta.label}
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
        <div className="flex-1 overflow-y-auto px-6 py-5">{renderFields()}</div>

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
