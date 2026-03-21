"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Zap, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface AutomationLog {
  id: string;
  createdAt: string;
}

interface Automation {
  id: string;
  name: string;
  trigger: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  steps: { id: string }[];
  logs: AutomationLog[];
}

const TRIGGER_LABELS: Record<string, string> = {
  contact_created: "Contact Created",
  deal_stage_change: "Deal Stage Change",
  tag_added: "Tag Added",
  appointment_created: "Appointment Created",
};

const TRIGGER_COLORS: Record<string, string> = {
  contact_created: "#3B82F6",
  deal_stage_change: "#8B5CF6",
  tag_added: "#F59E0B",
  appointment_created: "#22C55E",
};

export default function AutomationsPage() {
  const router = useRouter();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchAutomations = useCallback(async () => {
    try {
      const res = await fetch("/api/automations");
      const json = await res.json();
      if (res.ok) {
        setAutomations(json.data || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAutomations();
  }, [fetchAutomations]);

  async function handleToggleActive(automation: Automation) {
    try {
      const res = await fetch(`/api/automations/${automation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !automation.active }),
      });
      if (res.ok) {
        setAutomations((prev) =>
          prev.map((a) =>
            a.id === automation.id ? { ...a, active: !a.active } : a
          )
        );
      }
    } catch {
      // silently fail
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/automations/${deleteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAutomations((prev) => prev.filter((a) => a.id !== deleteId));
        setDeleteId(null);
      }
    } catch {
      // silently fail
    } finally {
      setDeleteLoading(false);
    }
  }

  function formatLastRun(logs: AutomationLog[]): string {
    if (logs.length === 0) return "Never";
    const date = new Date(logs[0].createdAt);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Automations</h1>
        <Button onClick={() => router.push("/automations/new")}>
          <Plus className="h-4 w-4" />
          Create Automation
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : automations.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <Zap className="mx-auto h-10 w-10 text-zinc-300" />
            <h3 className="mt-3 text-sm font-medium text-zinc-900">
              No automations
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Create your first automation to start streamlining your workflow.
            </p>
            <div className="mt-4">
              <Button
                size="sm"
                onClick={() => router.push("/automations/new")}
              >
                <Plus className="h-4 w-4" />
                Create Automation
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {automations.map((automation) => (
            <Card key={automation.id} noPadding>
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Icon */}
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    automation.active ? "bg-amber-50" : "bg-zinc-100"
                  )}
                >
                  <Zap
                    className={cn(
                      "h-5 w-5",
                      automation.active ? "text-amber-600" : "text-zinc-400"
                    )}
                  />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-zinc-900">
                      {automation.name}
                    </h3>
                    <Badge
                      variant="custom"
                      color={TRIGGER_COLORS[automation.trigger] || "#6B7280"}
                    >
                      {TRIGGER_LABELS[automation.trigger] || automation.trigger}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                    <span>
                      {automation.steps.length} step
                      {automation.steps.length !== 1 ? "s" : ""}
                    </span>
                    <span>Last run: {formatLastRun(automation.logs)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Toggle switch */}
                  <button
                    onClick={() => handleToggleActive(automation)}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors",
                      automation.active ? "bg-green-500" : "bg-zinc-300"
                    )}
                    title={automation.active ? "Disable" : "Enable"}
                  >
                    <span
                      className={cn(
                        "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5",
                        automation.active
                          ? "translate-x-5.5 ml-0"
                          : "translate-x-0.5"
                      )}
                    />
                  </button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      router.push(`/automations/${automation.id}`)
                    }
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteId(automation.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Automation"
        className="max-w-sm"
      >
        <p className="text-sm text-zinc-600">
          Are you sure you want to delete this automation? This action cannot be
          undone and all associated logs will be removed.
        </p>
        <div className="mt-4 flex items-center justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setDeleteId(null)}
            disabled={deleteLoading}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={deleteLoading}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
