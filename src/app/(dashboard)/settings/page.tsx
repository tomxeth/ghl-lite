"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Plug,
  User,
  Kanban,
  Phone,
  Mail as MailIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

type TabValue = "profile" | "pipelines" | "integrations";

interface Stage {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface Pipeline {
  id: string;
  name: string;
  stages: Stage[];
}

const STAGE_COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#EF4444",
  "#F59E0B",
  "#22C55E",
  "#14B8A6",
  "#6366F1",
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabValue>("profile");

  // Pipeline state
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pipelinesLoading, setPipelinesLoading] = useState(false);
  const [expandedPipelines, setExpandedPipelines] = useState<
    Record<string, boolean>
  >({});

  // Create pipeline modal
  const [createPipelineOpen, setCreatePipelineOpen] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [createPipelineLoading, setCreatePipelineLoading] = useState(false);

  // Add stage
  const [addingStageTo, setAddingStageTo] = useState<string | null>(null);
  const [newStageName, setNewStageName] = useState("");
  const [addStageLoading, setAddStageLoading] = useState(false);

  // Edit stage inline
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editStageName, setEditStageName] = useState("");

  // Delete pipeline modal
  const [deletePipelineId, setDeletePipelineId] = useState<string | null>(null);
  const [deletePipelineLoading, setDeletePipelineLoading] = useState(false);

  // Fetch pipelines
  const fetchPipelines = useCallback(async () => {
    setPipelinesLoading(true);
    try {
      const res = await fetch("/api/pipelines");
      const json = await res.json();
      if (res.ok) {
        setPipelines(json.data || []);
      }
    } catch {
      // silently fail
    } finally {
      setPipelinesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "pipelines") {
      fetchPipelines();
    }
  }, [activeTab, fetchPipelines]);

  // Toggle pipeline expand
  function togglePipeline(pipelineId: string) {
    setExpandedPipelines((prev) => ({
      ...prev,
      [pipelineId]: !prev[pipelineId],
    }));
  }

  // Create pipeline
  async function handleCreatePipeline(e: React.FormEvent) {
    e.preventDefault();
    if (!newPipelineName.trim()) return;
    setCreatePipelineLoading(true);
    try {
      const res = await fetch("/api/pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPipelineName.trim(),
          stages: [
            { name: "New", color: "#3B82F6" },
            { name: "Qualified", color: "#8B5CF6" },
            { name: "Proposal", color: "#F59E0B" },
            { name: "Won", color: "#22C55E" },
          ],
        }),
      });
      if (res.ok) {
        setCreatePipelineOpen(false);
        setNewPipelineName("");
        fetchPipelines();
      }
    } catch {
      // silently fail
    } finally {
      setCreatePipelineLoading(false);
    }
  }

  // Delete pipeline
  async function handleDeletePipeline() {
    if (!deletePipelineId) return;
    setDeletePipelineLoading(true);
    try {
      const res = await fetch(`/api/pipelines/${deletePipelineId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeletePipelineId(null);
        fetchPipelines();
      }
    } catch {
      // silently fail
    } finally {
      setDeletePipelineLoading(false);
    }
  }

  // Add stage
  async function handleAddStage(pipelineId: string) {
    if (!newStageName.trim()) return;
    setAddStageLoading(true);
    try {
      const colorIndex =
        (pipelines.find((p) => p.id === pipelineId)?.stages.length || 0) %
        STAGE_COLORS.length;
      const res = await fetch(`/api/pipelines/${pipelineId}/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStageName.trim(),
          color: STAGE_COLORS[colorIndex],
        }),
      });
      if (res.ok) {
        setAddingStageTo(null);
        setNewStageName("");
        fetchPipelines();
      }
    } catch {
      // silently fail
    } finally {
      setAddStageLoading(false);
    }
  }

  // Edit stage name inline
  async function handleSaveStageEdit(pipelineId: string, stageId: string) {
    if (!editStageName.trim()) {
      setEditingStage(null);
      return;
    }

    const pipeline = pipelines.find((p) => p.id === pipelineId);
    if (!pipeline) return;

    try {
      await fetch(`/api/pipelines/${pipelineId}/stages`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stages: pipeline.stages.map((s) => ({
            id: s.id,
            position: s.position,
            ...(s.id === stageId ? { name: editStageName.trim() } : {}),
          })),
        }),
      });
      setEditingStage(null);
      fetchPipelines();
    } catch {
      setEditingStage(null);
    }
  }

  // Delete stage
  async function handleDeleteStage(pipelineId: string, stageId: string) {
    try {
      const res = await fetch(
        `/api/pipelines/${pipelineId}/stages/${stageId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        fetchPipelines();
      } else {
        const json = await res.json();
        alert(json.error || "Failed to delete stage");
      }
    } catch {
      // silently fail
    }
  }

  const tabs: { value: TabValue; label: string; icon: typeof User }[] = [
    { value: "profile", label: "Profile", icon: User },
    { value: "pipelines", label: "Pipelines", icon: Kanban },
    { value: "integrations", label: "Integrations", icon: Plug },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-zinc-900">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-200">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors cursor-pointer",
              "border-b-2 -mb-px",
              activeTab === tab.value
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="max-w-lg space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-zinc-500">Name</dt>
                <dd className="mt-0.5 text-zinc-900 font-medium">
                  {user.name}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Email</dt>
                <dd className="mt-0.5 text-zinc-900">{user.email}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
            </CardHeader>
            <p className="text-sm text-zinc-500">
              Password change functionality is coming soon.
            </p>
          </Card>
        </div>
      )}

      {/* Pipelines Tab */}
      {activeTab === "pipelines" && (
        <div className="max-w-2xl space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              Manage your sales pipelines and stages.
            </p>
            <Button
              size="sm"
              onClick={() => setCreatePipelineOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Pipeline
            </Button>
          </div>

          {pipelinesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i}>
                  <SkeletonText lines={3} />
                </Card>
              ))}
            </div>
          ) : pipelines.length === 0 ? (
            <Card>
              <div className="py-8 text-center">
                <Kanban className="mx-auto h-8 w-8 text-zinc-300" />
                <p className="mt-2 text-sm text-zinc-500">
                  No pipelines yet. Create one to get started.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {pipelines.map((pipeline) => {
                const isExpanded = expandedPipelines[pipeline.id] ?? true;
                return (
                  <Card key={pipeline.id} noPadding>
                    {/* Pipeline header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
                      <button
                        onClick={() => togglePipeline(pipeline.id)}
                        className="flex items-center gap-2 text-sm font-semibold text-zinc-900 cursor-pointer hover:text-zinc-700"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-zinc-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-zinc-400" />
                        )}
                        {pipeline.name}
                        <span className="text-xs font-normal text-zinc-400">
                          ({pipeline.stages.length} stages)
                        </span>
                      </button>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAddingStageTo(pipeline.id);
                            setNewStageName("");
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Stage
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletePipelineId(pipeline.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Stages list */}
                    {isExpanded && (
                      <div className="px-4 py-2">
                        {pipeline.stages.length === 0 ? (
                          <p className="py-4 text-center text-sm text-zinc-400">
                            No stages. Add one to get started.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {pipeline.stages.map((stage) => (
                              <div
                                key={stage.id}
                                className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-zinc-50 group"
                              >
                                <div
                                  className="h-3 w-3 rounded-full shrink-0"
                                  style={{
                                    backgroundColor: stage.color,
                                  }}
                                />

                                {editingStage === stage.id ? (
                                  <div className="flex flex-1 items-center gap-2">
                                    <input
                                      autoFocus
                                      value={editStageName}
                                      onChange={(e) =>
                                        setEditStageName(e.target.value)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          handleSaveStageEdit(
                                            pipeline.id,
                                            stage.id
                                          );
                                        }
                                        if (e.key === "Escape") {
                                          setEditingStage(null);
                                        }
                                      }}
                                      className="flex-1 rounded border border-zinc-300 px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
                                    />
                                    <button
                                      onClick={() =>
                                        handleSaveStageEdit(
                                          pipeline.id,
                                          stage.id
                                        )
                                      }
                                      className="text-green-600 hover:text-green-700 cursor-pointer"
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => setEditingStage(null)}
                                      className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingStage(stage.id);
                                        setEditStageName(stage.name);
                                      }}
                                      className="flex-1 text-left text-sm text-zinc-700 cursor-pointer hover:text-zinc-900"
                                    >
                                      {stage.name}
                                    </button>
                                    <span className="text-xs text-zinc-400">
                                      #{stage.position + 1}
                                    </span>
                                    <button
                                      onClick={() =>
                                        handleDeleteStage(
                                          pipeline.id,
                                          stage.id
                                        )
                                      }
                                      className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600 transition-opacity cursor-pointer"
                                      title="Delete stage"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Inline add stage */}
                        {addingStageTo === pipeline.id && (
                          <div className="mt-2 flex items-center gap-2 rounded-md border border-zinc-200 px-2 py-1.5">
                            <input
                              autoFocus
                              placeholder="Stage name"
                              value={newStageName}
                              onChange={(e) => setNewStageName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleAddStage(pipeline.id);
                                }
                                if (e.key === "Escape") {
                                  setAddingStageTo(null);
                                }
                              }}
                              className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-zinc-400"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleAddStage(pipeline.id)}
                              loading={addStageLoading}
                              disabled={!newStageName.trim()}
                            >
                              Add
                            </Button>
                            <button
                              onClick={() => setAddingStageTo(null)}
                              className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === "integrations" && (
        <div className="max-w-lg space-y-4">
          {/* Twilio */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                  <Phone className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <CardTitle>Twilio</CardTitle>
                  <p className="text-xs text-zinc-500">SMS & Voice calls</p>
                </div>
              </div>
              <TwilioStatus />
            </CardHeader>
            <p className="text-sm text-zinc-500">
              Connect your Twilio account to send SMS messages and make phone
              calls directly from the CRM.
            </p>
          </Card>

          {/* Mailgun */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                  <MailIcon className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <CardTitle>Mailgun</CardTitle>
                  <p className="text-xs text-zinc-500">Email delivery</p>
                </div>
              </div>
              <MailgunStatus />
            </CardHeader>
            <p className="text-sm text-zinc-500">
              Connect Mailgun to send transactional emails with open and click
              tracking.
            </p>
          </Card>
        </div>
      )}

      {/* Create Pipeline Modal */}
      <Modal
        open={createPipelineOpen}
        onClose={() => setCreatePipelineOpen(false)}
        title="Create Pipeline"
        className="max-w-sm"
      >
        <form onSubmit={handleCreatePipeline} className="flex flex-col gap-4">
          <Input
            label="Pipeline Name"
            placeholder="Sales Pipeline"
            value={newPipelineName}
            onChange={(e) => setNewPipelineName(e.target.value)}
            required
          />
          <p className="text-xs text-zinc-500">
            Default stages will be created: New, Qualified, Proposal, Won. You
            can customize them after creation.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreatePipelineOpen(false)}
              disabled={createPipelineLoading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={createPipelineLoading}>
              Create
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Pipeline Confirmation */}
      <Modal
        open={!!deletePipelineId}
        onClose={() => setDeletePipelineId(null)}
        title="Delete Pipeline"
        className="max-w-sm"
      >
        <p className="text-sm text-zinc-600">
          Are you sure you want to delete this pipeline? All stages and
          associated opportunities will be permanently removed.
        </p>
        <div className="mt-4 flex items-center justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setDeletePipelineId(null)}
            disabled={deletePipelineLoading}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeletePipeline}
            loading={deletePipelineLoading}
          >
            Delete Pipeline
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// Helper components for integrations status
function TwilioStatus() {
  const [status, setStatus] = useState<"loading" | "connected" | "not_configured">("loading");

  useEffect(() => {
    // Simple check: environment variables would be set on the server side
    // For the frontend, we just show a placeholder status
    setStatus("not_configured");
  }, []);

  if (status === "loading") return <Skeleton className="h-5 w-20 rounded-full" />;

  return (
    <Badge variant={status === "connected" ? "success" : "default"}>
      {status === "connected" ? "Connected" : "Not configured"}
    </Badge>
  );
}

function MailgunStatus() {
  const [status, setStatus] = useState<"loading" | "connected" | "not_configured">("loading");

  useEffect(() => {
    setStatus("not_configured");
  }, []);

  if (status === "loading") return <Skeleton className="h-5 w-20 rounded-full" />;

  return (
    <Badge variant={status === "connected" ? "success" : "default"}>
      {status === "connected" ? "Connected" : "Not configured"}
    </Badge>
  );
}

