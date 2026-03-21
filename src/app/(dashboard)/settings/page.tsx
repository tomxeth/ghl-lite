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
  Users,
  Crown,
  Shield,
  Eye,
  Copy,
  UserMinus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { cn, canManageTeam, isOwner } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

type TabValue = "profile" | "team" | "pipelines" | "integrations";

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

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface Team {
  id: string;
  name: string;
  members: TeamMember[];
}

interface TeamInvite {
  id: string;
  email: string;
  role: string;
  token: string;
  status: string;
  createdAt: string;
  sender: { name: string; email: string };
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

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Membre" },
  { value: "viewer", label: "Lecteur" },
];

function RoleIcon({ role, className }: { role: string; className?: string }) {
  switch (role) {
    case "owner":
      return <Crown className={cn("h-3.5 w-3.5", className)} />;
    case "admin":
      return <Shield className={cn("h-3.5 w-3.5", className)} />;
    case "viewer":
      return <Eye className={cn("h-3.5 w-3.5", className)} />;
    default:
      return <User className={cn("h-3.5 w-3.5", className)} />;
  }
}

function roleBadgeVariant(role: string) {
  switch (role) {
    case "owner":
      return "warning" as const;
    case "admin":
      return "warning" as const;
    case "viewer":
      return "default" as const;
    default:
      return "success" as const;
  }
}

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

  // Team state
  const [team, setTeam] = useState<Team | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [createTeamName, setCreateTeamName] = useState("");
  const [createTeamLoading, setCreateTeamLoading] = useState(false);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [removeMemberLoading, setRemoveMemberLoading] = useState(false);

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

  // Fetch team
  const fetchTeam = useCallback(async () => {
    setTeamLoading(true);
    try {
      const [teamRes, invitesRes] = await Promise.all([
        fetch("/api/team"),
        fetch("/api/team/invite"),
      ]);
      const teamJson = await teamRes.json();
      const invitesJson = await invitesRes.json();
      if (teamRes.ok) {
        setTeam(teamJson.data);
      }
      if (invitesRes.ok) {
        setInvites(invitesJson.data || []);
      }
    } catch {
      // silently fail
    } finally {
      setTeamLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "pipelines") {
      fetchPipelines();
    }
    if (activeTab === "team") {
      fetchTeam();
    }
  }, [activeTab, fetchPipelines, fetchTeam]);

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
        alert(json.error || "Échec de la suppression de l'étape");
      }
    } catch {
      // silently fail
    }
  }

  // Create team
  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!createTeamName.trim()) return;
    setCreateTeamLoading(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createTeamName.trim() }),
      });
      if (res.ok) {
        setCreateTeamName("");
        fetchTeam();
        // Reload page to update user context (role/teamId)
        window.location.reload();
      }
    } catch {
      // silently fail
    } finally {
      setCreateTeamLoading(false);
    }
  }

  // Send invite
  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteError("");
    setInviteSuccess("");

    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();

      if (!res.ok) {
        setInviteError(data.error || "Échec de l'envoi de l'invitation");
        return;
      }

      const msg = data.data.emailSent
        ? `Invitation envoyée à ${inviteEmail}`
        : "Invitation créée. Copiez le lien pour le partager.";
      setInviteSuccess(msg);
      setInviteEmail("");
      setInviteRole("member");
      fetchTeam();
    } catch {
      setInviteError("Une erreur inattendue s'est produite");
    } finally {
      setInviteLoading(false);
    }
  }

  // Copy invite link
  function handleCopyInviteLink(token: string) {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/invite/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  // Remove member
  async function handleRemoveMember() {
    if (!removeMemberId) return;
    setRemoveMemberLoading(true);
    try {
      const res = await fetch(`/api/team/members/${removeMemberId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRemoveMemberId(null);
        fetchTeam();
      }
    } catch {
      // silently fail
    } finally {
      setRemoveMemberLoading(false);
    }
  }

  // Change member role
  async function handleChangeRole(memberId: string, newRole: string) {
    try {
      await fetch(`/api/team/members/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      fetchTeam();
    } catch {
      // silently fail
    }
  }

  const tabs: { value: TabValue; label: string; icon: typeof User }[] = [
    { value: "profile", label: "Profil", icon: User },
    { value: "team", label: "Équipe", icon: Users },
    { value: "pipelines", label: "Pipelines", icon: Kanban },
    { value: "integrations", label: "Intégrations", icon: Plug },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-zinc-900">Paramètres</h1>

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
              <CardTitle>Compte</CardTitle>
            </CardHeader>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-zinc-500">Nom</dt>
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
              <CardTitle>Mot de passe</CardTitle>
            </CardHeader>
            <p className="text-sm text-zinc-500">
              La fonctionnalité de changement de mot de passe arrive bientôt.
            </p>
          </Card>
        </div>
      )}

      {/* Team Tab */}
      {activeTab === "team" && (
        <div className="max-w-2xl space-y-4">
          {teamLoading ? (
            <div className="space-y-3">
              <Card>
                <SkeletonText lines={4} />
              </Card>
            </div>
          ) : !team ? (
            /* No team — show create team */
            <Card>
              <CardHeader>
                <CardTitle>Créer une équipe</CardTitle>
              </CardHeader>
              <p className="text-sm text-zinc-500 mb-4">
                Créez une équipe pour collaborer avec d'autres. Les membres de l'équipe
                partagent l'accès aux contacts, pipelines et opportunités.
              </p>
              <form
                onSubmit={handleCreateTeam}
                className="flex items-end gap-3"
              >
                <div className="flex-1">
                  <Input
                    label="Nom de l'équipe"
                    placeholder="Mon équipe"
                    value={createTeamName}
                    onChange={(e) => setCreateTeamName(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" loading={createTeamLoading}>
                  <Plus className="h-4 w-4" />
                  Créer l'équipe
                </Button>
              </form>
            </Card>
          ) : (
            /* Has team — show management */
            <>
              {/* Team Name */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-zinc-500" />
                    <CardTitle>{team.name}</CardTitle>
                  </div>
                  <Badge variant={roleBadgeVariant(user.role)}>
                    <RoleIcon role={user.role} className="mr-1" />
                    {user.role}
                  </Badge>
                </CardHeader>
                <p className="text-sm text-zinc-500">
                  {team.members.length} membre{team.members.length !== 1 && "s"}
                </p>
              </Card>

              {/* Members List */}
              <Card noPadding>
                <div className="px-4 py-3 border-b border-zinc-100">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    Membres
                  </h3>
                </div>
                <div className="divide-y divide-zinc-100">
                  {team.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-600">
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-900">
                            {member.name}
                            {member.id === user.id && (
                              <span className="ml-1.5 text-xs text-zinc-400">
                                (vous)
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {member.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOwner(user.role) && member.id !== user.id ? (
                          <Select
                            options={ROLE_OPTIONS}
                            value={member.role}
                            onChange={(e) =>
                              handleChangeRole(member.id, e.target.value)
                            }
                            className="w-28"
                          />
                        ) : (
                          <Badge variant={roleBadgeVariant(member.role)}>
                            <RoleIcon role={member.role} className="mr-1" />
                            {member.role}
                          </Badge>
                        )}
                        {canManageTeam(user.role) &&
                          member.id !== user.id &&
                          member.role !== "owner" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRemoveMemberId(member.id)}
                              className="text-zinc-400 hover:text-red-600"
                              title="Retirer le membre"
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Invite Form */}
              {canManageTeam(user.role) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Inviter un membre</CardTitle>
                  </CardHeader>
                  <form
                    onSubmit={handleSendInvite}
                    className="flex items-end gap-3"
                  >
                    <div className="flex-1">
                      <Input
                        label="Email"
                        type="email"
                        placeholder="colleague@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="w-32">
                      <Select
                        label="Rôle"
                        options={ROLE_OPTIONS}
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                      />
                    </div>
                    <Button type="submit" loading={inviteLoading}>
                      <Plus className="h-4 w-4" />
                      Inviter
                    </Button>
                  </form>
                  {inviteError && (
                    <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                      {inviteError}
                    </p>
                  )}
                  {inviteSuccess && (
                    <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                      {inviteSuccess}
                    </p>
                  )}
                </Card>
              )}

              {/* Pending Invites */}
              {invites.length > 0 && canManageTeam(user.role) && (
                <Card noPadding>
                  <div className="px-4 py-3 border-b border-zinc-100">
                    <h3 className="text-sm font-semibold text-zinc-900">
                      Invitations en attente
                    </h3>
                  </div>
                  <div className="divide-y divide-zinc-100">
                    {invites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <div>
                          <p className="text-sm text-zinc-900">
                            {invite.email}
                          </p>
                          <p className="text-xs text-zinc-500">
                            Invité en tant que{" "}
                            <Badge
                              variant={roleBadgeVariant(invite.role)}
                              className="ml-1"
                            >
                              {invite.role}
                            </Badge>
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyInviteLink(invite.token)}
                          title="Copier le lien d'invitation"
                        >
                          {copiedToken === invite.token ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-green-600" />
                              <span className="text-green-600">Copié</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              Copier le lien
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Pipelines Tab */}
      {activeTab === "pipelines" && (
        <div className="max-w-2xl space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              Gérez vos pipelines de vente et leurs étapes.
            </p>
            <Button
              size="sm"
              onClick={() => setCreatePipelineOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Ajouter un pipeline
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
                  Aucun pipeline. Créez-en un pour commencer.
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
                          ({pipeline.stages.length} étapes)
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
                          Étape
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
                            Aucune étape. Ajoutez-en une pour commencer.
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
                                      title="Supprimer l'étape"
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
                              placeholder="Nom de l'étape"
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
                              Ajouter
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
                  <p className="text-xs text-zinc-500">SMS et appels vocaux</p>
                </div>
              </div>
              <TwilioStatus />
            </CardHeader>
            <p className="text-sm text-zinc-500">
              Connectez votre compte Twilio pour envoyer des SMS et passer des appels
              téléphoniques directement depuis le CRM.
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
                  <p className="text-xs text-zinc-500">Envoi et réception d'emails</p>
                </div>
              </div>
              <MailgunStatus />
            </CardHeader>
            <p className="text-sm text-zinc-500">
              Connectez Mailgun pour envoyer des emails transactionnels avec suivi
              d'ouverture et de clic.
            </p>

            {/* Inbound email setup */}
            <div className="mt-4 border-t border-zinc-100 pt-4">
              <h4 className="text-sm font-semibold text-zinc-900 mb-2">
                Réception d'emails
              </h4>
              <p className="text-sm text-zinc-500 mb-3">
                Configurez la réception des emails entrants pour que les réponses de vos
                contacts apparaissent dans leurs conversations.
              </p>
              <InboundEmailSetup />
              <p className="mt-3 text-xs text-zinc-400">
                Les enregistrements MX de <span className="font-mono">mail.laformuleretour.com</span> doivent
                pointer vers Mailgun (<span className="font-mono">mxa.eu.mailgun.org</span> et{" "}
                <span className="font-mono">mxb.eu.mailgun.org</span>, priorité 10) pour que la
                réception fonctionne.
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Create Pipeline Modal */}
      <Modal
        open={createPipelineOpen}
        onClose={() => setCreatePipelineOpen(false)}
        title="Créer un pipeline"
        className="max-w-sm"
      >
        <form onSubmit={handleCreatePipeline} className="flex flex-col gap-4">
          <Input
            label="Nom du pipeline"
            placeholder="Pipeline de vente"
            value={newPipelineName}
            onChange={(e) => setNewPipelineName(e.target.value)}
            required
          />
          <p className="text-xs text-zinc-500">
            Des étapes par défaut seront créées : Nouveau, Qualifié, Proposition, Gagné. Vous
            pourrez les personnaliser après la création.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreatePipelineOpen(false)}
              disabled={createPipelineLoading}
            >
              Annuler
            </Button>
            <Button type="submit" loading={createPipelineLoading}>
              Créer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Pipeline Confirmation */}
      <Modal
        open={!!deletePipelineId}
        onClose={() => setDeletePipelineId(null)}
        title="Supprimer le pipeline"
        className="max-w-sm"
      >
        <p className="text-sm text-zinc-600">
          Êtes-vous sûr de vouloir supprimer ce pipeline ? Toutes les étapes et
          opportunités associées seront définitivement supprimées.
        </p>
        <div className="mt-4 flex items-center justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setDeletePipelineId(null)}
            disabled={deletePipelineLoading}
          >
            Annuler
          </Button>
          <Button
            variant="danger"
            onClick={handleDeletePipeline}
            loading={deletePipelineLoading}
          >
            Supprimer le pipeline
          </Button>
        </div>
      </Modal>

      {/* Remove Member Confirmation */}
      <Modal
        open={!!removeMemberId}
        onClose={() => setRemoveMemberId(null)}
        title="Retirer le membre"
        className="max-w-sm"
      >
        <p className="text-sm text-zinc-600">
          Êtes-vous sûr de vouloir retirer ce membre de l'équipe ? Il perdra
          l'accès aux données partagées.
        </p>
        <div className="mt-4 flex items-center justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setRemoveMemberId(null)}
            disabled={removeMemberLoading}
          >
            Annuler
          </Button>
          <Button
            variant="danger"
            onClick={handleRemoveMember}
            loading={removeMemberLoading}
          >
            Retirer
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
      {status === "connected" ? "Connecté" : "Non configuré"}
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
      {status === "connected" ? "Connecté" : "Non configuré"}
    </Badge>
  );
}

function InboundEmailSetup() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleSetup() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/email/setup-inbound", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: "Route de réception configurée avec succès." });
      } else {
        setResult({
          success: false,
          message: data.details || data.error || "Erreur lors de la configuration.",
        });
      }
    } catch {
      setResult({ success: false, message: "Une erreur inattendue s'est produite." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button size="sm" onClick={handleSetup} loading={loading}>
        <MailIcon className="h-4 w-4" />
        Configurer la réception d'emails
      </Button>
      {result && (
        <p
          className={cn(
            "mt-2 rounded-lg px-3 py-2 text-sm",
            result.success
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-600"
          )}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
