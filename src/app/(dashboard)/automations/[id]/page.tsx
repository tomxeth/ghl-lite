"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { FlowCanvas } from "@/components/automations/flow-canvas";
import { TriggerConfigPanel } from "@/components/automations/trigger-config-panel";
import { StepConfigPanel } from "@/components/automations/step-config-panel";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────

interface StepData {
  id: string;
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

// ─── Helpers ─────────────────────────────────────────────

let stepIdCounter = 0;
function generateStepId(): string {
  stepIdCounter += 1;
  return `step-${Date.now()}-${stepIdCounter}`;
}

// ─── Component ──────────────────────────────────────────

export default function AutomationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isNew = id === "new";

  // Form state
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
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
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Panel state
  const [triggerPanelOpen, setTriggerPanelOpen] = useState(false);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(
    null
  );

  // Name editing
  const [editingName, setEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

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
      setActive(auto.active);
      setTrigger(auto.trigger);
      setTriggerConfig(
        auto.triggerConfig && typeof auto.triggerConfig === "object"
          ? (auto.triggerConfig as Record<string, unknown>)
          : {}
      );
      setSteps(
        auto.steps.map(
          (s: { action: string; config: unknown }) => ({
            id: generateStepId(),
            action: s.action,
            config:
              s.config && typeof s.config === "object"
                ? (s.config as Record<string, unknown>)
                : {},
          })
        )
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

  // Focus name input when editing
  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  // ─── Step management ────────────────────────────────────

  function handleStepAdd(action: string, atIndex?: number) {
    const newStep: StepData = {
      id: generateStepId(),
      action,
      config: {},
    };
    setSteps((prev) => {
      if (atIndex !== undefined) {
        const copy = [...prev];
        copy.splice(atIndex, 0, newStep);
        return copy;
      }
      return [...prev, newStep];
    });
  }

  function handleStepDelete(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
    if (selectedStepIndex === index) {
      setSelectedStepIndex(null);
    } else if (selectedStepIndex !== null && selectedStepIndex > index) {
      setSelectedStepIndex(selectedStepIndex - 1);
    }
  }

  function handleStepConfigSave(config: Record<string, unknown>) {
    if (selectedStepIndex === null) return;
    setSteps((prev) =>
      prev.map((step, i) =>
        i === selectedStepIndex ? { ...step, config } : step
      )
    );
    setSelectedStepIndex(null);
  }

  function handleTriggerSave(
    newTrigger: string,
    newConfig: Record<string, unknown>
  ) {
    setTrigger(newTrigger);
    setTriggerConfig(newConfig);
    setTriggerPanelOpen(false);
  }

  // ─── Toggle active ──────────────────────────────────────

  async function handleToggleActive() {
    if (isNew) {
      setActive(!active);
      return;
    }

    try {
      const res = await fetch(`/api/automations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      if (res.ok) {
        setActive(!active);
      }
    } catch {
      // silently fail
    }
  }

  // ─── Save ─────────────────────────────────────────────

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Le nom est requis");
      return;
    }

    setError("");
    setSaving(true);
    setSaveSuccess(false);

    try {
      const payload = {
        name: trimmedName,
        active,
        trigger,
        triggerConfig:
          Object.keys(triggerConfig).length > 0 ? triggerConfig : null,
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
        setError(json.error || "Echec de l'enregistrement");
        return;
      }

      const json = await res.json();
      if (isNew) {
        router.push(`/automations/${json.data.id}`);
      } else {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch {
      setError("Une erreur inattendue s'est produite");
    } finally {
      setSaving(false);
    }
  }

  // ─── Loading state ────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex flex-col items-center gap-4 py-12">
          <Skeleton className="h-24 w-[420px] rounded-xl" />
          <Skeleton className="h-10 w-0.5" />
          <Skeleton className="h-16 w-[420px] rounded-xl" />
          <Skeleton className="h-10 w-0.5" />
          <Skeleton className="h-16 w-[420px] rounded-xl" />
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────

  const selectedStep =
    selectedStepIndex !== null ? steps[selectedStepIndex] : null;

  return (
    <div className="flex flex-col min-h-full -mx-4 sm:-mx-6 -mt-4 sm:-mt-6">
      {/* Top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-zinc-200 bg-white/95 backdrop-blur-sm px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/automations")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {/* Editable name */}
          {editingName ? (
            <input
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setEditingName(false);
                if (e.key === "Escape") setEditingName(false);
              }}
              placeholder="Nom de l'automatisation"
              className={cn(
                "text-lg font-semibold text-zinc-900 bg-transparent border-b-2 border-blue-400",
                "outline-none min-w-0 max-w-xs"
              )}
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="text-lg font-semibold text-zinc-900 hover:text-zinc-600 transition-colors truncate max-w-xs cursor-pointer"
              title="Cliquer pour modifier le nom"
            >
              {name || "Sans titre"}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Active toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 hidden sm:inline">
              {active ? "Active" : "Inactive"}
            </span>
            <button
              onClick={handleToggleActive}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors",
                active ? "bg-green-500" : "bg-zinc-300"
              )}
              title={active ? "Desactiver" : "Activer"}
            >
              <span
                className={cn(
                  "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5",
                  active ? "translate-x-5.5 ml-0" : "translate-x-0.5"
                )}
              />
            </button>
          </div>

          {/* Save button */}
          <Button
            onClick={handleSave}
            loading={saving}
            className={cn(
              saveSuccess &&
                "bg-green-600 hover:bg-green-700"
            )}
          >
            {saveSuccess ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Enregistre
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isNew ? "Creer" : "Enregistrer"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 sm:mx-6 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Flow canvas area */}
      <div className="flex-1 bg-zinc-50/50 overflow-y-auto">
        <div className="max-w-[500px] mx-auto">
          <FlowCanvas
            trigger={trigger}
            triggerConfig={triggerConfig}
            steps={steps}
            onTriggerClick={() => setTriggerPanelOpen(true)}
            onStepAdd={handleStepAdd}
            onStepClick={(index) => setSelectedStepIndex(index)}
            onStepDelete={handleStepDelete}
            onStepReorder={setSteps}
            pipelines={pipelines}
            tags={tags}
          />
        </div>
      </div>

      {/* Logs (only show for existing automations) */}
      {!isNew && logs.length > 0 && (
        <div className="border-t border-zinc-200 bg-white px-4 sm:px-6 py-4">
          <div className="max-w-[500px] mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Journaux recents</CardTitle>
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
                          Etape {log.stepIndex + 1}
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
                        <p className="mt-1 text-sm text-zinc-600">
                          {log.message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Trigger config panel */}
      <TriggerConfigPanel
        open={triggerPanelOpen}
        trigger={trigger}
        triggerConfig={triggerConfig}
        pipelines={pipelines}
        tags={tags}
        onSave={handleTriggerSave}
        onClose={() => setTriggerPanelOpen(false)}
      />

      {/* Step config panel */}
      <StepConfigPanel
        open={selectedStepIndex !== null}
        action={selectedStep?.action || "send_email"}
        config={selectedStep?.config || {}}
        pipelines={pipelines}
        tags={tags}
        onSave={handleStepConfigSave}
        onClose={() => setSelectedStepIndex(null)}
      />
    </div>
  );
}
