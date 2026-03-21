"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Kanban, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { KanbanBoard } from "@/components/pipeline/kanban-board";
import { OpportunityForm } from "@/components/opportunities/opportunity-form";
import type { KanbanStage } from "@/components/pipeline/kanban-column";

interface Pipeline {
  id: string;
  name: string;
  stages: {
    id: string;
    name: string;
    color: string;
    position: number;
  }[];
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
}

export default function PipelinePage() {
  const router = useRouter();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState("");
  const [stages, setStages] = useState<KanbanStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);

  // Add deal modal
  const [addDealOpen, setAddDealOpen] = useState(false);
  const [addDealLoading, setAddDealLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Fetch pipelines
  useEffect(() => {
    async function fetchPipelines() {
      try {
        const res = await fetch("/api/pipelines");
        const json = await res.json();
        if (res.ok && json.data) {
          setPipelines(json.data);
          if (json.data.length > 0 && !selectedPipelineId) {
            setSelectedPipelineId(json.data[0].id);
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchPipelines();
  }, [selectedPipelineId]);

  // Fetch pipeline data with opportunities
  const fetchPipelineData = useCallback(async () => {
    if (!selectedPipelineId) return;

    setLoading(true);
    try {
      // Get stages
      const stagesRes = await fetch(
        `/api/pipelines/${selectedPipelineId}/stages`
      );
      const stagesJson = await stagesRes.json();

      // Get opportunities for this pipeline
      const oppsRes = await fetch(
        `/api/opportunities?pipelineId=${selectedPipelineId}&limit=500`
      );
      const oppsJson = await oppsRes.json();

      if (stagesRes.ok && oppsRes.ok) {
        const stageData = stagesJson.data as {
          id: string;
          name: string;
          color: string;
          position: number;
        }[];
        const opportunities = oppsJson.data.opportunities || [];

        // Group opportunities by stage
        const kanbanStages: KanbanStage[] = stageData.map((stage) => ({
          ...stage,
          opportunities: opportunities.filter(
            (opp: { stageId: string }) => opp.stageId === stage.id
          ),
        }));

        setStages(kanbanStages);

        // Calculate total value
        const total = opportunities.reduce(
          (sum: number, opp: { value: number }) => sum + opp.value,
          0
        );
        setTotalValue(total);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [selectedPipelineId]);

  useEffect(() => {
    fetchPipelineData();
  }, [fetchPipelineData]);

  // Fetch contacts for add deal form
  useEffect(() => {
    if (!addDealOpen) return;

    async function fetchContacts() {
      try {
        const res = await fetch("/api/contacts?limit=200");
        const json = await res.json();
        if (res.ok) setContacts(json.data.contacts || []);
      } catch {
        // silently fail
      }
    }
    fetchContacts();
  }, [addDealOpen]);

  // Move opportunity between stages (optimistic update)
  function handleMoveOpportunity(opportunityId: string, newStageId: string) {
    // Optimistic update
    setStages((prevStages) => {
      let movedOpp: KanbanStage["opportunities"][0] | undefined;

      const updated = prevStages.map((stage) => {
        const oppIndex = stage.opportunities.findIndex(
          (o) => o.id === opportunityId
        );
        if (oppIndex !== -1) {
          movedOpp = { ...stage.opportunities[oppIndex], stageId: newStageId };
          return {
            ...stage,
            opportunities: stage.opportunities.filter(
              (o) => o.id !== opportunityId
            ),
          };
        }
        return stage;
      });

      if (movedOpp) {
        return updated.map((stage) => {
          if (stage.id === newStageId) {
            return {
              ...stage,
              opportunities: [...stage.opportunities, movedOpp!],
            };
          }
          return stage;
        });
      }

      return updated;
    });

    // API call
    fetch(`/api/opportunities/${opportunityId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId: newStageId }),
    }).catch(() => {
      // Revert on failure
      fetchPipelineData();
    });
  }

  // Add deal
  async function handleAddDeal(data: {
    title: string;
    contactId: string;
    stageId: string;
    value: number;
    currency: string;
  }) {
    setAddDealLoading(true);
    try {
      const res = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setAddDealOpen(false);
        fetchPipelineData();
      }
    } catch {
      // silently fail
    } finally {
      setAddDealLoading(false);
    }
  }

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId);

  // Empty state: no pipelines
  if (!loading && pipelines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-full bg-zinc-100 p-4">
          <Kanban className="h-8 w-8 text-zinc-400" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-zinc-900">
          Aucun pipeline pour le moment
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Créez un pipeline pour commencer à suivre vos affaires.
        </p>
        <Button className="mt-4" onClick={() => router.push("/settings")}>
          <Plus className="h-4 w-4" />
          Créer un pipeline
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-zinc-900">Pipeline</h1>
          {pipelines.length > 1 && (
            <Select
              options={pipelines.map((p) => ({
                value: p.id,
                label: p.name,
              }))}
              value={selectedPipelineId}
              onChange={(e) => setSelectedPipelineId(e.target.value)}
              className="w-48"
            />
          )}
          {pipelines.length === 1 && selectedPipeline && (
            <span className="text-sm text-zinc-500">
              {selectedPipeline.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {totalValue > 0 && (
            <span className="text-sm font-medium text-zinc-600">
              Total : {formatCurrency(totalValue)}
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push("/opportunities")}
          >
            Vue tableau
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button onClick={() => setAddDealOpen(true)}>
            <Plus className="h-4 w-4" />
            Ajouter une affaire
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-72 shrink-0 space-y-2">
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
              {i < 2 && <Skeleton className="h-24 w-full rounded-lg" />}
            </div>
          ))}
        </div>
      ) : (
        <KanbanBoard
          stages={stages}
          onMoveOpportunity={handleMoveOpportunity}
        />
      )}

      {/* Add Deal Modal */}
      <Modal
        open={addDealOpen}
        onClose={() => setAddDealOpen(false)}
        title="Ajouter une affaire"
        className="max-w-lg"
      >
        <OpportunityForm
          contacts={contacts}
          stages={selectedPipeline?.stages || []}
          onSubmit={handleAddDeal}
          onCancel={() => setAddDealOpen(false)}
          loading={addDealLoading}
        />
      </Modal>
    </div>
  );
}
