"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  ArrowLeft,
  Mail,
  MessageSquare,
  Tag,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────

interface StepData {
  action: string;
  config: Record<string, unknown>;
}

interface LogEntry {
  id: string;
  stepIndex: number;
  status: string;
  message: string | null;
  contactId: string | null;
  createdAt: string;
}

interface Pipeline {
  id: string;
  name: string;
  stages: { id: string; name: string; color: string; position: number }[];
}

interface TagOption {
  id: string;
  name: string;
}

// ─── Constants ──────────────────────────────────────────

const TRIGGER_OPTIONS = [
  { value: "contact_created", label: "Quand un contact est créé" },
  { value: "deal_stage_change", label: "Quand une affaire change d'étape" },
  { value: "tag_added", label: "Quand un tag est ajouté" },
  { value: "appointment_created", label: "Quand un rendez-vous est créé" },
];

const ACTION_OPTIONS = [
  { value: "send_email", label: "Envoyer un email" },
  { value: "send_sms", label: "Envoyer un SMS" },
  { value: "add_tag", label: "Ajouter un tag" },
  { value: "remove_tag", label: "Retirer un tag" },
  { value: "move_stage", label: "Déplacer l'étape" },
  { value: "wait", label: "Attendre" },
];

const ACTION_ICONS: Record<string, typeof Mail> = {
  send_email: Mail,
  send_sms: MessageSquare,
  add_tag: Tag,
  remove_tag: Tag,
  move_stage: ArrowRight,
  wait: Clock,
};

// ─── Component ──────────────────────────────────────────

export default function AutomationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === "new";

  // Form state
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("contact_created");
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>(
    {}
  );
  const [steps, setSteps] = useState<StepData[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Reference data
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);

  // UI state
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Fetch reference data (pipelines and tags)
  useEffect(() => {
    async function loadReferenceData() {
      try {
        const [pipelinesRes, tagsRes] = await Promise.all([
          fetch("/api/pipelines"),
          fetch("/api/tags"),
        ]);
        if (pipelinesRes.ok) {
          const json = await pipelinesRes.json();
          setPipelines(json.data || []);
        }
        if (tagsRes.ok) {
          const json = await tagsRes.json();
          setTags(json.data || []);
        }
      } catch {
        // silently fail
      }
    }
    loadReferenceData();
  }, []);

  // Fetch automation data if editing
  const fetchAutomation = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/automations/${id}`);
      if (!res.ok) {
        router.push("/automations");
        return;
      }
      const json = await res.json();
      const auto = json.data;
      setName(auto.name);
      setTrigger(auto.trigger);
      setTriggerConfig(
        auto.triggerConfig && typeof auto.triggerConfig === "object"
          ? (auto.triggerConfig as Record<string, unknown>)
          : {}
      );
      setSteps(
        auto.steps.map((s: { action: string; config: unknown }) => ({
          action: s.action,
          config:
            s.config && typeof s.config === "object"
              ? (s.config as Record<string, unknown>)
              : {},
        }))
      );
      setLogs(auto.logs || []);
    } catch {
      router.push("/automations");
    } finally {
      setLoading(false);
    }
  }, [id, isNew, router]);

  useEffect(() => {
    fetchAutomation();
  }, [fetchAutomation]);

  // ─── Step management ────────────────────────────────────

  function addStep() {
    setSteps((prev) => [...prev, { action: "send_email", config: {} }]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function updateStep(index: number, data: Partial<StepData>) {
    setSteps((prev) =>
      prev.map((step, i) => {
        if (i !== index) return step;
        if (data.action && data.action !== step.action) {
          return { action: data.action, config: {} };
        }
        return { ...step, ...data };
      })
    );
  }

  function updateStepConfig(index: number, key: string, value: unknown) {
    setSteps((prev) =>
      prev.map((step, i) =>
        i === index
          ? { ...step, config: { ...step.config, [key]: value } }
          : step
      )
    );
  }

  function moveStep(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;
    setSteps((prev) => {
      const copy = [...prev];
      [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
      return copy;
    });
  }

  // ─── Save ─────────────────────────────────────────────

  async function handleSave() {
    if (!name.trim()) {
      setError("Le nom est requis");
      return;
    }
    if (steps.length === 0) {
      setError("Au moins une étape est requise");
      return;
    }

    setError("");
    setSaving(true);

    try {
      const payload = {
        name: name.trim(),
        trigger,
        triggerConfig: Object.keys(triggerConfig).length > 0 ? triggerConfig : null,
        steps: steps.map((s) => ({ action: s.action, config: s.config })),
      };

      const url = isNew ? "/api/automations" : `/api/automations/${id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Échec de l'enregistrement");
        return;
      }

      const json = await res.json();
      if (isNew) {
        router.push(`/automations/${json.data.id}`);
      } else {
        fetchAutomation();
      }
    } catch {
      setError("Une erreur inattendue s'est produite");
    } finally {
      setSaving(false);
    }
  }

  // ─── Render helpers ───────────────────────────────────

  function renderTriggerConfig() {
    if (trigger === "deal_stage_change") {
      const selectedPipeline = pipelines.find(
        (p) => p.id === triggerConfig.pipelineId
      );
      return (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Select
            label="Pipeline (optionnel)"
            placeholder="N'importe quel pipeline"
            options={pipelines.map((p) => ({ value: p.id, label: p.name }))}
            value={(triggerConfig.pipelineId as string) || ""}
            onChange={(e) => {
              setTriggerConfig((prev) => ({
                ...prev,
                pipelineId: e.target.value || undefined,
                stageId: undefined,
              }));
            }}
          />
          <Select
            label="Étape (optionnelle)"
            placeholder="N'importe quelle étape"
            options={
              selectedPipeline
                ? selectedPipeline.stages.map((s) => ({
                    value: s.id,
                    label: s.name,
                  }))
                : []
            }
            value={(triggerConfig.stageId as string) || ""}
            onChange={(e) => {
              setTriggerConfig((prev) => ({
                ...prev,
                stageId: e.target.value || undefined,
              }));
            }}
            disabled={!triggerConfig.pipelineId}
          />
        </div>
      );
    }

    if (trigger === "tag_added") {
      return (
        <div className="mt-3 max-w-xs">
          <Select
            label="Tag (optionnel)"
            placeholder="N'importe quel tag"
            options={tags.map((t) => ({ value: t.id, label: t.name }))}
            value={(triggerConfig.tagId as string) || ""}
            onChange={(e) => {
              setTriggerConfig((prev) => ({
                ...prev,
                tagId: e.target.value || undefined,
              }));
            }}
          />
        </div>
      );
    }

    return null;
  }

  function renderStepConfig(step: StepData, index: number) {
    switch (step.action) {
      case "send_email":
        return (
          <div className="space-y-3">
            <Input
              label="Objet"
              placeholder="Welcome, {{firstName}}!"
              value={(step.config.subject as string) || ""}
              onChange={(e) =>
                updateStepConfig(index, "subject", e.target.value)
              }
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">Corps</label>
              <textarea
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1"
                rows={4}
                placeholder="Hi {{firstName}}, welcome to our service..."
                value={(step.config.body as string) || ""}
                onChange={(e) =>
                  updateStepConfig(index, "body", e.target.value)
                }
              />
              <p className="text-xs text-zinc-400">
                Variables disponibles : {"{{firstName}}"}, {"{{lastName}}"},{" "}
                {"{{email}}"}
              </p>
            </div>
          </div>
        );

      case "send_sms":
        return (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">
              Message
            </label>
            <textarea
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1"
              rows={3}
              placeholder="Hi {{firstName}}, thanks for signing up!"
              value={(step.config.body as string) || ""}
              onChange={(e) =>
                updateStepConfig(index, "body", e.target.value)
              }
            />
            <p className="text-xs text-zinc-400">
              Variables disponibles : {"{{firstName}}"}, {"{{lastName}}"},{" "}
              {"{{email}}"}
            </p>
          </div>
        );

      case "add_tag":
      case "remove_tag":
        return (
          <Select
            label="Tag"
            placeholder="Sélectionner un tag"
            options={tags.map((t) => ({ value: t.id, label: t.name }))}
            value={(step.config.tagId as string) || ""}
            onChange={(e) => {
              const tag = tags.find((t) => t.id === e.target.value);
              updateStepConfig(index, "tagId", e.target.value);
              if (tag) {
                updateStepConfig(index, "tagName", tag.name);
              }
            }}
          />
        );

      case "move_stage": {
        const selectedPipeline = pipelines.find(
          (p) => p.id === step.config.pipelineId
        );
        return (
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Pipeline"
              placeholder="Sélectionner un pipeline"
              options={pipelines.map((p) => ({ value: p.id, label: p.name }))}
              value={(step.config.pipelineId as string) || ""}
              onChange={(e) => {
                updateStepConfig(index, "pipelineId", e.target.value);
                updateStepConfig(index, "stageId", "");
              }}
            />
            <Select
              label="Étape"
              placeholder="Sélectionner une étape"
              options={
                selectedPipeline
                  ? selectedPipeline.stages.map((s) => ({
                      value: s.id,
                      label: s.name,
                    }))
                  : []
              }
              value={(step.config.stageId as string) || ""}
              onChange={(e) =>
                updateStepConfig(index, "stageId", e.target.value)
              }
              disabled={!step.config.pipelineId}
            />
          </div>
        );
      }

      case "wait":
        return (
          <Input
            label="Durée (minutes)"
            type="number"
            min={1}
            placeholder="30"
            value={(step.config.minutes as string) || ""}
            onChange={(e) =>
              updateStepConfig(index, "minutes", parseInt(e.target.value) || 0)
            }
          />
        );

      default:
        return null;
    }
  }

  // ─── Loading state ────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Card>
          <SkeletonText lines={4} />
        </Card>
        <Card>
          <SkeletonText lines={6} />
        </Card>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/automations")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold text-zinc-900">
          {isNew ? "Créer une automatisation" : "Modifier l'automatisation"}
        </h1>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Name */}
      <Card>
        <CardHeader>
          <CardTitle>Nom</CardTitle>
        </CardHeader>
        <Input
          placeholder="ex. Bienvenue aux nouveaux contacts"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Card>

      {/* Trigger */}
      <Card>
        <CardHeader>
          <CardTitle>Déclencheur</CardTitle>
        </CardHeader>
        <Select
          label="Quand cette automatisation doit-elle s'exécuter ?"
          options={TRIGGER_OPTIONS}
          value={trigger}
          onChange={(e) => {
            setTrigger(e.target.value);
            setTriggerConfig({});
          }}
        />
        {renderTriggerConfig()}
      </Card>

      {/* Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Étapes</CardTitle>
        </CardHeader>

        {steps.length === 0 ? (
          <p className="mb-4 text-sm text-zinc-500">
            Aucune étape. Ajoutez une étape pour définir ce qui se passe lorsque
            l'automatisation est déclenchée.
          </p>
        ) : (
          <div className="mb-4 space-y-3">
            {steps.map((step, index) => {
              const Icon = ACTION_ICONS[step.action] || ArrowRight;
              return (
                <div
                  key={index}
                  className="rounded-lg border border-zinc-200 bg-zinc-50/50"
                >
                  {/* Step header */}
                  <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white border border-zinc-200 text-xs font-medium text-zinc-500">
                      {index + 1}
                    </div>
                    <Icon className="h-4 w-4 shrink-0 text-zinc-500" />
                    <Select
                      options={ACTION_OPTIONS}
                      value={step.action}
                      onChange={(e) =>
                        updateStep(index, { action: e.target.value })
                      }
                      className="flex-1"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveStep(index, "up")}
                        disabled={index === 0}
                        className={cn(
                          "rounded p-1 transition-colors cursor-pointer",
                          index === 0
                            ? "text-zinc-300"
                            : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200"
                        )}
                        title="Monter"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => moveStep(index, "down")}
                        disabled={index === steps.length - 1}
                        className={cn(
                          "rounded p-1 transition-colors cursor-pointer",
                          index === steps.length - 1
                            ? "text-zinc-300"
                            : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200"
                        )}
                        title="Descendre"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeStep(index)}
                        className="rounded p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Supprimer l'étape"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Step config */}
                  <div className="px-4 py-3">
                    {renderStepConfig(step, index)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Button variant="secondary" size="sm" onClick={addStep}>
          <Plus className="h-4 w-4" />
          Ajouter une étape
        </Button>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} loading={saving}>
          <Save className="h-4 w-4" />
          {isNew ? "Créer l'automatisation" : "Enregistrer les modifications"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => router.push("/automations")}
          disabled={saving}
        >
          Annuler
        </Button>
      </div>

      {/* Logs (only show for existing automations) */}
      {!isNew && logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Journaux récents</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 rounded-md border border-zinc-100 px-3 py-2"
              >
                {log.status === "success" ? (
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        log.status === "success" ? "success" : "danger"
                      }
                    >
                      Étape {log.stepIndex + 1}
                    </Badge>
                    <span className="text-xs text-zinc-400">
                      {new Date(log.createdAt).toLocaleDateString("fr-FR", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {log.message && (
                    <p className="mt-1 text-sm text-zinc-600">{log.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
