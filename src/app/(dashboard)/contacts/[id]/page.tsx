"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  Trash2,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Skeleton, SkeletonAvatar, SkeletonText } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatPhone } from "@/lib/utils";
import { TagPicker } from "@/components/contacts/tag-picker";
import { ContactForm } from "@/components/contacts/contact-form";
import { MessageThread } from "@/components/conversations/message-thread";
import { SmsComposer } from "@/components/conversations/sms-composer";
import { EmailList } from "@/components/conversations/email-list";
import { CallLog } from "@/components/conversations/call-log";
import type { ContactFormData } from "@/components/contacts/contact-form";
import type { SmsMessage } from "@/components/conversations/message-thread";
import type { EmailMessage } from "@/components/conversations/email-list";
import type { CallRecord } from "@/components/conversations/call-log";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
}

interface ContactDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  tags: Tag[];
  notes: Note[];
  opportunitiesCount: number;
  createdAt: string;
  updatedAt: string;
}

type TabValue = "sms" | "email" | "calls" | "notes" | "deals";

export default function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<TabValue>("sms");

  // Conversations
  const [smsMessages, setSmsMessages] = useState<SmsMessage[]>([]);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [convoLoading, setConvoLoading] = useState(false);

  // Notes
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editTags, setEditTags] = useState<Tag[]>([]);

  // Appointments
  const [contactAppointments, setContactAppointments] = useState<
    { id: string; title: string; startTime: string; endTime: string; status: string }[]
  >([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  // Fetch contact
  const fetchContact = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts/${id}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const json = await res.json();
      if (res.ok) {
        setContact(json.data);
        setNotes(json.data.notes || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  // Fetch all conversations
  const fetchConversations = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setConvoLoading(true);
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const json = await res.json();
      if (res.ok) {
        const items = json.data || [];
        setSmsMessages(items.filter((m: { kind: string }) => m.kind === "sms"));
        setEmails(items.filter((m: { kind: string }) => m.kind === "email"));
        setCalls(items.filter((m: { kind: string }) => m.kind === "call"));
      }
    } catch {
      // silently fail
    } finally {
      if (!options?.silent) setConvoLoading(false);
    }
  }, [id]);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Poll for new messages every 5 seconds when on a conversation tab
  useEffect(() => {
    if (!["sms", "email", "calls"].includes(activeTab)) return;
    const interval = setInterval(() => {
      fetchConversations({ silent: true });
    }, 5000);
    return () => clearInterval(interval);
  }, [activeTab, fetchConversations]);

  // Fetch full notes when notes tab opens
  useEffect(() => {
    if (activeTab !== "notes") return;

    async function fetchNotes() {
      setNotesLoading(true);
      try {
        const res = await fetch(`/api/contacts/${id}/notes`);
        const json = await res.json();
        if (res.ok) setNotes(json.data);
      } catch {
        // silently fail
      } finally {
        setNotesLoading(false);
      }
    }

    fetchNotes();
  }, [id, activeTab]);

  // Load available tags for edit modal
  useEffect(() => {
    if (!editOpen) return;
    async function fetchTags() {
      try {
        const res = await fetch("/api/tags");
        const json = await res.json();
        if (res.ok) setEditTags(json.data);
      } catch {
        // silently fail
      }
    }
    fetchTags();
  }, [editOpen]);

  // Fetch upcoming appointments
  useEffect(() => {
    async function fetchAppointments() {
      setAppointmentsLoading(true);
      try {
        const now = new Date().toISOString();
        const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        const res = await fetch(
          `/api/appointments?contactId=${id}&start=${now}&end=${farFuture}`
        );
        const json = await res.json();
        if (res.ok) {
          setContactAppointments(
            json.data.appointments.filter(
              (a: { status: string }) => a.status !== "cancelled"
            )
          );
        }
      } catch {
        // silently fail
      } finally {
        setAppointmentsLoading(false);
      }
    }
    fetchAppointments();
  }, [id]);

  async function handleAddNote() {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetch(`/api/contacts/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote.trim() }),
      });
      const json = await res.json();
      if (res.ok) {
        setNotes((prev) => [json.data, ...prev]);
        setNewNote("");
      }
    } catch {
      // silently fail
    } finally {
      setAddingNote(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    try {
      const res = await fetch(`/api/contacts/${id}/notes/${noteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      }
    } catch {
      // silently fail
    }
  }

  async function handleEditSubmit(data: ContactFormData) {
    setEditLoading(true);
    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email || null,
          phone: data.phone || null,
          company: data.company || null,
          source: data.source || null,
        }),
      });
      if (res.ok) {
        setEditOpen(false);
        fetchContact();
      }
    } catch {
      // silently fail
    } finally {
      setEditLoading(false);
    }
  }

  function handleTagAdded(tag: Tag) {
    setContact((prev) =>
      prev ? { ...prev, tags: [...prev.tags, tag] } : prev
    );
  }

  function handleTagRemoved(tagId: string) {
    setContact((prev) =>
      prev
        ? { ...prev, tags: prev.tags.filter((t) => t.id !== tagId) }
        : prev
    );
  }

  function handleSmsSent(message: { id: string; direction: string; body: string; status: string; createdAt: string; kind: string }) {
    setSmsMessages((prev) => [...prev, message as unknown as SmsMessage]);
  }

  // 404 state
  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-lg font-semibold text-zinc-900">
          Contact introuvable
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Le contact que vous recherchez n'existe pas.
        </p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => router.push("/contacts")}
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux Contacts
        </Button>
      </div>
    );
  }

  // Loading state
  if (loading || !contact) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-36" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <div className="flex items-center gap-4">
                <SkeletonAvatar size="lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                </div>
              </div>
            </Card>
            <Card>
              <SkeletonText lines={8} />
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

  const tabs: { value: TabValue; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      value: "sms",
      label: "SMS",
      icon: <MessageSquare className="h-3.5 w-3.5" />,
      count: smsMessages.length,
    },
    {
      value: "email",
      label: "Email",
      icon: <Mail className="h-3.5 w-3.5" />,
      count: emails.length,
    },
    {
      value: "calls",
      label: "Appels",
      icon: <Phone className="h-3.5 w-3.5" />,
      count: calls.length,
    },
    { value: "notes", label: "Notes", icon: null },
    { value: "deals", label: "Affaires", icon: null },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/contacts")}
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux Contacts
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left column — conversations */}
        <div className="lg:col-span-3 space-y-4">
          {/* Contact header */}
          <Card>
            <div className="flex items-start gap-4">
              <Avatar
                firstName={contact.firstName}
                lastName={contact.lastName}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-zinc-900">
                  {contact.firstName} {contact.lastName}
                </h2>
                {contact.email && (
                  <p className="mt-0.5 text-sm text-zinc-500">
                    {contact.email}
                  </p>
                )}
                {contact.phone && (
                  <p className="text-sm text-zinc-500">
                    {formatPhone(contact.phone)}
                  </p>
                )}
                {contact.company && (
                  <p className="mt-1 text-sm text-zinc-500">
                    {contact.company}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditOpen(true)}
              >
                Modifier
              </Button>
            </div>
          </Card>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-zinc-200 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors cursor-pointer",
                  "border-b-2 -mb-px",
                  activeTab === tab.value
                    ? "border-zinc-900 text-zinc-900"
                    : "border-transparent text-zinc-500 hover:text-zinc-700"
                )}
              >
                {tab.icon}
                {tab.label}
                {tab.count != null && tab.count > 0 && (
                  <span className="ml-1 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "sms" && (
            <Card noPadding>
              <div className="flex flex-col" style={{ minHeight: 400 }}>
                <MessageThread
                  messages={smsMessages}
                  loading={convoLoading}
                />
                <SmsComposer
                  contactId={contact.id}
                  hasPhone={!!contact.phone}
                  onSent={handleSmsSent}
                />
              </div>
            </Card>
          )}

          {activeTab === "email" && (
            <Card noPadding>
              <div style={{ minHeight: 400 }}>
                <EmailList
                  emails={emails}
                  loading={convoLoading}
                  contactId={contact.id}
                  contactEmail={contact.email}
                  onRefresh={() => fetchConversations()}
                />
              </div>
            </Card>
          )}

          {activeTab === "calls" && (
            <Card noPadding>
              <div style={{ minHeight: 400 }}>
                <CallLog
                  calls={calls}
                  loading={convoLoading}
                  contactId={contact.id}
                  hasPhone={!!contact.phone}
                  onRefresh={() => fetchConversations()}
                />
              </div>
            </Card>
          )}

          {activeTab === "notes" && (
            <Card>
              <div className="flex flex-col gap-4">
                {/* Add note */}
                <div className="flex flex-col gap-2">
                  <Textarea
                    placeholder="Ajouter une note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={!newNote.trim()}
                      loading={addingNote}
                      onClick={handleAddNote}
                    >
                      Ajouter une note
                    </Button>
                  </div>
                </div>

                {/* Notes list */}
                {notesLoading ? (
                  <SkeletonText lines={4} />
                ) : notes.length === 0 ? (
                  <p className="py-6 text-center text-sm text-zinc-400">
                    Aucune note pour le moment.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-lg border border-zinc-100 bg-zinc-50 p-3"
                      >
                        <p className="text-sm text-zinc-700 whitespace-pre-wrap">
                          {note.content}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-zinc-400">
                            {formatDistanceToNow(new Date(note.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                            aria-label="Supprimer la note"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          {activeTab === "deals" && (
            <Card>
              <div className="py-8 text-center text-sm text-zinc-400">
                Aucune affaire pour le moment.
              </div>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Contact info card */}
          <Card>
            <CardHeader>
              <CardTitle>Infos contact</CardTitle>
            </CardHeader>

            <dl className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 mt-0.5 shrink-0 text-zinc-400" />
                <div>
                  <dt className="text-zinc-500">Email</dt>

                  <dd className="text-zinc-900">
                    {contact.email || "--"}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 mt-0.5 shrink-0 text-zinc-400" />
                <div>
                  <dt className="text-zinc-500">Téléphone</dt>
                  <dd className="text-zinc-900">
                    {contact.phone ? formatPhone(contact.phone) : "--"}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-zinc-400" />
                <div>
                  <dt className="text-zinc-500">Entreprise</dt>
                  <dd className="text-zinc-900">
                    {contact.company || "--"}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-zinc-400" />
                <div>
                  <dt className="text-zinc-500">Créé</dt>
                  <dd className="text-zinc-900">
                    {formatDistanceToNow(new Date(contact.createdAt), {
                      addSuffix: true,
                    })}
                  </dd>
                </div>
              </div>
              {contact.source && (
                <div className="flex items-start gap-3">
                  <div className="h-4 w-4 shrink-0" />
                  <div>
                    <dt className="text-zinc-500">Source</dt>

                    <dd className="text-zinc-900">
                      <Badge variant="default">{contact.source}</Badge>
                    </dd>
                  </div>
                </div>
              )}
            </dl>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <TagPicker
              contactId={contact.id}
              currentTags={contact.tags}
              onTagAdded={handleTagAdded}
              onTagRemoved={handleTagRemoved}
            />
          </Card>

          {/* Quick Actions — now functional */}
          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <div className="flex flex-col gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveTab("sms")}
                disabled={!contact.phone}
              >
                <MessageSquare className="h-4 w-4" />
                {contact.phone ? "Envoyer un SMS" : "Pas de numéro de téléphone"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveTab("email")}
                disabled={!contact.email}
              >
                <Mail className="h-4 w-4" />
                {contact.email ? "Envoyer un email" : "Pas d'adresse email"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveTab("calls")}
                disabled={!contact.phone}
              >
                <Phone className="h-4 w-4" />
                {contact.phone ? "Appeler" : "Pas de numéro de téléphone"}
              </Button>
            </div>
          </Card>

          {/* Upcoming Appointments */}
          <Card>
            <CardHeader>
              <CardTitle>Prochains rendez-vous</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/calendar")}
              >
                Voir tout
              </Button>
            </CardHeader>
            {appointmentsLoading ? (
              <SkeletonText lines={3} />
            ) : contactAppointments.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-400">
                Aucun rendez-vous à venir.
              </p>
            ) : (
              <div className="space-y-2">
                {contactAppointments.slice(0, 5).map((apt) => (
                  <a
                    key={apt.id}
                    href="/calendar"
                    className="flex items-start gap-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3 transition-colors hover:bg-zinc-100"
                  >
                    <Clock className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900 truncate">
                        {apt.title}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {format(new Date(apt.startTime), "MMM d, yyyy")} &middot;{" "}
                        {format(new Date(apt.startTime), "h:mm a")} -{" "}
                        {format(new Date(apt.endTime), "h:mm a")}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Modifier le contact"
        className="max-w-xl"
      >
        <ContactForm
          initialData={{
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email || "",
            phone: contact.phone || "",
            company: contact.company || "",
            source: contact.source || "",
          }}
          availableTags={editTags}
          onSubmit={handleEditSubmit}
          onCancel={() => setEditOpen(false)}
          loading={editLoading}
        />
      </Modal>
    </div>
  );
}
