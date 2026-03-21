"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Edit,
  Trash2,
  User,
  Building2,
  Mail,
  Phone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { ActivityTimeline } from "@/components/contacts/activity-timeline";
import { cn, formatCurrency } from "@/lib/utils";
import type { Activity } from "@/components/contacts/activity-timeline";

interface StageInfo {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface OpportunityDetail {
  id: string;
  title: string;
  value: number;
  currency: string;
  status: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    company: string | null;
  };
  stage: StageInfo & {
    pipeline: {
      id: string;
      name: string;
      stages: StageInfo[];
    };
  };
  activities: Activity[];
}

function getStatusVariant(status: string) {
  switch (status) {
    case "won":
      return "success";
    case "lost":
      return "danger";
    default:
      return "default";
  }
}

export default function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [opportunity, setOpportunity] = useState<OpportunityDetail | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editStatus, setEditStatus] = useState("");

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Moving stage
  const [movingStage, setMovingStage] = useState(false);

  const fetchOpportunity = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/opportunities/${id}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const json = await res.json();
      if (res.ok) {
        setOpportunity(json.data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOpportunity();
  }, [fetchOpportunity]);

  // Open edit modal
  function openEditModal() {
    if (!opportunity) return;
    setEditTitle(opportunity.title);
    setEditValue(String(opportunity.value));
    setEditStatus(opportunity.status);
    setEditOpen(true);
  }

  // Submit edit
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditLoading(true);
    try {
      const res = await fetch(`/api/opportunities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          value: parseFloat(editValue) || 0,
          status: editStatus,
        }),
      });
      if (res.ok) {
        setEditOpen(false);
        fetchOpportunity();
      }
    } catch {
      // silently fail
    } finally {
      setEditLoading(false);
    }
  }

  // Move to stage
  async function handleMoveToStage(stageId: string) {
    if (!opportunity || opportunity.stage.id === stageId) return;
    setMovingStage(true);

    // Optimistic update
    setOpportunity((prev) => {
      if (!prev) return prev;
      const newStage = prev.stage.pipeline.stages.find(
        (s) => s.id === stageId
      );
      if (!newStage) return prev;
      return {
        ...prev,
        stageId: stageId,
        stage: { ...newStage, pipeline: prev.stage.pipeline },
      };
    });

    try {
      const res = await fetch(`/api/opportunities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId }),
      });
      if (!res.ok) {
        fetchOpportunity(); // revert
      }
    } catch {
      fetchOpportunity(); // revert
    } finally {
      setMovingStage(false);
    }
  }

  // Delete
  async function handleDelete() {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/opportunities/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/opportunities");
      }
    } catch {
      // silently fail
    } finally {
      setDeleteLoading(false);
    }
  }

  // 404 state
  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-lg font-semibold text-zinc-900">
          Opportunité introuvable
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          L'opportunité que vous recherchez n'existe pas.
        </p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => router.push("/opportunities")}
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux Opportunités
        </Button>
      </div>
    );
  }

  // Loading state
  if (loading || !opportunity) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-36" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <SkeletonText lines={3} />
            </Card>
            <Skeleton className="h-12 w-full rounded-lg" />
            <Card>
              <SkeletonText lines={6} />
            </Card>
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <SkeletonText lines={5} />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const pipelineStages = opportunity.stage.pipeline.stages;

  return (
    <div className="flex flex-col gap-4">
      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/opportunities")}
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux Opportunités
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-zinc-900">
              {opportunity.title}
            </h1>
            <Badge variant={getStatusVariant(opportunity.status) as "success" | "danger" | "default"}>
              {opportunity.status.charAt(0).toUpperCase() +
                opportunity.status.slice(1)}
            </Badge>
          </div>
          <p className="mt-1 text-lg font-semibold text-zinc-700">
            {formatCurrency(opportunity.value, opportunity.currency)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={openEditModal}>
            <Edit className="h-4 w-4" />
            Modifier
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stage progress bar */}
      <Card>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            {opportunity.stage.pipeline.name}
          </p>
          <div className="flex gap-1">
            {pipelineStages.map((stage) => {
              const isActive = stage.id === opportunity.stage.id;
              const isPast = stage.position < opportunity.stage.position;

              return (
                <button
                  key={stage.id}
                  onClick={() => handleMoveToStage(stage.id)}
                  disabled={movingStage}
                  className={cn(
                    "flex-1 rounded-md py-2 px-2 text-xs font-medium transition-all cursor-pointer",
                    "border-2 text-center truncate",
                    isActive
                      ? "border-current shadow-sm"
                      : isPast
                        ? "border-transparent opacity-80"
                        : "border-transparent opacity-40 hover:opacity-70",
                    movingStage && "pointer-events-none"
                  )}
                  style={{
                    backgroundColor: `${stage.color}${isActive ? "25" : isPast ? "15" : "10"}`,
                    color: stage.color,
                    borderColor: isActive ? stage.color : "transparent",
                  }}
                  title={`Déplacer vers ${stage.name}`}
                >
                  {stage.name}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left column */}
        <div className="lg:col-span-3 space-y-4">
          {/* Activity timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Activité</CardTitle>
            </CardHeader>
            <ActivityTimeline
              activities={opportunity.activities}
              loading={false}
            />
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Contact card */}
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  router.push(`/contacts/${opportunity.contact.id}`)
                }
              >
                Voir
              </Button>
            </CardHeader>
            <dl className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 mt-0.5 shrink-0 text-zinc-400" />
                <div>
                  <dt className="text-zinc-500">Nom</dt>
                  <dd className="text-zinc-900">
                    {opportunity.contact.firstName}{" "}
                    {opportunity.contact.lastName}
                  </dd>
                </div>
              </div>
              {opportunity.contact.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 mt-0.5 shrink-0 text-zinc-400" />
                  <div>
                    <dt className="text-zinc-500">Email</dt>

                    <dd className="text-zinc-900">
                      {opportunity.contact.email}
                    </dd>
                  </div>
                </div>
              )}
              {opportunity.contact.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 mt-0.5 shrink-0 text-zinc-400" />
                  <div>
                    <dt className="text-zinc-500">Téléphone</dt>
                    <dd className="text-zinc-900">
                      {opportunity.contact.phone}
                    </dd>
                  </div>
                </div>
              )}
              {opportunity.contact.company && (
                <div className="flex items-start gap-3">
                  <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-zinc-400" />
                  <div>
                    <dt className="text-zinc-500">Entreprise</dt>
                    <dd className="text-zinc-900">
                      {opportunity.contact.company}
                    </dd>
                  </div>
                </div>
              )}
            </dl>
          </Card>

          {/* Deal info card */}
          <Card>
            <CardHeader>
              <CardTitle>Infos affaire</CardTitle>
            </CardHeader>
            <dl className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <DollarSign className="h-4 w-4 mt-0.5 shrink-0 text-zinc-400" />
                <div>
                  <dt className="text-zinc-500">Valeur</dt>
                  <dd className="text-zinc-900">
                    {formatCurrency(opportunity.value, opportunity.currency)}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-zinc-400" />
                <div>
                  <dt className="text-zinc-500">Créé</dt>
                  <dd className="text-zinc-900">
                    {format(new Date(opportunity.createdAt), "MMM d, yyyy")}
                    <span className="ml-1 text-zinc-400">
                      (
                      {formatDistanceToNow(new Date(opportunity.createdAt), {
                        addSuffix: true,
                      })}
                      )
                    </span>
                  </dd>
                </div>
              </div>
              {opportunity.closedAt && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-zinc-400" />
                  <div>
                    <dt className="text-zinc-500">Clôturé</dt>
                    <dd className="text-zinc-900">
                      {format(
                        new Date(opportunity.closedAt),
                        "MMM d, yyyy"
                      )}
                    </dd>
                  </div>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Modifier l'affaire"
        className="max-w-md"
      >
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <Input
            label="Titre"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
          />
          <Input
            label="Valeur"
            type="number"
            min="0"
            step="any"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
          />
          <Select
            label="Statut"
            options={[
              { value: "open", label: "Ouvert" },
              { value: "won", label: "Gagné" },
              { value: "lost", label: "Perdu" },
            ]}
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value)}
          />
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditOpen(false)}
              disabled={editLoading}
            >
              Annuler
            </Button>
            <Button type="submit" loading={editLoading}>
              Enregistrer les modifications
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Supprimer l'affaire"
        className="max-w-sm"
      >
        <p className="text-sm text-zinc-600">
          Êtes-vous sûr de vouloir supprimer &quot;{opportunity.title}&quot; ? Cette
          action est irréversible.
        </p>
        <div className="mt-4 flex items-center justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setDeleteOpen(false)}
            disabled={deleteLoading}
          >
            Annuler
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={deleteLoading}
          >
            Supprimer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
